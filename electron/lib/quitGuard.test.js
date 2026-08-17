import { afterEach, describe, expect, it, vi } from "vitest";

import { waitForActiveOperation } from "./quitGuard.js";

describe("waitForActiveOperation", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("resolves immediately when there's no active operation", async () => {
        await expect(
            waitForActiveOperation(null, 15_000)
        ).resolves.toBeUndefined();
    });

    it("resolves once the active operation resolves, without waiting for the timeout", async () => {
        vi.useFakeTimers();

        let resolveOp;
        const op = new Promise((resolve) => {
            resolveOp = resolve;
        });

        const waitPromise = waitForActiveOperation(op, 15_000);
        resolveOp();

        await expect(waitPromise).resolves.toBeUndefined();
    });

    it("resolves (not rejects) once the active operation rejects", async () => {
        const op = Promise.reject(new Error("rename batch failed"));

        await expect(
            waitForActiveOperation(op, 15_000)
        ).resolves.toBeUndefined();
    });

    it("gives up and resolves once maxWaitMs elapses, even if the operation never settles", async () => {
        vi.useFakeTimers();

        const neverSettles = new Promise(() => {});
        const waitPromise = waitForActiveOperation(neverSettles, 15_000);

        let settled = false;
        waitPromise.then(() => {
            settled = true;
        });

        await vi.advanceTimersByTimeAsync(14_999);
        expect(settled).toBe(false);

        await vi.advanceTimersByTimeAsync(1);
        expect(settled).toBe(true);
    });
});
