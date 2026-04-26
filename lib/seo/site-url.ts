/** Canonical site origin for metadata, sitemap, and JSON-LD. */
export function siteUrlString(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  return "http://localhost:3010";
}

export function metadataBaseUrl(): URL {
  return new URL(siteUrlString());
}
