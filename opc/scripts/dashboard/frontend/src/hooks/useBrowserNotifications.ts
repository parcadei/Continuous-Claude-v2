import { useCallback, useState, useSyncExternalStore } from 'react'

function getNotificationPermission(): NotificationPermission {
  if ('Notification' in window) {
    return Notification.permission
  }
  return 'default'
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function subscribeToPermissionChanges(_callback: () => void): () => void {
  // Permission changes require user interaction, so we don't need
  // to subscribe to anything - the component will re-render when
  // requestPermission updates state
  return () => {}
}

export function useBrowserNotifications() {
  const initialPermission = useSyncExternalStore(
    subscribeToPermissionChanges,
    getNotificationPermission,
    () => 'default' as NotificationPermission
  )
  const [permission, setPermission] = useState<NotificationPermission>(initialPermission)

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications')
      return false
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }, [])

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') return null
    if (document.hasFocus()) return null // Don't notify if tab is focused

    const notification = new Notification(title, {
      ...options,
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    return notification
  }, [permission])

  const notifyOffline = useCallback((pillar: string) => {
    sendNotification(`${pillar} is OFFLINE`, {
      body: 'A service in the dashboard has gone offline.',
      tag: `offline-${pillar}`, // Prevents duplicate notifications
      requireInteraction: true,
    })
  }, [sendNotification])

  return {
    permission,
    isSupported: 'Notification' in window,
    requestPermission,
    sendNotification,
    notifyOffline,
  }
}
