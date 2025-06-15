import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from './environment-config';

interface OGPLambdaStackProps extends cdk.StackProps {
  environmentConfig: EnvironmentConfig;
}

export class OGPLambdaStack extends cdk.Stack {
  public readonly ogpFunction: lambda.Function;
  public readonly ogpFunctionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: OGPLambdaStackProps) {
    super(scope, id, props);

    const { environmentConfig } = props;

    this.ogpFunction = new NodejsFunction(this, 'OGPGeneratorFunction', {
      functionName: `ogp-generator-${environmentConfig.name}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'src/lambda/ogp-generator.ts',
      handler: 'handler',
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: 'production'
      },
      bundling: {
        externalModules: [],
        nodeModules: ['@vercel/og']
      }
    });

    this.ogpFunctionUrl = this.ogpFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.GET],
        allowedHeaders: ['*']
      }
    });

    new cdk.CfnOutput(this, 'OGPFunctionUrl', {
      value: this.ogpFunctionUrl.url,
      description: 'OGP Generator Function URL'
    });
  }
}
