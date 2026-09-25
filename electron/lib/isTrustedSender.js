/**
 * Reports whether an IPC event came from a page inside the app's own renderer folder.
 * @param {{senderFrame?: {url?: string} | null}} event - The IPC event.
 * @param {string} trustedUrlPrefix - The file URL of the renderer folder.
 * @returns {boolean} True if the sending frame's URL starts with the trusted prefix.
 */
export function isTrustedSender(event, trustedUrlPrefix) {
    return Boolean(event.senderFrame?.url?.startsWith(trustedUrlPrefix));
}
