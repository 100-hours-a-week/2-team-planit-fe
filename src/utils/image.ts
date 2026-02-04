const CLOUDFRONT_BASE_URL = (import.meta.env.VITE_CLOUDFRONT_URL ?? '').replace(/\/+$/, '')
const DEFAULT_FALLBACK = '/default-avatar.png'

const stripLeadingSlash = (value: string) => value.replace(/^\/+/, '')

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value)

const normalizeObjectKey = (objectKey?: string | null) => {
  if (!objectKey) {
    return ''
  }
  return objectKey.trim()
}

export function getImageUrl(objectKey?: string | null, fallback?: string) {
  const normalizedKey = normalizeObjectKey(objectKey)
  if (!normalizedKey) {
    return fallback ?? DEFAULT_FALLBACK
  }

  if (isAbsoluteUrl(normalizedKey)) {
    if (import.meta.env.MODE !== 'production') {
      console.warn('Invalid image src, forcing CloudFront fallback:', normalizedKey)
    }
    return fallback ?? DEFAULT_FALLBACK
  }

  if (!CLOUDFRONT_BASE_URL) {
    return fallback ?? DEFAULT_FALLBACK
  }

  const keyWithoutSlash = stripLeadingSlash(normalizedKey)
  return `${CLOUDFRONT_BASE_URL}/${keyWithoutSlash}`
}

export const resolveImageUrl = getImageUrl
