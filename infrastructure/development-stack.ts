import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export class DevelopmentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Route53のHostedZoneを取得（既に存在している場合）
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'bibo-note.jp'
    });

    // Development用の証明書を作成
    const certificate = new acm.Certificate(this, 'DevCertificate', {
      domainName: 'dev.bibo-note.jp',
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Lambda関数 (./dist/worker/worker.ts) を作成
    const workerFunction = new lambda.Function(this, 'DevWorkerFunction', {
      functionName: 'bibo-note-dev-worker',
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('./dist/worker'),
      handler: 'worker.handler',
      environment: {
        'MODE': 'development',
        'MULTITENANT': '1',
      }
    });

    // Lambda Function URLを作成（NONE認証でパブリックアクセス可能）
    const workerFunctionUrl = workerFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowCredentials: true,
        allowMethods: [lambda.HttpMethod.ALL],
        allowOrigins: ['*'],
        allowHeaders: ['*'],
      }
    });

    // 静的ファイル用のS3バケットを作成（パブリック読み取りアクセス可能）
    const staticBucket = new s3.Bucket(this, 'DevStaticBucket', {
      bucketName: `bibo-note-dev-static-${this.account}`,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      }),
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
    });

    // S3 Bucketへ./dist/staticのファイルをデプロイ
    new s3deploy.BucketDeployment(this, 'DevStaticDeployment', {
      sources: [s3deploy.Source.asset('./dist/static')],
      destinationBucket: staticBucket,
      destinationKeyPrefix: 'static/',
    });

    // Wikiデータ保存用のS3バケットを作成
    const wikiDataBucket = new s3.Bucket(this, 'DevWikiDataBucket', {
      bucketName: `bibo-note-dev-wiki-${this.account}`,
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
    workerFunction.addEnvironment('STATIC_BUCKET_URL', staticBucket.bucketWebsiteUrl);

    // Basic Auth用の環境変数（開発環境アクセス制御用）
    workerFunction.addEnvironment('DEV_AUTH_USERNAME', 'dev-user');
    workerFunction.addEnvironment('DEV_AUTH_PASSWORD', 'dev-password-change-me');

    // Create Route53 CNAME record for development domain pointing to Function URL
    const functionUrlDomain = cdk.Fn.select(2, cdk.Fn.split('/', workerFunctionUrl.url));
    new route53.CnameRecord(this, 'DevCnameRecord', {
      zone: hostedZone,
      recordName: 'dev',
      domainName: functionUrlDomain,
    });

    // 出力
    new cdk.CfnOutput(this, 'DevFunctionUrl', {
      value: workerFunctionUrl.url,
      description: 'Development Lambda Function URL',
    });

    new cdk.CfnOutput(this, 'DevDomainName', {
      value: 'dev.bibo-note.jp',
      description: 'Development Domain Name',
    });

    new cdk.CfnOutput(this, 'DevStaticBucketUrl', {
      value: staticBucket.bucketWebsiteUrl,
      description: 'Development Static Files Bucket URL',
    });

    new cdk.CfnOutput(this, 'DevWikiDataBucketName', {
      value: wikiDataBucket.bucketName,
      description: 'Development Wiki Data Bucket Name',
    });
  }
}