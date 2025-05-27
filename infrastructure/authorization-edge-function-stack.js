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
exports.AuthorizationEdgeFunctionStack = void 0;
var cdk = require("aws-cdk-lib");
var iam = require("aws-cdk-lib/aws-iam");
var aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
var lambda = require("aws-cdk-lib/aws-lambda");
var ssm = require("aws-cdk-lib/aws-ssm");
var AuthorizationEdgeFunctionStack = /** @class */ (function (_super) {
    __extends(AuthorizationEdgeFunctionStack, _super);
    function AuthorizationEdgeFunctionStack(scope, id, props) {
        var _this = _super.call(this, scope, id, props) || this;
        var edgeFunction = new aws_lambda_nodejs_1.NodejsFunction(_this, 'AuthorizationEdgeFunction', {
            functionName: 'authorization-edge-function',
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: 'infrastructure/lambdaedge/authorization.ts',
            handler: 'handler',
            memorySize: 128,
            timeout: cdk.Duration.seconds(5),
            role: new iam.Role(_this, 'AuthorizationEdgeFunctionRole', {
                assumedBy: new iam.CompositePrincipal(new iam.ServicePrincipal('lambda.amazonaws.com'), new iam.ServicePrincipal('edgelambda.amazonaws.com')),
                managedPolicies: [
                    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                ],
            }),
        });
        // SSMパラメータにLambda@EdgeのARNを保存
        new ssm.StringParameter(_this, 'AuthorizationEdgeFunctionArnParameter', {
            description: 'The Lambda@Edge ARN for CloudFront',
            parameterName: '/bibo-note/authorization_edge_function_arn',
            stringValue: edgeFunction.currentVersion.functionArn,
            tier: ssm.ParameterTier.STANDARD,
        });
        return _this;
    }
    return AuthorizationEdgeFunctionStack;
}(cdk.Stack));
exports.AuthorizationEdgeFunctionStack = AuthorizationEdgeFunctionStack;
