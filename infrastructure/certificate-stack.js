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
exports.CertificateStack = void 0;
var cdk = require("aws-cdk-lib");
var acm = require("aws-cdk-lib/aws-certificatemanager");
var route53 = require("aws-cdk-lib/aws-route53");
var ssm = require("aws-cdk-lib/aws-ssm");
// CertificateStack: us-east-1でACM証明書を作成
var CertificateStack = /** @class */ (function (_super) {
    __extends(CertificateStack, _super);
    function CertificateStack(scope, id, props) {
        var _this = _super.call(this, scope, id, props) || this;
        // Route53のHostedZoneを取得（既に存在している場合）
        var hostedZone = route53.HostedZone.fromLookup(_this, 'HostedZone', {
            domainName: 'bibo-note.jp'
        });
        var certificate = new acm.Certificate(_this, 'SiteCertificate', {
            domainName: 'bibo-note.jp',
            subjectAlternativeNames: ['*.bibo-note.jp'],
            validation: acm.CertificateValidation.fromDns(hostedZone),
        });
        // Save the certificate ARN to SSM Parameter Store
        new ssm.StringParameter(_this, 'CertificateArnParameter', {
            parameterName: '/bibo-note/certificate_arn',
            stringValue: certificate.certificateArn,
            dataType: ssm.ParameterDataType.TEXT,
            description: 'Certificate ARN for CloudFront',
        });
        _this.certificateArn = certificate.certificateArn;
        return _this;
    }
    return CertificateStack;
}(cdk.Stack));
exports.CertificateStack = CertificateStack;
