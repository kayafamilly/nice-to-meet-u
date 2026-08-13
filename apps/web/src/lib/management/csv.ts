export function safeCsvCell(value: unknown): string {
  let text = String(value ?? "").replaceAll('"', '""').replace(/[\r\n]+/g, " ");
  if (/^[=+\-@\t]/.test(text)) text = `'${text}`;
  return `"${text}"`;
}

export function csvDocument(rows: unknown[][]): string {
  return `\uFEFF${rows.map((row) => row.map(safeCsvCell).join(",")).join("\r\n")}`;
}
