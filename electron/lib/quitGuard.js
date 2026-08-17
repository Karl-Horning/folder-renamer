/**
 * Waits for an in-flight operation to settle before resolving, giving up after
 * maxWaitMs regardless — used so quitting mid-rename waits for the batch to
 * finish instead of cutting it off, without ever blocking quit indefinitely.
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
