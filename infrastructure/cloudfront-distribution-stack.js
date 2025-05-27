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
exports.CloudFrontDistributionStack = void 0;
var cdk = require("aws-cdk-lib");
var acm = require("aws-cdk-lib/aws-certificatemanager");
var cloudfront = require("aws-cdk-lib/aws-cloudfront");
var origins = require("aws-cdk-lib/aws-cloudfront-origins");
var lambda = require("aws-cdk-lib/aws-lambda");
var s3 = require("aws-cdk-lib/aws-s3");
var s3deploy = require("aws-cdk-lib/aws-s3-deployment");
var route53 = require("aws-cdk-lib/aws-route53");
var targets = require("aws-cdk-lib/aws-route53-targets");
var ssm_parameter_reader_1 = require("./ssm-parameter-reader");
var iam = require("aws-cdk-lib/aws-iam");
var CloudFrontDistributionStack = /** @class */ (function (_super) {
    __extends(CloudFrontDistributionStack, _super);
    function CloudFrontDistributionStack(scope, id, props) {
        var _this = _super.call(this, scope, id, props) || this;
        // us-east-1に保存されたSSMパラメータから証明書ARNを取得してインポート
        var certificateArnReader = new ssm_parameter_reader_1.SsmParameterReader(_this, 'CertificateArnParameter', {
            parameterName: '/bibo-note/certificate_arn',
            region: 'us-east-1',
        });
        // us-east-1に保存されたSSMパラメータからLambda@Edge関数のARNを取得
        var edgeFunctionArnReader = new ssm_parameter_reader_1.SsmParameterReader(_this, 'EdgeFunctionArnParameter', {
            parameterName: '/bibo-note/edge_function_arn',
            region: 'us-east-1',
        });
        // us-east-1に保存されたSSMパラメータからLambda@Edge関数のARNを取得
        var authorizationEdgeFunctionArnReader = new ssm_parameter_reader_1.SsmParameterReader(_this, 'AuthorizationEdgeFunctionArnParameter', {
            parameterName: '/bibo-note/authorization_edge_function_arn',
            region: 'us-east-1',
        });
        // Lambda@Edge用のIAMロールを作成
        var edgeFunctionRole = new iam.Role(_this, 'EdgeFunctionRole', {
            assumedBy: new iam.CompositePrincipal(new iam.ServicePrincipal('lambda.amazonaws.com'), new iam.ServicePrincipal('edgelambda.amazonaws.com')),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
            ]
        });
        var certificate = acm.Certificate.fromCertificateArn(_this, 'ImportedCertificate', certificateArnReader.getParameterValue());
        // Lambda@Edge関数のバージョンを取得
        var edgeFunctionVersion = lambda.Version.fromVersionArn(_this, 'EdgeFunctionVersion', edgeFunctionArnReader.getParameterValue());
        // Lambda@Edge関数のバージョンを取得
        var authorizationEdgeFunctionVersion = lambda.Version.fromVersionArn(_this, 'AuthorizationEdgeFunctionVersion', authorizationEdgeFunctionArnReader.getParameterValue());
        // Lambda関数 (./dist/worker/worker.ts) を作成
        var workerFunction = new lambda.Function(_this, 'WorkerFunction', {
            functionName: 'application-worker',
            runtime: lambda.Runtime.NODEJS_22_X,
            code: lambda.Code.fromAsset('./dist/worker'),
            handler: 'worker.handler',
        });
        // Lambda Function URLを作成（AWS_IAM認証を利用して直接の呼び出しを防止）
        var workerFunctionUrl = workerFunction.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.AWS_IAM,
        });
        // 静的ファイル用のS3バケットを作成（CloudFront以外からのアクセスを拒否）
        var staticBucket = new s3.Bucket(_this, 'StaticBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            publicReadAccess: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
        // S3 Bucketへ./dist/staticのファイルをデプロイ
        new s3deploy.BucketDeployment(_this, 'StaticDeployment', {
            sources: [s3deploy.Source.asset('./dist/static')],
            destinationBucket: staticBucket,
            destinationKeyPrefix: 'static/',
        });
        // CloudFrontのオリジン作成
        var s3Origin = origins.S3BucketOrigin.withOriginAccessControl(staticBucket);
        // Lambda用のOAC(Origin Access Control)を作成し、CloudFrontのみからの呼び出しを許可
        var lambdaOAC = new cloudfront.CfnOriginAccessControl(_this, 'LambdaOAC', {
            originAccessControlConfig: {
                name: 'LambdaOAC',
                description: 'OAC for Lambda function URL',
                originAccessControlOriginType: 'lambda',
                signingBehavior: 'always',
                signingProtocol: 'sigv4'
            }
        });
        var lambdaOrigin = new origins.FunctionUrlOrigin(workerFunctionUrl, {
            originAccessControlId: lambdaOAC.ref,
        });
        // 記事表示用のキャッシュポリシー
        var articleCachePolicy = new cloudfront.CachePolicy(_this, 'ArticleCachePolicy', {
            cachePolicyName: 'ArticleCachePolicy',
            comment: 'Cache policy for article pages',
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('x-forwarded-host', 'authorization'),
            enableAcceptEncodingGzip: true,
            enableAcceptEncodingBrotli: true,
            defaultTtl: cdk.Duration.seconds(1), //TODO: デバッグ用にキャッシュを無効化
            maxTtl: cdk.Duration.seconds(1),
            minTtl: cdk.Duration.seconds(1),
        });
        // 静的ファイル用のキャッシュポリシー
        var staticCachePolicy = new cloudfront.CachePolicy(_this, 'StaticCachePolicy', {
            cachePolicyName: 'StaticCachePolicy',
            comment: 'Cache policy for static files',
            enableAcceptEncodingGzip: true,
            enableAcceptEncodingBrotli: true,
            defaultTtl: cdk.Duration.seconds(1), //TODO: デバッグ用にキャッシュを無効化 
            maxTtl: cdk.Duration.seconds(1),
            minTtl: cdk.Duration.seconds(1),
        });
        // CloudFrontディストリビューションを作成
        var distribution = new cloudfront.Distribution(_this, 'Distribution', {
            defaultBehavior: {
                origin: lambdaOrigin,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                edgeLambdas: [{
                        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                        functionVersion: edgeFunctionVersion,
                        includeBody: true,
                    }, {
                        eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
                        functionVersion: authorizationEdgeFunctionVersion,
                        includeBody: true,
                    }],
                cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
            },
            additionalBehaviors: {
                'static/*': {
                    origin: s3Origin,
                    cachePolicy: staticCachePolicy,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                },
                'v/*': {
                    origin: lambdaOrigin,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    cachePolicy: articleCachePolicy,
                    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
                    edgeLambdas: [{
                            eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
                            functionVersion: authorizationEdgeFunctionVersion,
                            includeBody: true,
                        }],
                },
            },
            domainNames: ['bibo-note.jp', '*.bibo-note.jp'],
            certificate: certificate,
        });
        // CloudFrontからのアクセスのみ許可するため、workerFunctionにリソースポリシーを追加
        workerFunction.addPermission('AllowCloudFrontAccess', {
            principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
            action: 'lambda:InvokeFunctionUrl',
            functionUrlAuthType: lambda.FunctionUrlAuthType.AWS_IAM,
            sourceArn: distribution.distributionArn,
        });
        // CloudFrontのディストリビューションのドメイン名を出力
        new cdk.CfnOutput(_this, 'DistributionDomainName', {
            value: distribution.distributionDomainName,
        });
        // Create Route53 A records for both the apex and wildcard domains
        var hostedZone = route53.HostedZone.fromLookup(_this, 'HostedZone', { domainName: 'bibo-note.jp' });
        new route53.ARecord(_this, 'AliasRecordApex', {
            zone: hostedZone,
            recordName: 'bibo-note.jp',
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        });
        new route53.ARecord(_this, 'AliasRecordWildcard', {
            zone: hostedZone,
            recordName: '*.bibo-note.jp',
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        });
        // Wikiデータ保存用のS3バケットを作成
        var wikiDataBucket = new s3.Bucket(_this, 'WikiDataBucket', {
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
        workerFunction.addEnvironment('MODE', 'production');
        // バケット名の出力
        new cdk.CfnOutput(_this, 'WikiDataBucketName', {
            value: wikiDataBucket.bucketName,
        });
        return _this;
    }
    return CloudFrontDistributionStack;
}(cdk.Stack));
exports.CloudFrontDistributionStack = CloudFrontDistributionStack;
