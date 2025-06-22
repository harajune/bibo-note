import { getContext } from "hono/context-storage";
import { env } from "hono/adapter";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { v7 as uuidv7 } from "uuid";

export interface CacheInvalidationResult {
  invalidationId: string;
  status: string;
  createTime: Date;
}

// promise singleton
var distributionIdPromise: Promise<string> | null = null;

async function getDistributionId(): Promise<string> {
  if (distributionIdPromise) {
    return distributionIdPromise;
  }
  distributionIdPromise = getDistributionIdFromSSM();
  return distributionIdPromise;
}

/**
 * Get CloudFront distribution ID from SSM
 * @returns Promise<string>
 */
async function getDistributionIdFromSSM(): Promise<string> {

  const context = getContext();
  const envVars = env<{
    MODE: string,
    AWS_REGION: string,
    AWS_ACCESS_KEY_ID: string,
    AWS_SECRET_ACCESS_KEY: string,
    AWS_SESSION_TOKEN: string
  }>(context);

  try {
    const client = new SSMClient({ region: envVars.AWS_REGION,
      credentials: {
        accessKeyId: envVars.AWS_ACCESS_KEY_ID,
        secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
        sessionToken: envVars.AWS_SESSION_TOKEN
      }
      });
    const command = new GetParameterCommand({
      Name: `/bibo-note/${envVars.MODE}/cloudfront_distribution_id`
    });

    const response = await client.send(command);
    const distributionId = response.Parameter?.Value || '';
    
    if (!distributionId) {
      throw new Error('Failed to retrieve CloudFront distribution ID from SSM');
    }
    
    return distributionId;
  } catch (error) {
    console.error('Failed to get CloudFront distribution ID from SSM:', error);
    throw new Error(`SSM parameter retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export class CloudFrontCacheModel {
  private readonly context: any;
  private readonly envVars: {
    MODE: string;
    AWS_REGION: string;
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_SESSION_TOKEN: string;
  };

  constructor() {
    // start to get distribution id here because context is not available until the _middleware.ts is called
    getDistributionId();

    this.context = getContext();
    this.envVars = env<{
      MODE: string,
      AWS_REGION: string,
      AWS_ACCESS_KEY_ID: string,
      AWS_SECRET_ACCESS_KEY: string,
      AWS_SESSION_TOKEN: string
    }>(this.context);
  }

  /**
   * Invalidates specific paths in CloudFront cache
   * @param paths Array of paths to invalidate (e.g., ['/e/123', '/v/123'])
   * @returns Promise<CacheInvalidationResult>
   */
  public async invalidatePaths(paths: string[]): Promise<CacheInvalidationResult> {
    try {
      const distributionId = await getDistributionId();
      const client = new CloudFrontClient({
        region: this.envVars.AWS_REGION,
        credentials: {
          accessKeyId: this.envVars.AWS_ACCESS_KEY_ID,
          secretAccessKey: this.envVars.AWS_SECRET_ACCESS_KEY,
          sessionToken: this.envVars.AWS_SESSION_TOKEN
        }
      });
      const command = new CreateInvalidationCommand({
        DistributionId: distributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: paths.length,
            Items: paths
          },
          CallerReference: uuidv7()
        }
      });

      const response = await client.send(command);
      
      return {
        invalidationId: response.Invalidation?.Id || '',
        status: response.Invalidation?.Status || 'InProgress',
        createTime: response.Invalidation?.CreateTime ? new Date(response.Invalidation.CreateTime) : new Date()
      };
    } catch (error) {
      console.error('Failed to invalidate CloudFront cache:', error);
      throw new Error(`CloudFront cache invalidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Invalidates all content in CloudFront cache (use with caution)
   * @returns Promise<CacheInvalidationResult>
   */
  public async invalidateAll(): Promise<CacheInvalidationResult> {
    return await this.invalidatePaths(['/*']);
  }

  /**
   * Invalidates cache for a specific article by UUID
   * @param uuid Article UUID
   * @returns Promise<CacheInvalidationResult>
   */
  public async invalidateArticle(uuid: string): Promise<CacheInvalidationResult> {
    const paths = [
      `/e/${uuid}`,
      `/v/${uuid}`,
      `/ogp/${uuid}`
    ];
    
    return await this.invalidatePaths(paths);
  }

  /**
   * Invalidates cache for the home page and article list
   * @returns Promise<CacheInvalidationResult>
   */
  public async invalidateHomePage(): Promise<CacheInvalidationResult> {
    const paths = [
      '/'
    ];
    
    return await this.invalidatePaths(paths);
  }
} 