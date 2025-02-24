import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class LambdaEdgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const edgeFunction = new NodejsFunction(this, 'ComputeSha256EdgeFunction', {
      functionName: 'compute-sha256-edge-function',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'infrastructure/lambdaedge/computeSha256.ts',
      handler: 'handler',
      memorySize: 1769,
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
      description: 'The Lambda@Edge ARN for CloudFront',
      parameterName: '/bibo-note/edge_function_arn',
      stringValue: edgeFunction.currentVersion.functionArn,
      tier: ssm.ParameterTier.STANDARD,
    });
  }
} 