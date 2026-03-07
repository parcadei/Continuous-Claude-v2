import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchMCPServers } from '@/lib/api'
import type { MCPServersResponse, MCPServerInfo } from '@/types'

interface MCPServersDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// -- Helpers --

function StatColumn({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-mono font-bold tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

const TRANSPORT_COLORS: Record<string, string> = {
  stdio: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  http: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  sse: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
}

function ServerCard({ server }: { server: MCPServerInfo }) {
  const transportClass = TRANSPORT_COLORS[server.transport] || TRANSPORT_COLORS.stdio

  return (
    <div className={`rounded-lg border p-4 transition-colors ${
      server.enabled
        ? 'border-border bg-card hover:bg-muted/30'
        : 'border-border/50 bg-muted/10 opacity-60'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="font-medium text-sm truncate" title={server.name}>
          {server.name}
        </h4>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${transportClass}`}>
            {server.transport}
          </Badge>
          <div className={`h-2 w-2 rounded-full shrink-0 ${
            server.enabled ? 'bg-green-400' : 'bg-zinc-500'
          }`} />
        </div>
      </div>

      <div className="space-y-1.5">
        {server.command && (
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] text-muted-foreground uppercase shrink-0 w-14">cmd</span>
            <code className="text-xs font-mono text-muted-foreground truncate" title={server.command}>
              {server.command}
            </code>
          </div>
        )}

        {server.args.length > 0 && (
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] text-muted-foreground uppercase shrink-0 w-14">args</span>
            <code className="text-xs font-mono text-muted-foreground truncate" title={server.args.join(' ')}>
              {server.args.join(' ')}
            </code>
          </div>
        )}

        {server.url && (
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] text-muted-foreground uppercase shrink-0 w-14">url</span>
            <code className="text-xs font-mono text-muted-foreground truncate" title={server.url}>
              {server.url}
            </code>
          </div>
        )}

        {server.env_keys.length > 0 && (
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] text-muted-foreground uppercase shrink-0 w-14">env</span>
            <span className="text-xs text-muted-foreground truncate" title={server.env_keys.join(', ')}>
              {server.env_keys.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function MCPServersDetail({ open, onOpenChange }: MCPServersDetailProps) {
  const [data, setData] = useState<MCPServersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setLoading(true)
    setError(null)
    fetchMCPServers()
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load MCP server data'))
      .finally(() => setLoading(false))
  }, [open])

  const enabledServers = data?.servers.filter((s) => s.enabled) ?? []
  const disabledServers = data?.servers.filter((s) => !s.enabled) ?? []

  const transportCounts = data
    ? data.servers.reduce<Record<string, number>>((acc, s) => {
        acc[s.transport] = (acc[s.transport] || 0) + 1
        return acc
      }, {})
    : {}

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col" side="right">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-lg font-semibold">MCP Servers</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Model Context Protocol server configurations from settings.json
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">
            {/* Loading state */}
            {loading && (
              <div className="space-y-4">
                <div className="flex justify-around">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-20" />
                  ))}
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Data display */}
            {data && !loading && (
              <>
                {/* Stats row */}
                <div className="flex justify-around py-2">
                  <StatColumn value={data.total} label="Total" />
                  <StatColumn value={data.enabled_count} label="Enabled" />
                  <StatColumn value={data.disabled_count} label="Disabled" />
                  {Object.entries(transportCounts).map(([transport, count]) => (
                    <StatColumn key={transport} value={count} label={transport.toUpperCase()} />
                  ))}
                </div>

                {/* Enabled servers */}
                {enabledServers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-400" />
                      Enabled ({enabledServers.length})
                    </h3>
                    <div className="grid gap-3">
                      {enabledServers.map((server) => (
                        <ServerCard key={server.name} server={server} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Disabled servers */}
                {disabledServers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-zinc-500" />
                      Disabled ({disabledServers.length})
                    </h3>
                    <div className="grid gap-3">
                      {disabledServers.map((server) => (
                        <ServerCard key={server.name} server={server} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {data.total === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No MCP servers configured in settings.json
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
