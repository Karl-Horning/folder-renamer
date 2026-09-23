/**
 * Waits for an in-flight operation to settle, giving up after maxWaitMs, so quitting waits for a running batch without blocking indefinitely.
 * @param {Promise<any> | null} activePromise - The operation to wait for, if any.
 * @param {number} maxWaitMs - Maximum time to wait before giving up.
 * @returns {Promise<void>}
 */
export async function waitForActiveOperation(activePromise, maxWaitMs) {
    if (!activePromise) return;

    await Promise.race([
        activePromise.catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, maxWaitMs)),
    ]);
}
