import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

//TODO: upload static files to s3 and refer from /static/ endpoint

export class CloudFrontEdgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 既存のRoute 53ホストゾーンを参照
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      zoneName: 'bibo-note.jp',
      hostedZoneId: 'Z08641051STVZTDK95QAW'
    });

    // ACM証明書の作成
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: 'bibo-note.jp',
      subjectAlternativeNames: ['*.bibo-note.jp'],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // CloudWatch Logsのロググループを作成
    const logGroup = new logs.LogGroup(this, 'CloudFrontLogGroup', {
      logGroupName: '/aws/cloudfront/bibo-note',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // CloudFrontがCloudWatch Logsに書き込むためのIAMロールを作成
    const cloudFrontLogRole = new iam.Role(this, 'CloudFrontLogRole', {
      assumedBy: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
    });

    // CloudWatch Logsへの書き込み権限を付与
    cloudFrontLogRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [logGroup.logGroupArn],
    }));

    // S3バケットの作成
    const bucket = new s3.Bucket(this, 'StaticSiteBucket', {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda@Edge関数の作成
    const edgeFunction = new cloudfront.experimental.EdgeFunction(this, 'EdgeFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'worker.handler',
      code: lambda.Code.fromAsset('./dist/worker'),
      memorySize: 128,
    });

    // CloudFront Distributionの作成
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(bucket.bucketWebsiteDomainName),
        edgeLambdas: [
          {
            functionVersion: edgeFunction.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          },
        ],
        cachePolicy: new cloudfront.CachePolicy(this, 'CachePolicy', {
          defaultTtl: cdk.Duration.seconds(0),
          minTtl: cdk.Duration.seconds(0),
          maxTtl: cdk.Duration.seconds(0),
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: ['bibo-note.jp', '*.bibo-note.jp'],
      certificate,
      enableLogging: true,
      logFilePrefix: 'cloudfront-logs/',
      logIncludesCookies: true,
    });

    // Route 53 レコードの作成
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // ワイルドカードサブドメイン用のレコード
    new route53.ARecord(this, 'WildcardAliasRecord', {
      zone: hostedZone,
      recordName: '*',
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // S3へのデプロイ
    new s3deploy.BucketDeployment(this, 'DeployStaticSite', {
      sources: [s3deploy.Source.asset('./dist/static')],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // CloudFront Distribution URLをOutput
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
    });
  }
}
