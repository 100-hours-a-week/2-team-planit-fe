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
  return url
}
