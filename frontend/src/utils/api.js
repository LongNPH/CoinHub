const BASE = import.meta.env.VITE_API_URL || ''

async function request(method, url, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(BASE + url, opts)
  if (res.status === 204) return null

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error')
  return data
}

export const get  = (url)        => request('GET',    url)
export const post = (url, body)  => request('POST',   url, body)
export const del  = (url)        => request('DELETE', url)