export function formatRelativeTime(dateString: string): string {
  const timestamp = Date.parse(dateString)
  if (Number.isNaN(timestamp)) {
    return ''
  }

  const diffMinutes = Math.max(Math.floor((Date.now() - timestamp) / 60000), 0)
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}시간 전`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}일 전`
}
