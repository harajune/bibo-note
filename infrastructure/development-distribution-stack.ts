import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';

export class DevelopmentDistributionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get the existing hosted zone
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'bibo-note.jp'
    });

    // Create ACM certificate for dev.bibo-note.jp
    const certificate = new acm.Certificate(this, 'DevCertificate', {
      domainName: 'dev.bibo-note.jp',
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Lambda function (./dist/worker/worker.ts) for development
    const workerFunction = new lambda.Function(this, 'DevWorkerFunction', {
      functionName: 'dev-application-worker',
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('./dist/worker'),
      handler: 'worker.handler',
    });

    // S3 Bucket for static files
    const staticBucket = new s3.Bucket(this, 'DevStaticBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // S3 Bucket for wiki data
    const wikiDataBucket = new s3.Bucket(this, 'DevWikiDataBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Deploy static files to S3
    new s3deploy.BucketDeployment(this, 'DevStaticDeployment', {
      sources: [s3deploy.Source.asset('./dist/static')],
      destinationBucket: staticBucket,
      destinationKeyPrefix: 'static/',
    });

    // Lambda permissions for accessing wiki data bucket
    wikiDataBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [workerFunction.grantPrincipal],
      actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
      resources: [wikiDataBucket.bucketArn + '/*'],
    }));

    wikiDataBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [workerFunction.grantPrincipal],
      actions: ['s3:ListBucket'],
      resources: [wikiDataBucket.bucketArn],
    }));

    // Set environment variables for the Lambda function
    workerFunction.addEnvironment('WIKI_BUCKET_NAME', wikiDataBucket.bucketName);
    workerFunction.addEnvironment('MULTITENANT', '1');
    workerFunction.addEnvironment('MODE', 'development');

    // Create API Gateway with authentication
    const api = new apigateway.RestApi(this, 'DevApi', {
      restApiName: 'DevBiboNoteApi',
      description: 'Development API for Bibo Note',
      domainName: {
        domainName: 'dev.bibo-note.jp',
        certificate: certificate,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
      }
    });

    // Create an authorizer for API Gateway
    const authorizer = new apigateway.RequestAuthorizer(this, 'DevApiAuthorizer', {
      handler: workerFunction,
      identitySources: [apigateway.IdentitySource.header('Authorization')],
      resultsCacheTtl: cdk.Duration.seconds(0), // No caching for development
    });

    // Create routes for API Gateway
    const apiRoot = api.root.addResource('{proxy+}');
    
    // Add authorization to all methods
    apiRoot.addMethod('ANY', new apigateway.LambdaIntegration(workerFunction), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Static files proxy - requires authentication in dev environment
    const staticFiles = api.root.addResource('static').addResource('{proxy+}');
    staticFiles.addMethod('GET', new apigateway.AwsIntegration({
      service: 's3',
      integrationHttpMethod: 'GET',
      path: `${staticBucket.bucketName}/static/{proxy}`,
      options: {
        credentialsRole: new iam.Role(this, 'StaticApiRole', {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess')],
        }),
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
        requestParameters: {
          'integration.request.path.proxy': 'method.request.path.proxy',
        },
        integrationResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': 'integration.response.header.Content-Type',
          },
        }],
      }
    }), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      requestParameters: {
        'method.request.path.proxy': true,
      },
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Content-Type': true,
        },
      }],
    });

    // Create Route53 record for dev.bibo-note.jp
    new route53.ARecord(this, 'DevAliasRecord', {
      zone: hostedZone,
      recordName: 'dev.bibo-note.jp',
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
    });

    // Output bucket names and API URL
    new cdk.CfnOutput(this, 'DevWikiDataBucketName', {
      value: wikiDataBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'DevStaticBucketName', {
      value: staticBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'DevApiUrl', {
      value: api.url,
    });

    new cdk.CfnOutput(this, 'DevDomainUrl', {
      value: 'https://dev.bibo-note.jp',
    });
  }
}