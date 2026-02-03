const base64UrlDecode = (value: string) => {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, '=')
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
  } catch {
    return ''
  }
}

export function isTokenExpired(token?: string | null) {
  if (!token) {
    return true
  }
  const parts = token.split('.')
  if (parts.length < 2) {
    return true
  }
  const payload = base64UrlDecode(parts[1])
  if (!payload) {
    return true
  }
  try {
    const parsed = JSON.parse(payload)
    if (typeof parsed.exp !== 'number') {
      return false
    }
    return parsed.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}
