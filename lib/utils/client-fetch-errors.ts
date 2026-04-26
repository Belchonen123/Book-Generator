/**
 * Client-only: map low-level `fetch` failures to copy that explains common causes.
 */
export function userFacingFetchError(err: unknown, actionLabel: string): Error {
  if (err instanceof TypeError && /failed to fetch/i.test(err.message)) {
    return new Error(
      `${actionLabel}: no response from the server (connection dropped or timed out). If you are on localhost, confirm the dev server is still running and try again.`,
    );
  }
  return err instanceof Error ? err : new Error(`${actionLabel} failed.`);
}
