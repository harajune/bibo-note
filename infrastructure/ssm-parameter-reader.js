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
exports.SsmParameterReader = void 0;
var cdk = require("aws-cdk-lib");
var constructs_1 = require("constructs");
var cr = require("aws-cdk-lib/custom-resources");
var iam = require("aws-cdk-lib/aws-iam");
var SsmParameterReader = /** @class */ (function (_super) {
    __extends(SsmParameterReader, _super);
    function SsmParameterReader(scope, id, props) {
        var _this = _super.call(this, scope, id) || this;
        var parameterName = props.parameterName, region = props.region;
        _this.reader = new cr.AwsCustomResource(_this, "".concat(id, "CustomResource"), {
            policy: cr.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ssm:GetParameter*'],
                    resources: [
                        cdk.Stack.of(_this).formatArn({
                            service: 'ssm',
                            region: region,
                            resource: 'parameter',
                            resourceName: parameterName.replace(/^\/+/, ''),
                        }),
                    ],
                }),
            ]),
            onUpdate: {
                service: 'SSM',
                action: 'getParameter',
                parameters: { Name: parameterName },
                region: region,
                physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
            },
        });
        return _this;
    }
    SsmParameterReader.prototype.getParameterValue = function () {
        return this.reader.getResponseField('Parameter.Value');
    };
    return SsmParameterReader;
}(constructs_1.Construct));
exports.SsmParameterReader = SsmParameterReader;
