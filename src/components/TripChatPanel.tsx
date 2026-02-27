import { useMemo, useState } from 'react'
import type { TripChatMessage } from '../api/chat'
import {
  buildSenderNameCache,
  buildSenderProfileCache,
  resolveSenderDisplayName,
  resolveSenderProfileImageUrl,
} from '../utils/chatPresentation'

type TripChatPanelProps = {
  messages: TripChatMessage[]
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

function ChatMessageList({ messages, loading }: { messages: TripChatMessage[]; loading: boolean }) {
  const nicknameCache = useMemo(() => buildSenderNameCache(messages), [messages])
  const profileCache = useMemo(() => buildSenderProfileCache(messages), [messages])

  if (loading) {
    return <p className="chat-empty">메시지를 불러오는 중입니다...</p>
  }
  if (messages.length === 0) {
    return <p className="chat-empty">아직 메시지가 없습니다.</p>
  }

  return (
    <ul className="chat-message-list">
      {messages.map((message, index) => {
        const displayName = resolveSenderDisplayName(message, nicknameCache)
        const profileImageUrl = resolveSenderProfileImageUrl(message, profileCache)
        const avatarFallback = displayName === '알 수 없음' ? '?' : displayName.slice(0, 1)

        return (
          <li key={`${message.messageId ?? 'msg'}-${index}`} className="chat-message-item">
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

  return (
    <div className="chat-input-row">
      <input
        type="text"
        value={content}
        placeholder="메시지를 입력하세요"
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
        }}
      />
      <button type="button" className="pill-button" disabled={!canSend} onClick={submit}>
        전송
      </button>
    </div>
  )
}

export default function TripChatPanel({
  messages,
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

      <ChatMessageList messages={messages} loading={loading} />
      <ChatInput disabled={!isConnected} onSend={onSend} />
    </section>
  )
}
