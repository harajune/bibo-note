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
    const certificate = acm.Certificate.fromCertificateArn(this, 'ImportedCertificate', certificateArnReader.getParameterValue());

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

    // CloudFrontディストリビューションを作成
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: lambdaOrigin,
        functionAssociations: [{
          function: addXForwardedHostFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // デバッグ用にキャッシュを無効化
        originRequestPolicy: customOriginRequestPolicy,
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
  }
} 