import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { EnvironmentConfig } from './environment-config';

interface AuthorizationEdgeFunctionStackProps extends cdk.StackProps {
  environmentConfig: EnvironmentConfig;
}

export class AuthorizationEdgeFunctionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AuthorizationEdgeFunctionStackProps) {
    super(scope, id, props);

    const { environmentConfig } = props;

    const edgeFunction = new NodejsFunction(this, 'AuthorizationEdgeFunction', {
      functionName: `authorization-edge-function-${environmentConfig.name}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      // Note: authorization.ts depends on the environment variables and configuration defined in this stack
      entry: 'src/lambdaedge/authorization.ts',
      handler: 'handler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      role: new iam.Role(this, 'AuthorizationEdgeFunctionRole', {
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
    new ssm.StringParameter(this, 'AuthorizationEdgeFunctionArnParameter', {
      description: `The Lambda@Edge ARN for CloudFront - ${environmentConfig.name}`,
      parameterName: `/bibo-note/${environmentConfig.name}/authorization_edge_function_arn`,
      stringValue: edgeFunction.currentVersion.functionArn,
      tier: ssm.ParameterTier.STANDARD,
    });
  }
} 