/**
 * 이미지 URL 처리.
 * - null/빈 문자열이면 defaultUrl 반환
 * - 백엔드에서 S3/CloudFront 절대 URL이면 그대로 사용
 * - S3 키만 오면 CLOUDFRONT_BASE_URL이 있을 때만 조합, 없으면 defaultUrl
 */

const CLOUDFRONT_BASE_URL =
  (import.meta.env.VITE_CLOUDFRONT_BASE_URL as string)?.trim() || ''

function isAbsoluteUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

function normalizeObjectKey(
  key: string | null | undefined
): string | null {
  if (key == null || typeof key !== 'string') return null
  const t = key.trim()
  return t === '' ? null : t
}

function stripLeadingSlash(s: string): string {
  return s.replace(/^\/+/, '')
}

export function resolveImageUrl(
  url: string | null | undefined,
  defaultUrl: string
): string {
  const normalized = normalizeObjectKey(url)
  if (!normalized) {
    return defaultUrl
  }

  if (isAbsoluteUrl(normalized)) {
    return normalized
  }

  if (!CLOUDFRONT_BASE_URL) {
    return defaultUrl
  }

  return `${CLOUDFRONT_BASE_URL}/${stripLeadingSlash(normalized)}`
}
