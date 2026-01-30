import { useEffect } from 'react'

type Props = {
  message: string
  duration?: number
  onClose?: () => void
}

export default function Toast({ message, duration = 2200, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  return <div className="toast-message">{message}</div>
}
