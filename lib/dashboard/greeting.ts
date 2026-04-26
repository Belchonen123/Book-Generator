/** First name or friendly handle for dashboard greetings. */
export function greetingFirstName(
  fullName: string | null | undefined,
  email: string,
): string {
  const t = fullName?.trim();
  if (t) {
    const first = t.split(/\s+/)[0];
    if (first) return first;
  }
  const local = email.split("@")[0]?.trim();
  if (local) {
    return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return "there";
}
