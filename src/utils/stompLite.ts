type ConnectStompParams = {
  brokerURL: string
  token: string
  topic: string
  onConnect: () => void
  onMessage: (body: string) => void
  onError: () => void
}

type StompConnection = {
  isConnected: () => boolean
  publish: (destination: string, body: string) => void
  disconnect: () => void
}

const buildFrame = (command: string, headers: Record<string, string>, body = '') => {
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`)
  return `${command}\n${headerLines.join('\n')}\n\n${body}\u0000`
}

const parseFrames = (chunk: string): Array<{ command: string; headers: Record<string, string>; body: string }> => {
  return chunk
    .split('\u0000')
    .map((frame) => frame.trim())
    .filter(Boolean)
    .map((frame) => {
      const [head, ...rest] = frame.split('\n\n')
      const lines = head.split('\n')
      const command = lines[0] || ''
      const headers: Record<string, string> = {}
      lines.slice(1).forEach((line) => {
        const separatorIndex = line.indexOf(':')
        if (separatorIndex <= 0) return
        const key = line.slice(0, separatorIndex)
        const value = line.slice(separatorIndex + 1)
        headers[key] = value
      })
      const body = rest.join('\n\n')
      return { command, headers, body }
    })
}

export const connectStomp = ({
  brokerURL,
  token,
  topic,
  onConnect,
  onMessage,
  onError,
}: ConnectStompParams): StompConnection => {
  const socket = new WebSocket(brokerURL)
  let connected = false

  socket.onopen = () => {
    socket.send(
      buildFrame('CONNECT', {
        'accept-version': '1.2',
        'heart-beat': '10000,10000',
        Authorization: `Bearer ${token}`,
      }),
    )
  }

  socket.onmessage = (event) => {
    const payload = typeof event.data === 'string' ? event.data : ''
    const frames = parseFrames(payload)
    frames.forEach((frame) => {
      if (frame.command === 'CONNECTED') {
        connected = true
        socket.send(
          buildFrame('SUBSCRIBE', {
            id: `sub-${topic}`,
            destination: topic,
            ack: 'auto',
          }),
        )
        onConnect()
        return
      }
      if (frame.command === 'MESSAGE') {
        onMessage(frame.body)
        return
      }
      if (frame.command === 'ERROR') {
        connected = false
        onError()
      }
    })
  }

  socket.onerror = () => {
    connected = false
    onError()
  }

  socket.onclose = () => {
    connected = false
  }

  return {
    isConnected: () => connected && socket.readyState === WebSocket.OPEN,
    publish: (destination, body) => {
      if (!connected || socket.readyState !== WebSocket.OPEN) {
        throw new Error('not connected')
      }
      socket.send(
        buildFrame(
          'SEND',
          {
            destination,
            'content-type': 'application/json',
          },
          body,
        ),
      )
    },
    disconnect: () => {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(buildFrame('DISCONNECT', { receipt: 'disconnect-0' }))
        } catch {
          // noop
        }
      }
      socket.close()
    },
  }
}
