import { describe, expect, it } from "vitest"

import { Semaphore } from "../src/providers/rate-limiter"

describe("Semaphore", () => {
  it("should allow operations up to permit count", async () => {
    const semaphore = new Semaphore(2)
    const results: number[] = []

    const task = async (id: number, delay: number) => {
      await semaphore.acquire()
      results.push(id)
      await new Promise((resolve) => setTimeout(resolve, delay))
      semaphore.release()
      return id
    }

    // Start 3 tasks with 2 permits
    const promises = [task(1, 50), task(2, 50), task(3, 50)]

    // First two should start immediately
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(results).toHaveLength(2)

    // Wait for all to complete
    await Promise.all(promises)
    expect(results).toHaveLength(3)
  })

  it("should execute with withPermit helper", async () => {
    const semaphore = new Semaphore(1)
    let counter = 0

    const result = await semaphore.withPermit(async () => {
      counter++
      return "done"
    })

    expect(result).toBe("done")
    expect(counter).toBe(1)
  })

  it("should release permit even if function throws", async () => {
    const semaphore = new Semaphore(1)

    try {
      await semaphore.withPermit(async () => {
        throw new Error("test error")
      })
    } catch {
      // Expected
    }

    // Should still be able to acquire
    const result = await semaphore.withPermit(async () => "success")
    expect(result).toBe("success")
  })
})
