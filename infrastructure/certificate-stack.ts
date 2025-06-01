import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { EnvironmentConfig } from './environment-config';

interface CertificateStackProps extends cdk.StackProps {
  environmentConfig: EnvironmentConfig;
}

// CertificateStack: us-east-1でACM証明書を作成
export class CertificateStack extends cdk.Stack {
  public readonly certificateArn: string;

  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, props);

    const { environmentConfig } = props;

    // Route53のHostedZoneを取得（既に存在している場合）
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: environmentConfig.domainName
    });

    const certificate = new acm.Certificate(this, 'SiteCertificate', {
      domainName: environmentConfig.domainName,
      subjectAlternativeNames: [`*.${environmentConfig.domainName}`],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Save the certificate ARN to SSM Parameter Store
    new ssm.StringParameter(this, 'CertificateArnParameter', {
      parameterName: environmentConfig.certificateParameterName,
      stringValue: certificate.certificateArn,
      dataType: ssm.ParameterDataType.TEXT,
      description: `Certificate ARN for CloudFront - ${environmentConfig.name}`,
    });

    this.certificateArn = certificate.certificateArn;
  }
} 