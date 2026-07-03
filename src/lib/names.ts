export function toDisplayName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeName(name: string) {
  return toDisplayName(name).normalize("NFKC").toLocaleLowerCase("en-US");
}
