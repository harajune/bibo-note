import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class AuthorizationEdgeFunctionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const edgeFunction = new NodejsFunction(this, 'AuthorizationEdgeFunction', {
      functionName: 'authorization-edge-function',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'infrastructure/lambdaedge/authorization.ts',
      handler: 'handler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
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
      description: 'The Lambda@Edge ARN for CloudFront',
      parameterName: '/bibo-note/authorization_edge_function_arn',
      stringValue: edgeFunction.currentVersion.functionArn,
      tier: ssm.ParameterTier.STANDARD,
    });
  }
} 