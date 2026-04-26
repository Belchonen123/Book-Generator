export function slugFileBase(title: string): string {
  const raw = title.trim().slice(0, 64);
  const s = raw.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  return s.length > 0 ? s : "book";
}

export function parseFilenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(header);
  const raw = m?.[1] ?? m?.[2];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}

export function coverPathFromPublicUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const marker = "/object/public/covers/";
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    return decodeURIComponent(u.pathname.slice(i + marker.length));
  } catch {
    return null;
  }
}
