import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';

// CertificateStack: us-east-1でACM証明書を作成
export class CertificateStack extends cdk.Stack {
  public readonly certificateArn: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const certificate = new acm.Certificate(this, 'SiteCertificate', {
      domainName: 'bibo-note.jp',
      subjectAlternativeNames: ['*.bibo-note.jp'],
      validation: acm.CertificateValidation.fromDns(),
    });

    // Save the certificate ARN to SSM Parameter Store
    new ssm.StringParameter(this, 'CertificateArnParameter', {
      parameterName: '/bibo-note/certificate_arn',
      stringValue: certificate.certificateArn,
      dataType: ssm.ParameterDataType.TEXT,
      description: 'Certificate ARN for CloudFront',
    });

    this.certificateArn = certificate.certificateArn;
  }
}  