export function fetchApi(
  input: RequestInfo | URL,
  locale: string,
  init?: RequestInit,
) {
  const headers = new Headers(init?.headers)

  if (!headers.has('x-fairsettle-locale')) {
    headers.set('x-fairsettle-locale', locale)
  }

  return fetch(input, {
    ...init,
    headers,
  })
}
