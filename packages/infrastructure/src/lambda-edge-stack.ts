import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { EnvironmentConfig } from './environment-config';

interface LambdaEdgeStackProps extends cdk.StackProps {
  environmentConfig: EnvironmentConfig;
}

export class LambdaEdgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaEdgeStackProps) {
    super(scope, id, props);

    const { environmentConfig } = props;

    const edgeFunction = new NodejsFunction(this, 'ComputeSha256EdgeFunction', {
      functionName: `compute-sha256-edge-function-${environmentConfig.name}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'src/lambdaedge/computeSha256.ts',
      handler: 'handler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      role: new iam.Role(this, 'EdgeFunctionRole', {
        assumedBy: new iam.CompositePrincipal(
          new iam.ServicePrincipal('lambda.amazonaws.com'),
          new iam.ServicePrincipal('edgelambda.amazonaws.com')
        ),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaBasicExecutionRole'
          ),
        ],
      }),
    });

    // SSMパラメータにLambda@EdgeのARNを保存
    new ssm.StringParameter(this, 'EdgeFunctionArnParameter', {
      description: `The Lambda@Edge ARN for CloudFront - ${environmentConfig.name}`,
      parameterName: `/bibo-note/${environmentConfig.name}/edge_function_arn`,
      stringValue: edgeFunction.currentVersion.functionArn,
      tier: ssm.ParameterTier.STANDARD,
    });
  }
} 