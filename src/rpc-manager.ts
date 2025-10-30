/**
 * Multi-RPC Manager
 *
 * Manages multiple RPC connections for load balancing and parallel operations.
 * Each RPC endpoint gets its own rate limiter to prevent hitting individual limits.
 */

import { Connection } from '@solana/web3.js';
import { RateLimiter } from './rate-limiter.js';
import { Logger } from './logger.js';

interface RPCEndpoint {
  url: string;
  connection: Connection;
  rateLimiter: RateLimiter;
  healthy: boolean;
  errorCount: number;
  lastErrorTime: number | null;
}

export class MultiRPCManager {
  private endpoints: RPCEndpoint[] = [];
  private currentIndex: number = 0;
  private logger: Logger;
  private maxRequestsPerRpc: number;

  constructor(
    rpcUrls: string[],
    logger: Logger,
    maxRequestsPerRpc: number = 9
  ) {
    this.logger = logger;
    this.maxRequestsPerRpc = maxRequestsPerRpc;

    if (rpcUrls.length === 0) {
      throw new Error('At least one RPC endpoint is required');
    }

    // Initialize endpoints with rate limiters
    this.endpoints = rpcUrls.map(url => ({
      url,
      connection: new Connection(url, 'confirmed'),
      rateLimiter: new RateLimiter(maxRequestsPerRpc),
      healthy: true,
      errorCount: 0,
      lastErrorTime: null
    }));

    this.logger.info(`Initialized ${this.endpoints.length} RPC endpoints`);
    this.endpoints.forEach((endpoint, index) => {
      this.logger.info(`  RPC ${index + 1}: ${this.maskUrl(endpoint.url)}`);
    });
  }

  /**
   * Get next connection in round-robin fashion (for sequential operations)
   */
  getNextConnection(): Connection {
    const healthyEndpoints = this.endpoints.filter(e => e.healthy);

    if (healthyEndpoints.length === 0) {
      this.logger.warn('All RPC endpoints unhealthy, resetting...');
      this.endpoints.forEach(e => {
        e.healthy = true;
        e.errorCount = 0;
      });
      return this.endpoints[0].connection;
    }

    const endpoint = healthyEndpoints[this.currentIndex % healthyEndpoints.length];
    this.currentIndex++;

    return endpoint.connection;
  }

  /**
   * Get all healthy connections (for parallel operations)
   */
  getAllConnections(): Connection[] {
    return this.endpoints
      .filter(e => e.healthy)
      .map(e => e.connection);
  }

  /**
   * Execute a rate-limited RPC call on a specific connection
   */
  async executeRateLimited<T>(
    connection: Connection,
    fn: (connection: Connection) => Promise<T>
  ): Promise<T> {
    const endpoint = this.endpoints.find(e => e.connection === connection);

    if (!endpoint) {
      throw new Error('Connection not found in manager');
    }

    try {
      const result = await endpoint.rateLimiter.execute(() => fn(connection));

      // Reset error count on success
      if (endpoint.errorCount > 0) {
        endpoint.errorCount = 0;
        endpoint.lastErrorTime = null;
      }

      return result;
    } catch (error: any) {
      this.handleError(endpoint, error);
      throw error;
    }
  }

  /**
   * Execute parallel operations across all healthy RPCs
   * Adds delays between items to respect Jupiter API rate limits
   */
  async executeParallel<T>(
    items: any[],
    fn: (item: any, connection: Connection) => Promise<T>,
    delayBetweenItems: number = 200
  ): Promise<T[]> {
    const healthyConnections = this.getAllConnections();

    if (healthyConnections.length === 0) {
      throw new Error('No healthy RPC connections available');
    }

    // Divide items across available connections
    const itemsPerConnection = Math.ceil(items.length / healthyConnections.length);

    const promises = healthyConnections.map(async (connection, index) => {
      const startIdx = index * itemsPerConnection;
      const endIdx = Math.min(startIdx + itemsPerConnection, items.length);
      const itemSlice = items.slice(startIdx, endIdx);

      const results: T[] = [];

      for (let i = 0; i < itemSlice.length; i++) {
        const item = itemSlice[i];

        try {
          const result = await this.executeRateLimited(connection, (conn) =>
            fn(item, conn)
          );
          results.push(result);

          // Add delay between items to respect Jupiter API rate limits
          // Skip delay after the last item
          if (i < itemSlice.length - 1 && delayBetweenItems > 0) {
            await this.sleep(delayBetweenItems);
          }
        } catch (error: any) {
          // Log but continue with other items
          this.logger.debug(`Error processing item: ${error.message}`);
        }
      }

      return results;
    });

    const allResults = await Promise.all(promises);
    return allResults.flat();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle RPC errors and mark unhealthy endpoints
   */
  private handleError(endpoint: RPCEndpoint, error: any) {
    endpoint.errorCount++;
    endpoint.lastErrorTime = Date.now();

    const isRateLimit = error?.response?.status === 429 ||
                       error?.message?.includes('429') ||
                       error?.message?.includes('Too Many Requests');

    if (isRateLimit) {
      this.logger.warn(`Rate limit on ${this.maskUrl(endpoint.url)}`);
    }

    // Mark as unhealthy after 3 errors in 60 seconds
    if (endpoint.errorCount >= 3 &&
        endpoint.lastErrorTime &&
        Date.now() - endpoint.lastErrorTime < 60000) {
      endpoint.healthy = false;
      this.logger.error(
        `Marked ${this.maskUrl(endpoint.url)} as unhealthy (${endpoint.errorCount} errors)`
      );

      // Auto-recover after 5 minutes
      setTimeout(() => {
        endpoint.healthy = true;
        endpoint.errorCount = 0;
        this.logger.info(`Recovered ${this.maskUrl(endpoint.url)}`);
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Mask sensitive parts of URL (API keys)
   */
  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);

      if (params.has('api-key')) {
        const key = params.get('api-key') || '';
        params.set('api-key', key.substring(0, 8) + '...');
        urlObj.search = params.toString();
      }

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Get health status of all endpoints
   */
  getHealthStatus(): { total: number; healthy: number; unhealthy: number } {
    const healthy = this.endpoints.filter(e => e.healthy).length;
    return {
      total: this.endpoints.length,
      healthy,
      unhealthy: this.endpoints.length - healthy
    };
  }

  /**
   * Get statistics about rate limiter usage
   */
  getStats() {
    return this.endpoints.map((endpoint, index) => ({
      rpc: index + 1,
      url: this.maskUrl(endpoint.url),
      healthy: endpoint.healthy,
      queueSize: endpoint.rateLimiter.getQueueSize(),
      currentLoad: endpoint.rateLimiter.getCurrentLoad()
    }));
  }
}
