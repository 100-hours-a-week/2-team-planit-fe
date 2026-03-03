import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { TripChatMessage } from '../api/chat'
import {
  buildSenderNameCache,
  buildSenderProfileCache,
  resolveSenderDisplayName,
  resolveSenderProfileImageUrl,
} from '../utils/chatPresentation'
import { isImeComposing, isSubmitEnter } from '../utils/chatInputGuards'

type TripChatPanelProps = {
  messages: TripChatMessage[]
  currentUserId?: number
  loading: boolean
  errorMessage: string
  connectionErrorMessage: string
  isConnected: boolean
  onSend: (content: string) => void
}

const formatMessageTime = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const toSortableTime = (value?: string) => {
  if (!value) return Number.MAX_SAFE_INTEGER
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time
}

function ChatMessageList({
  messages,
  currentUserId,
  loading,
}: {
  messages: TripChatMessage[]
  currentUserId?: number
  loading: boolean
}) {
  const nicknameCache = useMemo(() => buildSenderNameCache(messages), [messages])
  const profileCache = useMemo(() => buildSenderProfileCache(messages), [messages])
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      if (typeof a.seq === 'number' && typeof b.seq === 'number') {
        return a.seq - b.seq
      }
      const timeDiff = toSortableTime(a.createdAt) - toSortableTime(b.createdAt)
      if (timeDiff !== 0) return timeDiff
      const leftId = typeof a.messageId === 'number' ? a.messageId : Number.MAX_SAFE_INTEGER
      const rightId = typeof b.messageId === 'number' ? b.messageId : Number.MAX_SAFE_INTEGER
      return leftId - rightId
    })
  }, [messages])

  if (loading) {
    return <p className="chat-empty">메시지를 불러오는 중입니다...</p>
  }
  if (messages.length === 0) {
    return <p className="chat-empty">아직 메시지가 없습니다.</p>
  }

  return (
    <ul className="chat-message-list">
      {sortedMessages.map((message, index) => {
        const displayName = resolveSenderDisplayName(message, nicknameCache)
        const profileImageUrl = resolveSenderProfileImageUrl(message, profileCache)
        const avatarFallback = displayName === '알 수 없음' ? '?' : displayName.slice(0, 1)
        const isMine = Boolean(currentUserId && message.senderUserId === currentUserId)

        return (
          <li
            key={`${message.messageId ?? 'msg'}-${index}`}
            className={`chat-message-row ${isMine ? 'mine' : 'other'}`}
          >
            <div className={`chat-message-item ${isMine ? 'mine' : 'other'}`}>
              <div className="chat-message-meta">
                <div className="chat-sender">
                  {profileImageUrl ? (
                    <img className="chat-avatar" src={profileImageUrl} alt={displayName} />
                  ) : (
                    <span className="chat-avatar fallback" aria-hidden="true">
                      {avatarFallback}
                    </span>
                  )}
                  <strong>{displayName}</strong>
                </div>
                <span>{formatMessageTime(message.createdAt)}</span>
              </div>
              <p>{message.content}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function ChatInput({ disabled, onSend }: { disabled: boolean; onSend: (content: string) => void }) {
  const [content, setContent] = useState('')
  const canSend = useMemo(() => !disabled && content.trim().length > 0, [content, disabled])

  const submit = () => {
    if (!canSend) return
    onSend(content.trim())
    setContent('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isSubmitEnter(event.key, event.shiftKey)) return
    const nativeEvent = event.nativeEvent as { isComposing?: boolean; keyCode?: number }
    if (isImeComposing(nativeEvent)) return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  return (
    <form className="chat-input-row" onSubmit={handleSubmit}>
      <textarea
        value={content}
        placeholder="메시지를 입력하세요"
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
      />
      <button type="submit" className="pill-button" disabled={!canSend}>
        전송
      </button>
    </form>
  )
}

export default function TripChatPanel({
  messages,
  currentUserId,
  loading,
  errorMessage,
  connectionErrorMessage,
  isConnected,
  onSend,
}: TripChatPanelProps) {
  return (
    <section className="chat-panel">
      <header className="chat-panel-header">
        <h3>채팅</h3>
        <span className={`chat-connection ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '연결됨' : '연결 안됨'}
        </span>
      </header>

      {errorMessage && <p className="helper warning">{errorMessage}</p>}
      {connectionErrorMessage && <p className="helper warning">{connectionErrorMessage}</p>}

      <ChatMessageList messages={messages} currentUserId={currentUserId} loading={loading} />
      <ChatInput disabled={!isConnected} onSend={onSend} />
    </section>
  )
}
