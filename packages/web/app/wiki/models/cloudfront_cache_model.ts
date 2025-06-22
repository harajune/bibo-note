import { getContext } from "hono/context-storage";
import { env } from "hono/adapter";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";

export interface CacheInvalidationResult {
  invalidationId: string;
  status: string;
  createTime: Date;
}

export class CloudFrontCacheModel {
  private readonly context: any;
  private readonly distributionId: string;

  constructor() {
    this.context = getContext();
    const envVariables = env<{
      CLOUDFRONT_DISTRIBUTION_ID: string
    }>(this.context);
    
    this.distributionId = envVariables.CLOUDFRONT_DISTRIBUTION_ID;
    
    if (!this.distributionId) {
      throw new Error('CLOUDFRONT_DISTRIBUTION_ID environment variable is required');
    }
  }

  /**
   * Invalidates specific paths in CloudFront cache
   * @param paths Array of paths to invalidate (e.g., ['/e/123', '/v/123'])
   * @returns Promise<CacheInvalidationResult>
   */
  public async invalidatePaths(paths: string[]): Promise<CacheInvalidationResult> {
    try {
      const client = new CloudFrontClient({
        region: 'us-east-1' // CloudFront is always in us-east-1
      });
      const command = new CreateInvalidationCommand({
        DistributionId: this.distributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: paths.length,
            Items: paths
          },
          CallerReference: `invalidation-${Date.now()}`
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
      `/v/${uuid}`
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