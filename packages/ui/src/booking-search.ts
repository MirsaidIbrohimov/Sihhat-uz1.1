export function stripBrPrefixInput(raw: string): string {
  return raw.replace(/^\s*#?\s*br\s*-\s*(?=\d)/i, "");
}

export function formatBrSearchQuery(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withoutHash = trimmed.replace(/^#+\s*/, "");
  const brDigits = /^(?:br[\s-]*)?(\d{1,5})$/i.exec(withoutHash);
  if (brDigits) return `BR-${brDigits[1]}`;
  return trimmed;
}
