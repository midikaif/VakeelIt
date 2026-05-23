
const PDF_WORKER_URL =
  process.env.EXPO_PUBLIC_PDF_WORKER_URL || "http://localhost:8001";

interface HealthCheckResult {
  isOnline: boolean;
  message: string;
  isWarmingUp?: boolean;
}

/**
 * Check if PDF worker service is online
 * Handles Render.com cold start issue by retrying
 */
export async function checkPdfWorkerHealth(): Promise<HealthCheckResult> {
  try {
    console.log(`[PDF Worker] Checking health at: ${PDF_WORKER_URL}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${PDF_WORKER_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log("[PDF Worker] ✓ Online and ready");
      return {
        isOnline: true,
        message: "PDF Worker is online",
        isWarmingUp: false,
      };
    } else {
      console.warn(`[PDF Worker] ✗ Unhealthy response: ${response.status}`);
      return {
        isOnline: false,
        message: `PDF Worker returned status ${response.status}`,
        isWarmingUp: true,
      };
    }
  } catch (error: any) {
    console.warn("[PDF Worker] Connection failed:", error.message);

    // Check if it's a timeout or connection refused (likely cold start)
    const isConnectionError =
      error.name === "AbortError" ||
      error.message?.includes("Failed to fetch") ||
      error.code === "ECONNREFUSED";

    return {
      isOnline: false,
      message: isConnectionError
        ? "PDF Worker is starting up (Render cold start)..."
        : "Unable to reach PDF Worker",
      isWarmingUp: true,
    };
  }
}

/**
 * Wake up the PDF worker by making a request to it
 * This helps handle Render.com cold starts
 */
export async function warmUpPdfWorker(): Promise<boolean> {
  try {
    console.log("[PDF Worker] Attempting to warm up...");

    // Make a simple request to wake it up
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${PDF_WORKER_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log("[PDF Worker] ✓ Warmed up successfully");
      return true;
    }
    return false;
  } catch (error) {
    console.warn("[PDF Worker] Warm-up attempt failed:", error);
    return false;
  }
}

/**
 * Wait for PDF worker to come online
 * Useful for handling Render cold starts
 */
export async function waitForPdfWorker(
  maxAttempts: number = 3,
  delayMs: number = 2000,
): Promise<boolean> {
  console.log(
    `[PDF Worker] Waiting for worker to come online (max ${maxAttempts} attempts)...`,
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[PDF Worker] Attempt ${attempt}/${maxAttempts}`);

    const health = await checkPdfWorkerHealth();
    if (health.isOnline) {
      return true;
    }

    // Wait before retrying (except on last attempt)
    if (attempt < maxAttempts) {
      console.log(`[PDF Worker] Waiting ${delayMs}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error("[PDF Worker] Failed to come online after all attempts");
  return false;
}

/**
 * Get the PDF worker URL (for debugging)
 */
export function getPdfWorkerUrl(): string {
  return PDF_WORKER_URL;
}
