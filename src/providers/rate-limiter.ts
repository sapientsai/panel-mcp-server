/**
 * Semaphore-based rate limiter for concurrent request management
 */

import { getMaxConcurrent } from "../constants.js"

/**
 * Simple semaphore for limiting concurrent operations
 */
export class Semaphore {
  private permits: number
  private readonly waitQueue: Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  /**
   * Acquire a permit, waiting if necessary
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve)
    })
  }

  /**
   * Release a permit
   */
  release(): void {
    const next = this.waitQueue.shift()
    if (next) {
      next()
    } else {
      this.permits++
    }
  }

  /**
   * Execute a function with rate limiting
   */
  async withPermit<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }
}

/**
 * Global rate limiter instance
 * Shared across all providers for overall concurrency control
 */
const rateLimiterHolder: { instance?: Semaphore } = {}

/**
 * Get or create the global rate limiter
 */
export const getRateLimiter = (): Semaphore => {
  rateLimiterHolder.instance ??= new Semaphore(getMaxConcurrent())
  return rateLimiterHolder.instance
}

/**
 * Execute a function with rate limiting
 */
export const withRateLimit = <T>(fn: () => Promise<T>): Promise<T> => {
  return getRateLimiter().withPermit(fn)
}
