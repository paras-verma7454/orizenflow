// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createApiProxy(path: string = ""): any {
  return new Proxy(
    {},
    {
      get(_, key: string) {
        if (key === "$get") {
          return async (opts?: { param?: Record<string, string>; query?: Record<string, string> }) =>
            apiFetch(resolvePath(path, opts?.param) + toQueryString(opts?.query))
        }
        if (key === "$post") {
          return async (opts?: { param?: Record<string, string>; json?: unknown }) =>
            apiFetch(resolvePath(path, opts?.param), {
              method: "POST",
              body: opts?.json ? JSON.stringify(opts.json) : undefined,
            })
        }
        if (key === "$put") {
          return async (opts?: { param?: Record<string, string>; json?: unknown }) =>
            apiFetch(resolvePath(path, opts?.param), {
              method: "PUT",
              body: opts?.json ? JSON.stringify(opts.json) : undefined,
            })
        }
        if (key === "$patch") {
          return async (opts?: { param?: Record<string, string>; json?: unknown }) =>
            apiFetch(resolvePath(path, opts?.param), {
              method: "PATCH",
              body: opts?.json ? JSON.stringify(opts.json) : undefined,
            })
        }
        if (key === "$delete") {
          return async (opts?: { param?: Record<string, string> }) =>
            apiFetch(resolvePath(path, opts?.param), { method: "DELETE" })
        }
        return createApiProxy(`${path}/${key}`)
      },
    },
  ) as any
}

function resolvePath(path: string, param?: Record<string, string>): string {
  if (!param) return path
  let resolved = path
  for (const [key, value] of Object.entries(param)) {
    resolved = resolved.replace(`/:${key}`, `/${encodeURIComponent(value)}`)
  }
  return resolved
}

function toQueryString(query?: Record<string, string>): string {
  if (!query) return ""
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, value)
  }
  const str = params.toString()
  return str ? `?${str}` : ""
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Request failed" } }))
    throw error
  }
  return res.json()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiClient: any = createApiProxy("/api")
