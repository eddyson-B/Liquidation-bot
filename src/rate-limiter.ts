/**
 * Rate Limiter for RPC Requests
 *
 * Manages request rate limiting to prevent exceeding RPC provider limits.
 * Queues requests and processes them at a controlled rate.
 */

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

export class RateLimiter {
  private queue: QueuedRequest<any>[] = [];
  private requestsThisSecond: number = 0;
  private maxRequestsPerSecond: number;
  private processing: boolean = false;
  private lastResetTime: number = Date.now();

  constructor(maxRequestsPerSecond: number = 9) {
    this.maxRequestsPerSecond = maxRequestsPerSecond;
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute: fn,
        resolve,
        reject
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      // Reset counter every second
      const now = Date.now();
      if (now - this.lastResetTime >= 1000) {
        this.requestsThisSecond = 0;
        this.lastResetTime = now;
      }

      // Wait if we've hit the rate limit this second
      if (this.requestsThisSecond >= this.maxRequestsPerSecond) {
        const timeToWait = 1000 - (now - this.lastResetTime);
        if (timeToWait > 0) {
          await this.sleep(timeToWait);
        }
        this.requestsThisSecond = 0;
        this.lastResetTime = Date.now();
      }

      // Process next request
      const request = this.queue.shift();
      if (!request) break;

      this.requestsThisSecond++;

      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      // Small delay between requests to smooth out the rate
      await this.sleep(Math.floor(1000 / this.maxRequestsPerSecond));
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get requests processed this second
   */
  getCurrentLoad(): number {
    return this.requestsThisSecond;
  }
}
