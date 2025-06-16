import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { EnvironmentConfig } from './environment-config';

interface OGPLambdaStackProps extends cdk.StackProps {
  environmentConfig: EnvironmentConfig;
  wikiDataBucket: s3.IBucket;
}

export class OGPLambdaStack extends cdk.Stack {
  public readonly ogpFunction: lambda.Function;
  public readonly ogpFunctionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: OGPLambdaStackProps) {
    super(scope, id, props);

    const { environmentConfig, wikiDataBucket } = props;

    this.ogpFunction = new lambda.Function(this, 'OGPFunction', {
      functionName: `ogp-image-generator-${environmentConfig.name}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('../ogp/dist'),
      handler: 'index.default',
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        WIKI_BUCKET_NAME: wikiDataBucket.bucketName,
        MULTITENANT: '1',
        MODE: environmentConfig.mode,
      },
    });

    this.ogpFunctionUrl = this.ogpFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    wikiDataBucket.grantRead(this.ogpFunction);

    new cdk.CfnOutput(this, 'OGPFunctionUrl', {
      value: this.ogpFunctionUrl.url,
    });
  }
}
