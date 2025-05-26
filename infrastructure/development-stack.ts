import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export class DevelopmentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const workerFunction = new lambda.Function(this, 'DevWorkerFunction', {
      functionName: 'application-worker-dev',
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('./dist/worker'),
      handler: 'worker.handler',
      environment: {
        MODE: 'development',
        MULTITENANT: '1'
      }
    });

    const workerFunctionUrl = workerFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowCredentials: true,
        allowedHeaders: ['*'],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedOrigins: ['*'],
        maxAge: cdk.Duration.hours(1)
      }
    });

    const staticBucket = new s3.Bucket(this, 'DevStaticBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new s3deploy.BucketDeployment(this, 'DevStaticDeployment', {
      sources: [s3deploy.Source.asset('./dist/static')],
      destinationBucket: staticBucket,
      destinationKeyPrefix: 'static/',
    });

    const wikiDataBucket = new s3.Bucket(this, 'DevWikiDataBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    staticBucket.grantRead(workerFunction);
    wikiDataBucket.grantReadWrite(workerFunction);

    const devCertificate = new acm.Certificate(this, 'DevCertificate', {
      domainName: 'dev.bibo-note.jp',
      validation: acm.CertificateValidation.fromEmail(),
    });

    workerFunction.addEnvironment('WIKI_BUCKET_NAME', wikiDataBucket.bucketName);

    new cdk.CfnOutput(this, 'DevFunctionUrl', {
      value: workerFunctionUrl.url,
      description: 'Development Lambda Function URL'
    });

    new cdk.CfnOutput(this, 'DevStaticBucketName', {
      value: staticBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'DevWikiDataBucketName', {
      value: wikiDataBucket.bucketName,
    });
  }
}
