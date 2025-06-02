export interface EnvironmentConfig {
  name: string;
  domainName: string;
  certificateParameterName: string;
  mode: string;
  secureEntireEnvironment: boolean;
}

export const environments: Record<string, EnvironmentConfig> = {
  development: {
    name: 'development',
    domainName: 'bibo-note.dev',
    certificateParameterName: '/bibo-note/dev/certificate_arn',
    mode: 'development',
    secureEntireEnvironment: true,
  },
  production: {
    name: 'production',
    domainName: 'bibo-note.jp',
    certificateParameterName: '/bibo-note/certificate_arn',
    mode: 'production',
    secureEntireEnvironment: false,
  },
};

export function getEnvironmentConfig(env: string): EnvironmentConfig {
  const config = environments[env];
  if (!config) {
    throw new Error(`Environment ${env} is not supported. Available environments: ${Object.keys(environments).join(', ')}`);
  }
  return config;
}