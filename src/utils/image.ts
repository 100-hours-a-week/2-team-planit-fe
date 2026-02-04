/**
 * 이미지 URL 처리.
 * - null/빈 문자열이면 defaultUrl 반환
 * - 백엔드에서 S3/CloudFront URL을 그대로 받으면 그대로 사용
 */
export function resolveImageUrl(
  url: string | null | undefined,
  defaultUrl: string
): string {
  if (url == null || url === '') {
    return defaultUrl
  }
  return objectKey.trim()
}

export function getImageUrl(objectKey?: string | null, fallback?: string) {
  const normalizedKey = normalizeObjectKey(objectKey)
  if (!normalizedKey) {
    return fallback ?? DEFAULT_FALLBACK
  }

  // 백엔드가 이미 CloudFront 등 절대 URL로 내려준 경우 그대로 사용
  if (isAbsoluteUrl(normalizedKey)) {
    return normalizedKey
  }

  if (!CLOUDFRONT_BASE_URL) {
    return fallback ?? DEFAULT_FALLBACK
  }

  const keyWithoutSlash = stripLeadingSlash(normalizedKey)
  return `${CLOUDFRONT_BASE_URL}/${keyWithoutSlash}`
}

export const resolveImageUrl = getImageUrl
