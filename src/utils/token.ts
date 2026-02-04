type JwtPayload = {
  exp?: number | null
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const [, payload] = token.split('.')
  if (!payload) {
    return null
  }

  const normalized = payload
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  )

  try {
    const decoded =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(padded)
        : ''
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

export function isTokenExpired(token: string | null) {
  if (!token) {
    return true
  }

  const payload = decodeJwtPayload(token)
  if (!payload?.exp) {
    return true
  }

  return payload.exp * 1000 <= Date.now()
}
