/**
 * Authorization helper for the development API Gateway
 * 
 * This function validates the Authorization header against a simple token-based approach
 * for securing the development environment.
 */
export const validateAuthorization = (authHeader: string | undefined): boolean => {
  if (!authHeader) {
    return false;
  }

  // Extract token from Authorization header
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return false;
  }

  const token = parts[1];
  
  // Token from environment variable or a secured storage should be used
  // For development purposes, we are using a simple token validation
  // This would be replaced with a proper authentication mechanism for production
  const devApiToken = process.env.DEV_API_TOKEN;
  
  return token === devApiToken;
};

// This is for API Gateway authorizer function
export const generatePolicy = (
  effect: 'Allow' | 'Deny',
  resource: string,
  principalId: string
) => {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
};
