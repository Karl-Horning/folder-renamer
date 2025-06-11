/**
 * Validates required environment variables.
 * Logs an error and exits the process if any are missing.
 *
 * @param {string[]} requiredKeys - Array of environment variable keys to validate.
 */
export function validateEnv(requiredKeys) {
    const missing = requiredKeys.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        console.error(
            "Missing required environment variables:",
            missing.join(", ")
        );
        process.exit(1);
    }
}
