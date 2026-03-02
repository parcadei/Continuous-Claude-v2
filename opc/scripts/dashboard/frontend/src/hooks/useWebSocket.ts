import { useEffect, useRef, useState, useCallback } from 'react'
import type {
  HealthResponse,
  ActivityEvent,
  NotificationEvent,
  WebSocketMessage,
} from '@/types'

export interface UseWebSocketOptions {
  url?: string
  project?: string
  onHealthUpdate?: (data: HealthResponse) => void
  onActivity?: (data: ActivityEvent) => void
  onNotification?: (data: NotificationEvent) => void
}

export interface UseWebSocketReturn {
  isConnected: boolean
  reconnectAttempts: number
  send: (message: object) => void
}

const MIN_RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 30000

function getReconnectDelay(attempt: number): number {
  const delay = MIN_RECONNECT_DELAY * Math.pow(2, attempt)
  return Math.min(delay, MAX_RECONNECT_DELAY)
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url,
    project,
    onHealthUpdate,
    onActivity,
    onNotification,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const callbacksRef = useRef({ onHealthUpdate, onActivity, onNotification })

  // Update callbacks ref in effect to avoid updating during render
  useEffect(() => {
    callbacksRef.current = { onHealthUpdate, onActivity, onNotification }
  })

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  useEffect(() => {
    const getWsUrl = (): string => {
      if (url) return url
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${protocol}//${window.location.host}/ws`
    }

    const connect = () => {
      const wsUrl = getWsUrl()
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        setReconnectAttempts(0)

        if (project) {
          const subscribeMsg: WebSocketMessage = {
            action: 'subscribe',
            project,
          }
          ws.send(JSON.stringify(subscribeMsg))
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        wsRef.current = null

        const delay = getReconnectDelay(reconnectAttemptsRef.current)
        reconnectAttemptsRef.current += 1
        setReconnectAttempts(reconnectAttemptsRef.current)

        reconnectTimeoutRef.current = window.setTimeout(connect, delay)
      }

      ws.onerror = () => {
        setIsConnected(false)
      }

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'health_update':
              // Pass raw event through — supports both full-response
              // ({ pillars: {...} }) and single-pillar ({ pillar, status, count }) shapes
              callbacksRef.current.onHealthUpdate?.(data)
              break
            case 'activity':
              callbacksRef.current.onActivity?.(data as ActivityEvent)
              break
            case 'notification':
              callbacksRef.current.onNotification?.(data as NotificationEvent)
              break
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [url, project])

  return {
    isConnected,
    reconnectAttempts,
    send,
  }
}
