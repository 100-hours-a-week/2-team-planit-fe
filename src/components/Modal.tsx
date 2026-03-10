import { type ReactNode } from 'react'

type Props = {
  open: boolean
  title?: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  danger?: boolean
}

export default function Modal({
  open,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
  danger = false,
}: Props) {
  if (!open) {
    return null
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {title && <h3>{title}</h3>}
        {message && <div className="modal-message">{message}</div>}
        <div className="modal-actions">
          {cancelLabel && onCancel ? (
            <button type="button" className="secondary-btn" onClick={onCancel}>
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            className={`primary-btn ${danger ? 'danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
