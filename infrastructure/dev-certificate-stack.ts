import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';

// DevCertificateStack: us-east-1でACM証明書を作成 (Development環境用)
export class DevCertificateStack extends cdk.Stack {
  public readonly certificateArn: string;
  public readonly hostedZone: route53.IHostedZone;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a new hosted zone for bibo-note.dev
    this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'bibo-note.dev',
    });

    const certificate = new acm.Certificate(this, 'DevSiteCertificate', {
      domainName: 'bibo-note.dev',
      subjectAlternativeNames: ['*.bibo-note.dev'],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });

    // Save the certificate ARN to SSM Parameter Store
    new ssm.StringParameter(this, 'DevCertificateArnParameter', {
      parameterName: '/bibo-note/dev/certificate_arn',
      stringValue: certificate.certificateArn,
      dataType: ssm.ParameterDataType.TEXT,
      description: 'Certificate ARN for Development API Gateway',
    });

    this.certificateArn = certificate.certificateArn;
  }
}