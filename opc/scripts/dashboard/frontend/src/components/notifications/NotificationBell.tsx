import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotificationStore } from '@/stores/notificationStore'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  className?: string
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return date.toLocaleDateString()
}

const typeConfig = {
  info: {
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    colorClass: 'text-blue-500',
  },
  warning: {
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    colorClass: 'text-yellow-500',
  },
  error: {
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    colorClass: 'text-red-500',
  },
  success: {
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    colorClass: 'text-green-500',
  },
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore()

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-10 w-10">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="sr-only">Notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault()
                  markAllRead()
                }}
              >
                Mark all read
              </Button>
            )}
          </div>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              {notifications.map((notification) => {
                const config = typeConfig[notification.type]
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'flex cursor-pointer flex-col items-start gap-1 px-3 py-2',
                      !notification.read && 'bg-accent/50',
                      config.colorClass
                    )}
                    onClick={() => {
                      if (!notification.read) {
                        markRead(notification.id)
                      }
                    }}
                  >
                    <div className="flex w-full items-start gap-2">
                      <span className={cn('mt-0.5 shrink-0', config.colorClass)}>
                        {config.icon}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {formatRelativeTime(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </ScrollArea>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
