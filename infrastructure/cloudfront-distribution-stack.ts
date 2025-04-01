import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { SsmParameterReader } from './ssm-parameter-reader';
import * as iam from 'aws-cdk-lib/aws-iam';

export class CloudFrontDistributionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // us-east-1に保存されたSSMパラメータから証明書ARNを取得してインポート
    const certificateArnReader = new SsmParameterReader(this, 'CertificateArnParameter', {
      parameterName: '/bibo-note/certificate_arn',
      region: 'us-east-1',
    });

    // us-east-1に保存されたSSMパラメータからLambda@Edge関数のARNを取得
    const edgeFunctionArnReader = new SsmParameterReader(this, 'EdgeFunctionArnParameter', {
      parameterName: '/bibo-note/edge_function_arn',
      region: 'us-east-1',
    });

    // Lambda@Edge用のIAMロールを作成
    const edgeFunctionRole = new iam.Role(this, 'EdgeFunctionRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
        new iam.ServicePrincipal('edgelambda.amazonaws.com')
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    const certificate = acm.Certificate.fromCertificateArn(this, 'ImportedCertificate', certificateArnReader.getParameterValue());
    
    // Lambda@Edge関数のバージョンを取得
    const edgeFunctionVersion = lambda.Version.fromVersionArn(this, 'EdgeFunctionVersion', edgeFunctionArnReader.getParameterValue());

    // Lambda関数 (./dist/worker/worker.ts) を作成
    const workerFunction = new lambda.Function(this, 'WorkerFunction', {
      functionName: 'application-worker',
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('./dist/worker'),
      handler: 'worker.handler',
    });

    // Lambda Function URLを作成（AWS_IAM認証を利用して直接の呼び出しを防止）
    const workerFunctionUrl = workerFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    // 静的ファイル用のS3バケットを作成（CloudFront以外からのアクセスを拒否）
    const staticBucket = new s3.Bucket(this, 'StaticBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // S3 Bucketへ./dist/staticのファイルをデプロイ
    new s3deploy.BucketDeployment(this, 'StaticDeployment', {
      sources: [s3deploy.Source.asset('./dist/static')],
      destinationBucket: staticBucket,
      destinationKeyPrefix: 'static/',
    });

    // CloudFrontのオリジン作成
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(staticBucket);

    // Lambda用のOAC(Origin Access Control)を作成し、CloudFrontのみからの呼び出しを許可
    const lambdaOAC = new cloudfront.CfnOriginAccessControl(this, 'LambdaOAC', {
      originAccessControlConfig: {
        name: 'LambdaOAC',
        description: 'OAC for Lambda function URL',
        originAccessControlOriginType: 'lambda',
        signingBehavior: 'always',
        signingProtocol: 'sigv4'
      }
    });

    const lambdaOrigin = new origins.FunctionUrlOrigin(workerFunctionUrl, {
      originAccessControlId: lambdaOAC.ref,
    });

    // x-forwarded-host を付与する CloudFront Function の作成
    const addXForwardedHostFunction = new cloudfront.Function(this, 'AddXForwardedHostFunction', {
      functionName: 'add-x-forwarded-host',
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var request = event.request;
          if (request.headers['host']) {
            request.headers['x-forwarded-host'] = { value: request.headers['host'].value };
          }
          return request;
        }
      `)
    });

    // オリジンリクエストポリシーを定義し、'x-forwarded-host'ヘッダーを転送
    const customOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'AllowXForwardedHostPolicy', {
      originRequestPolicyName: 'AllowXForwardedHostPolicy',
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList('x-forwarded-host')
    });

    // サブドメインごとにキャッシュを分けるためのカスタムキャッシュポリシー
    const subdomainCachePolicy = new cloudfront.CachePolicy(this, 'SubdomainCachePolicy', {
      cachePolicyName: 'SubdomainCachePolicy',
      comment: 'Cache policy that includes Host header in the cache key',
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('x-forwarded-host'),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      defaultTtl: cdk.Duration.seconds(0),  // デバッグ用にキャッシュを無効化
      maxTtl: cdk.Duration.seconds(0),      // デバッグ用にキャッシュを無効化
      minTtl: cdk.Duration.seconds(0),      // デバッグ用にキャッシュを無効化
    });

    // CloudFrontディストリビューションを作成
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: lambdaOrigin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        functionAssociations: [{
          function: addXForwardedHostFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
        edgeLambdas: [{
          eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          functionVersion: edgeFunctionVersion,
          includeBody: true,
        }],
        cachePolicy: subdomainCachePolicy,
        originRequestPolicy: customOriginRequestPolicy,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
      },
      additionalBehaviors: {
        'static/*': {
          origin: s3Origin,
          cachePolicy: subdomainCachePolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      domainNames: ['bibo-note.jp', '*.bibo-note.jp'],
      certificate: certificate,
    });

    // CloudFrontからのアクセスのみ許可するため、workerFunctionにリソースポリシーを追加
    workerFunction.addPermission('AllowCloudFrontAccess', {
      principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
      action: 'lambda:InvokeFunctionUrl',
      functionUrlAuthType: lambda.FunctionUrlAuthType.AWS_IAM,
      sourceArn: distribution.distributionArn,
    });

    // CloudFrontのディストリビューションのドメイン名を出力
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
    });

    // Create Route53 A records for both the apex and wildcard domains
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', { domainName: 'bibo-note.jp' });
    new route53.ARecord(this, 'AliasRecordApex', {
      zone: hostedZone,
      recordName: 'bibo-note.jp',
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });
    new route53.ARecord(this, 'AliasRecordWildcard', {
      zone: hostedZone,
      recordName: '*.bibo-note.jp',
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // Wikiデータ保存用のS3バケットを作成
    const wikiDataBucket = new s3.Bucket(this, 'WikiDataBucket', {
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

    // バケット名の出力
    new cdk.CfnOutput(this, 'WikiDataBucketName', {
      value: wikiDataBucket.bucketName,
    });
  }
} 