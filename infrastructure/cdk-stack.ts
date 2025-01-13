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

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      env: {
        region: 'us-east-1'
      },
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
      code: lambda.Code.fromAsset('./dist'),
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
      enableLogging: true,
      logFilePrefix: 'cloudfront-logs/',
      logIncludesCookies: true,
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
