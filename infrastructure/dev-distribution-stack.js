"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevDistributionStack = void 0;
var cdk = require("aws-cdk-lib");
var acm = require("aws-cdk-lib/aws-certificatemanager");
var lambda = require("aws-cdk-lib/aws-lambda");
var s3 = require("aws-cdk-lib/aws-s3");
var s3deploy = require("aws-cdk-lib/aws-s3-deployment");
var route53 = require("aws-cdk-lib/aws-route53");
var targets = require("aws-cdk-lib/aws-route53-targets");
var apigateway = require("aws-cdk-lib/aws-apigateway");
var iam = require("aws-cdk-lib/aws-iam");
var ssm_parameter_reader_1 = require("./ssm-parameter-reader");
var DevDistributionStack = /** @class */ (function (_super) {
    __extends(DevDistributionStack, _super);
    function DevDistributionStack(scope, id, props) {
        var _this = _super.call(this, scope, id, props) || this;
        // us-east-1に保存されたSSMパラメータから証明書ARNを取得してインポート
        var certificateArnReader = new ssm_parameter_reader_1.SsmParameterReader(_this, 'CertificateArnParameter', {
            parameterName: '/bibo-note/certificate_arn',
            region: 'us-east-1',
        });
        var certificate = acm.Certificate.fromCertificateArn(_this, 'ImportedCertificate', certificateArnReader.getParameterValue());
        // Lambda関数 (./dist/worker/worker.ts) を作成
        var workerFunction = new lambda.Function(_this, 'DevWorkerFunction', {
            functionName: 'dev-application-worker',
            runtime: lambda.Runtime.NODEJS_22_X,
            code: lambda.Code.fromAsset('./dist/worker'),
            handler: 'worker.handler',
        });
        // 静的ファイル用のS3バケットを作成
        var staticBucket = new s3.Bucket(_this, 'DevStaticBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            publicReadAccess: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
        // S3 Bucketへ./dist/staticのファイルをデプロイ
        new s3deploy.BucketDeployment(_this, 'DevStaticDeployment', {
            sources: [s3deploy.Source.asset('./dist/static')],
            destinationBucket: staticBucket,
            destinationKeyPrefix: 'static/',
        });
        // バケットポリシーを設定して、API Gateway経由でのみアクセスを許可
        var apiGatewayPrincipal = new iam.ServicePrincipal('apigateway.amazonaws.com');
        staticBucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [staticBucket.arnForObjects('static/*')],
            principals: [apiGatewayPrincipal],
        }));
        // API Gatewayの作成
        var api = new apigateway.RestApi(_this, 'DevBiboNoteApi', {
            restApiName: 'Dev Bibo Note API',
            description: 'Development API for Bibo Note',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
            },
            // Basic認証を設定
            defaultMethodOptions: {
                authorizationType: apigateway.AuthorizationType.IAM,
            },
            domainName: {
                domainName: 'dev.bibo-note.jp',
                certificate: certificate,
                securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
            },
        });
        // Lambda統合のセットアップ
        var lambdaIntegration = new apigateway.LambdaIntegration(workerFunction, {
            proxy: true,
        });
        // 静的ファイル用の統合
        var staticIntegration = new apigateway.AwsIntegration({
            service: 's3',
            integrationHttpMethod: 'GET',
            path: "".concat(staticBucket.bucketName, "/static/{file}"),
            options: {
                credentialsRole: new iam.Role(_this, 'ApiGatewayS3Role', {
                    assumedBy: apiGatewayPrincipal,
                    managedPolicies: [
                        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
                    ],
                }),
                requestParameters: {
                    'integration.request.path.file': 'method.request.path.file',
                },
                integrationResponses: [{
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Content-Type': 'integration.response.header.Content-Type',
                        },
                    }],
            },
        });
        // リソースとメソッドの設定
        var staticResource = api.root.addResource('static').addResource('{file}');
        staticResource.addMethod('GET', staticIntegration, {
            requestParameters: {
                'method.request.path.file': true,
            },
            methodResponses: [{
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Content-Type': true,
                    },
                }],
        });
        // デフォルトのルートをLambdaにプロキシする
        api.root.addMethod('ANY', lambdaIntegration);
        api.root.addProxy({
            defaultIntegration: lambdaIntegration,
            anyMethod: true,
        });
        // Wikiデータ保存用のS3バケットを作成
        var wikiDataBucket = new s3.Bucket(_this, 'DevWikiDataBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            publicReadAccess: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
        // Lambda(workerFunction)からのみアクセスできるようにするためのバケットポリシー設定
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
        // LambdaにWikiデータ保存用のS3バケット名を環境変数として設定
        workerFunction.addEnvironment('WIKI_BUCKET_NAME', wikiDataBucket.bucketName);
        // Lambdaにマルチテナントモードを環境変数として設定
        workerFunction.addEnvironment('MULTITENANT', '1');
        // LambdaにMODEを環境変数として設定
        workerFunction.addEnvironment('MODE', 'development');
        // Route53 A record
        var hostedZone = route53.HostedZone.fromLookup(_this, 'HostedZone', { domainName: 'bibo-note.jp' });
        new route53.ARecord(_this, 'DevAliasRecord', {
            zone: hostedZone,
            recordName: 'dev.bibo-note.jp',
            target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
        });
        // Output values
        new cdk.CfnOutput(_this, 'DevApiUrl', {
            value: api.url,
            description: 'URL of the development API Gateway',
        });
        new cdk.CfnOutput(_this, 'DevWikiDataBucketName', {
            value: wikiDataBucket.bucketName,
            description: 'Name of the development wiki data bucket',
        });
        return _this;
    }
    return DevDistributionStack;
}(cdk.Stack));
exports.DevDistributionStack = DevDistributionStack;
