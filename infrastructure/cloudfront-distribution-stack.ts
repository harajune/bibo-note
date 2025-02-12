import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { SsmParameterReader } from './ssm-parameter-reader';

export class CloudFrontDistributionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // us-east-1に保存されたSSMパラメータから証明書ARNを取得してインポート
    const certificateArnReader = new SsmParameterReader(this, 'CertificateArnParameter', {
      parameterName: '/bibo-note/certificate_arn',
      region: 'us-east-1',
    });
    const certificate = acm.Certificate.fromCertificateArn(this, 'ImportedCertificate', certificateArnReader.getParameterValue());

    // Lambda関数 (./dist/worker/worker.ts) を作成
    const workerFunction = new lambdaNodejs.NodejsFunction(this, 'WorkerFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: './dist/worker/worker.mjs',
      handler: 'handler',
    });

    // Lambda Function URLを作成（認証なし）
    const workerFunctionUrl = workerFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
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
    });

    // CloudFrontのオリジン作成
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(staticBucket);
    const lambdaOrigin = new origins.FunctionUrlOrigin(workerFunctionUrl);

    // CloudFrontディストリビューションを作成
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: lambdaOrigin,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // デバッグ用にキャッシュを無効化
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        // /static以下のリクエストをS3へ
        'static/*': {
          origin: s3Origin,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      domainNames: ['bibo-note.jp', '*.bibo-note.jp'],
      certificate: certificate,
    });

    // CloudFrontのディストリビューションのドメイン名を出力
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
    });
  }
} 