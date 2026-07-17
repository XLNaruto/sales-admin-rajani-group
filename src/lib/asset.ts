export function asset(path: string) {
  // BASE_URL always ends with a trailing slash ("/" or "/sales-panel/").
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}