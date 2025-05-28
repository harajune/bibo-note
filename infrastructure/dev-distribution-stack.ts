import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { SsmParameterReader } from './ssm-parameter-reader';

export class DevDistributionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // us-east-1に保存されたSSMパラメータから証明書ARNを取得してインポート
    const certificateArnReader = new SsmParameterReader(this, 'CertificateArnParameter', {
      parameterName: '/bibo-note/certificate_arn',
      region: 'us-east-1',
    });

    const certificate = acm.Certificate.fromCertificateArn(this, 'ImportedCertificate', certificateArnReader.getParameterValue());

    // Lambda関数 (./dist/worker/worker.ts) を作成
    const workerFunction = new lambda.Function(this, 'DevWorkerFunction', {
      functionName: 'dev-application-worker',
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('./dist/worker'),
      handler: 'worker.handler',
    });

    // 静的ファイル用のS3バケットを作成
    const staticBucket = new s3.Bucket(this, 'DevStaticBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // S3 Bucketへ./dist/staticのファイルをデプロイ
    new s3deploy.BucketDeployment(this, 'DevStaticDeployment', {
      sources: [s3deploy.Source.asset('./dist/static')],
      destinationBucket: staticBucket,
      destinationKeyPrefix: 'static/',
    });

    // バケットポリシーを設定して、API Gateway経由でのみアクセスを許可
    const apiGatewayPrincipal = new iam.ServicePrincipal('apigateway.amazonaws.com');
    staticBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [staticBucket.arnForObjects('static/*')],
        principals: [apiGatewayPrincipal],
      })
    );

    // API Gatewayの作成
    const api = new apigateway.RestApi(this, 'DevBiboNoteApi', {
      restApiName: 'Dev Bibo Note API',
      description: 'Development API for Bibo Note',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
      domainName: {
        domainName: 'bibo-note.dev',
        certificate,
        securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      },
    });

    // Lambda統合のセットアップ
    const lambdaIntegration = new apigateway.LambdaIntegration(workerFunction, {
      proxy: true,
    });

    // 静的ファイル用の統合
    const staticIntegration = new apigateway.AwsIntegration({
      service: 's3',
      integrationHttpMethod: 'GET',
      path: `${staticBucket.bucketName}/static/{file}`,
      options: {
        credentialsRole: new iam.Role(this, 'ApiGatewayS3Role', {
          assumedBy: apiGatewayPrincipal,
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
          ],
        }),
        requestParameters: {
          'integration.request.path.file': 'method.request.path.file',
        },
        integrationResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': 'integration.response.header.Content-Type',
          },
        }],
      },
    });

    // リソースとメソッドの設定
    const staticResource = api.root.addResource('static').addResource('{file}');
    staticResource.addMethod('GET', staticIntegration, {
      requestParameters: {
        'method.request.path.file': true,
      },
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Content-Type': true,
        },
      }],
    });

    // デフォルトのルートをLambdaにプロキシする
    api.root.addMethod('ANY', lambdaIntegration);
    api.root.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
    });

    // Wikiデータ保存用のS3バケットを作成
    const wikiDataBucket = new s3.Bucket(this, 'DevWikiDataBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Lambda(workerFunction)からのみアクセスできるようにするためのバケットポリシー設定
    wikiDataBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [workerFunction.grantPrincipal],
      actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
      resources: [wikiDataBucket.bucketArn + '/*'],
    }));

    wikiDataBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [workerFunction.grantPrincipal],
      actions: ['s3:ListBucket'],
      resources: [wikiDataBucket.bucketArn],
    }));

    // LambdaにWikiデータ保存用のS3バケット名を環境変数として設定
    workerFunction.addEnvironment('WIKI_BUCKET_NAME', wikiDataBucket.bucketName);

    // Lambdaにマルチテナントモードを環境変数として設定
    workerFunction.addEnvironment('MULTITENANT', '1');

    // LambdaにMODEを環境変数として設定
    workerFunction.addEnvironment('MODE', 'production');

    // Route53 A record
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', { domainName: 'bibo-note.dev' });
    new route53.ARecord(this, 'DevAliasRecord', {
      zone: hostedZone,
      recordName: 'bibo-note.dev',
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
    });

    // Output values
    new cdk.CfnOutput(this, 'DevApiUrl', {
      value: api.url,
      description: 'URL of the development API Gateway',
    });

    new cdk.CfnOutput(this, 'DevWikiDataBucketName', {
      value: wikiDataBucket.bucketName,
      description: 'Name of the development wiki data bucket',
    });
  }
}