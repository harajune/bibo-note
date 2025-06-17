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
import { EnvironmentConfig } from './environment-config';

interface CloudFrontDistributionStackProps extends cdk.StackProps {
  environmentConfig: EnvironmentConfig;
}

export class CloudFrontDistributionStack extends cdk.Stack {
  public readonly wikiDataBucket: s3.Bucket;
  public readonly ogpFunction: lambda.Function;
  public readonly ogpFunctionUrl: lambda.FunctionUrl;



  constructor(scope: Construct, id: string, props: CloudFrontDistributionStackProps) {
    super(scope, id, props);

    const { environmentConfig } = props;

    // us-east-1に保存されたSSMパラメータから証明書ARNを取得してインポート
    const certificateArnReader = new SsmParameterReader(this, 'CertificateArnParameter', {
      parameterName: environmentConfig.certificateParameterName,
      region: 'us-east-1',
    });

    // us-east-1に保存されたSSMパラメータからLambda@Edge関数のARNを取得
    const edgeFunctionArnReader = new SsmParameterReader(this, 'EdgeFunctionArnParameter', {
      parameterName: `/bibo-note/${environmentConfig.name}/edge_function_arn`,
      region: 'us-east-1',
    });

    // us-east-1に保存されたSSMパラメータからLambda@Edge関数のARNを取得
    const authorizationEdgeFunctionArnReader = new SsmParameterReader(this, 'AuthorizationEdgeFunctionArnParameter', {
      parameterName: `/bibo-note/${environmentConfig.name}/authorization_edge_function_arn`,
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

    // Lambda@Edge関数のバージョンを取得
    const authorizationEdgeFunctionVersion = lambda.Version.fromVersionArn(this, 'AuthorizationEdgeFunctionVersion', authorizationEdgeFunctionArnReader.getParameterValue());

    // Lambda関数 (./dist/worker/worker.ts) を作成
    const workerFunction = new lambda.Function(this, 'WorkerFunction', {
      functionName: `application-worker-${environmentConfig.name}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('../web/dist/worker'),
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
      sources: [s3deploy.Source.asset('../web/dist/static')],
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

    // 記事表示用のキャッシュポリシー
    const articleCachePolicy = new cloudfront.CachePolicy(this, 'ArticleCachePolicy', {
      cachePolicyName: 'ArticleCachePolicy',
      comment: 'Cache policy for article pages',
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'x-forwarded-host',
        'authorization'
      ),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      defaultTtl: cdk.Duration.seconds(1), //TODO: デバッグ用にキャッシュを無効化
      maxTtl: cdk.Duration.seconds(1),
      minTtl: cdk.Duration.seconds(1),
    });

    // 静的ファイル用のキャッシュポリシー
    const staticCachePolicy = new cloudfront.CachePolicy(this, 'StaticCachePolicy', {
      cachePolicyName: 'StaticCachePolicy',
      comment: 'Cache policy for static files',
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      defaultTtl: cdk.Duration.seconds(1), //TODO: デバッグ用にキャッシュを無効化 
      maxTtl: cdk.Duration.seconds(1),
      minTtl: cdk.Duration.seconds(1),
    });

    // OGP画像用のキャッシュポリシー
    const ogpCachePolicy = new cloudfront.CachePolicy(this, 'OGPCachePolicy', {
      cachePolicyName: 'OGPCachePolicy',
      comment: 'Cache policy for OGP images',
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'x-forwarded-host'
      ),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      defaultTtl: cdk.Duration.hours(1),
      maxTtl: cdk.Duration.hours(1),
      minTtl: cdk.Duration.seconds(1),
    });

    // CloudFrontディストリビューションを作成
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: lambdaOrigin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        edgeLambdas: [{
          eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          functionVersion: edgeFunctionVersion,
          includeBody: true,
        }, {
          eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
          functionVersion: authorizationEdgeFunctionVersion,
          includeBody: true,
        }],
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
      },
      additionalBehaviors: {
        'static/*': {
          origin: s3Origin,
          cachePolicy: staticCachePolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        'v/*': {
          origin: lambdaOrigin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: articleCachePolicy,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
          edgeLambdas: [{
            eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
            functionVersion: authorizationEdgeFunctionVersion,
            includeBody: true,
          }],
        },
      },
      domainNames: [environmentConfig.domainName, `*.${environmentConfig.domainName}`],
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
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', { domainName: environmentConfig.domainName });
    new route53.ARecord(this, 'AliasRecordApex', {
      zone: hostedZone,
      recordName: environmentConfig.domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });
    new route53.ARecord(this, 'AliasRecordWildcard', {
      zone: hostedZone,
      recordName: `*.${environmentConfig.domainName}`,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // Wikiデータ保存用のS3バケットを作成
    this.wikiDataBucket = new s3.Bucket(this, 'WikiDataBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Lambda(workerFunction)からのみアクセスできるようにするためのバケットポリシー設定
    this.wikiDataBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [workerFunction.grantPrincipal],
      actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
      resources: [this.wikiDataBucket.bucketArn + '/*'],
    }));

    this.wikiDataBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [workerFunction.grantPrincipal],
      actions: ['s3:ListBucket'],
      resources: [this.wikiDataBucket.bucketArn],
    }));

    // LambdaにWikiデータ保存用のS3バケット名を環境変数として設定
    workerFunction.addEnvironment('WIKI_BUCKET_NAME', this.wikiDataBucket.bucketName);

    // Lambdaにマルチテナントモードを環境変数として設定
    workerFunction.addEnvironment('MULTITENANT', '1');

    // LambdaにMODEを環境変数として設定
    workerFunction.addEnvironment('MODE', environmentConfig.mode);

    this.ogpFunction = new lambda.Function(this, 'OGPFunction', {
      functionName: `ogp-image-generator-${environmentConfig.name}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('../ogp/dist/worker'),
      handler: 'worker.handler',
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        WIKI_BUCKET_NAME: this.wikiDataBucket.bucketName,
        MULTITENANT: '1',
        MODE: environmentConfig.mode,
      },
    });

    this.ogpFunctionUrl = this.ogpFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    this.wikiDataBucket.grantRead(this.ogpFunction);

    new cdk.CfnOutput(this, 'OGPFunctionUrl', {
      value: this.ogpFunctionUrl.url,
    });

    const ogpLambdaOAC = new cloudfront.CfnOriginAccessControl(this, 'OGPLambdaOAC', {
      originAccessControlConfig: {
        name: 'OGPLambdaOAC',
        description: 'OAC for OGP Lambda function URL',
        originAccessControlOriginType: 'lambda',
        signingBehavior: 'always',
        signingProtocol: 'sigv4'
      }
    });

    const ogpLambdaOrigin = new origins.FunctionUrlOrigin(this.ogpFunctionUrl, {
      originAccessControlId: ogpLambdaOAC.ref,
    });

    distribution.addBehavior('ogp/*', ogpLambdaOrigin, {
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      cachePolicy: ogpCachePolicy,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // CloudFrontからのアクセスのみ許可するため、ogpFunctionにリソースポリシーを追加
    this.ogpFunction.addPermission('AllowCloudFrontAccessOGP', {
      principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
      action: 'lambda:InvokeFunctionUrl',
      functionUrlAuthType: lambda.FunctionUrlAuthType.AWS_IAM,
      sourceArn: distribution.distributionArn,
    });

    // バケット名の出力
    new cdk.CfnOutput(this, 'WikiDataBucketName', {
      value: this.wikiDataBucket.bucketName,
    });
  }
}                          