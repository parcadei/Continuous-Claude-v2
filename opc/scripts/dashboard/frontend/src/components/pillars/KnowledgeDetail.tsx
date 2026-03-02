import { useEffect, useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { fetchKnowledgeTree } from '@/lib/api'
import type { KnowledgeTree } from '@/types'
import { cn } from '@/lib/utils'

interface KnowledgeDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TreeNodeProps {
  label: string
  value: unknown
  depth: number
  expanded: boolean
  onToggle: (path: string) => void
  path: string
  allExpanded: boolean
}

function getValueType(value: unknown): 'object' | 'array' | 'primitive' {
  if (Array.isArray(value)) return 'array'
  if (value !== null && typeof value === 'object') return 'object'
  return 'primitive'
}

function TreeNode({
  label,
  value,
  depth,
  expanded,
  onToggle,
  path,
  allExpanded,
}: TreeNodeProps) {
  const valueType = getValueType(value)
  const isExpandable = valueType !== 'primitive'
  const isExpanded = allExpanded || expanded

  const handleClick = () => {
    if (isExpandable) {
      onToggle(path)
    }
  }

  const renderValue = () => {
    if (valueType === 'primitive') {
      const displayValue = value === null ? 'null' : String(value)
      return (
        <span className="text-muted-foreground ml-2 text-sm">
          {typeof value === 'string' ? `"${displayValue}"` : displayValue}
        </span>
      )
    }
    if (valueType === 'array') {
      return (
        <span className="text-muted-foreground ml-2 text-xs">
          [{(value as unknown[]).length}]
        </span>
      )
    }
    return (
      <span className="text-muted-foreground ml-2 text-xs">
        {'{...}'}
      </span>
    )
  }

  const renderChildren = () => {
    if (!isExpanded || valueType === 'primitive') return null

    if (valueType === 'array') {
      return (value as unknown[]).map((item, index) => (
        <TreeNode
          key={`${path}.${index}`}
          label={`[${index}]`}
          value={item}
          depth={depth + 1}
          expanded={false}
          onToggle={onToggle}
          path={`${path}.${index}`}
          allExpanded={allExpanded}
        />
      ))
    }

    return Object.entries(value as Record<string, unknown>).map(([key, val]) => (
      <TreeNode
        key={`${path}.${key}`}
        label={key}
        value={val}
        depth={depth + 1}
        expanded={false}
        onToggle={onToggle}
        path={`${path}.${key}`}
        allExpanded={allExpanded}
      />
    ))
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center py-1 rounded hover:bg-muted/50 cursor-pointer transition-colors',
          depth > 0 && 'ml-4'
        )}
        style={{ paddingLeft: `${depth * 16}px` }}
        onClick={handleClick}
      >
        {isExpandable ? (
          <svg
            className={cn(
              'h-4 w-4 mr-1 text-muted-foreground transition-transform',
              isExpanded && 'rotate-90'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        ) : (
          <span className="w-4 mr-1" />
        )}
        {valueType === 'object' && (
          <svg className="h-4 w-4 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        )}
        {valueType === 'array' && (
          <svg className="h-4 w-4 mr-1.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        )}
        {valueType === 'primitive' && (
          <svg className="h-4 w-4 mr-1.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        )}
        <span className="font-medium text-sm">{label}</span>
        {renderValue()}
      </div>
      {renderChildren()}
    </div>
  )
}

export function KnowledgeDetail({ open, onOpenChange }: KnowledgeDetailProps) {
  const [tree, setTree] = useState<KnowledgeTree | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [allExpanded, setAllExpanded] = useState(false)

  const loadTree = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchKnowledgeTree()
      setTree(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge tree')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadTree()
    }
  }, [open, loadTree])

  const handleToggle = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleExpandAll = () => {
    setAllExpanded(true)
  }

  const handleCollapseAll = () => {
    setAllExpanded(false)
    setExpandedPaths(new Set())
  }

  const isEmpty = !tree || Object.keys(tree).length === 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Knowledge Tree
          </SheetTitle>
          <SheetDescription>
            Project structure and configuration from .claude/knowledge-tree.json
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Loading...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Failed to load knowledge tree</span>
              </div>
              <p className="mt-1 text-xs opacity-80">{error}</p>
            </div>
          )}

          {!isLoading && !error && isEmpty && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg
                className="h-12 w-12 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-3 font-medium">No Knowledge Tree</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a .knowledge/tree.yml file to see project structure here.
              </p>
            </div>
          )}

          {!isLoading && !error && !isEmpty && (
            <>
              {/* Summary header */}
              <div className="mb-4 rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overview</span>
                  <span className="text-xs text-muted-foreground font-mono">{Object.keys(tree).length} top-level entries</span>
                </div>
                {/* Metadata fields */}
                {(() => {
                  const META_KEYS = ['project_name', 'version', 'last_updated', 'name', 'updated_at', 'created_at', 'description']
                  const metaEntries = META_KEYS
                    .filter((k) => k in tree && typeof (tree as Record<string, unknown>)[k] !== 'object')
                    .map((k) => [k, String((tree as Record<string, unknown>)[k])] as [string, string])

                  return metaEntries.length > 0 ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {metaEntries.map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1 text-xs">
                          <span className="text-muted-foreground">{k}:</span>
                          <span className="font-medium truncate max-w-[120px]">{v}</span>
                        </div>
                      ))}
                    </div>
                  ) : null
                })()}
                {/* Top-level key badges */}
                <div className="flex flex-wrap gap-1">
                  {Object.keys(tree).map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/50"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExpandAll}
                  className="text-xs"
                >
                  <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCollapseAll}
                  className="text-xs"
                >
                  <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Collapse All
                </Button>
              </div>

              <div className="rounded-lg border bg-card p-3">
                {Object.entries(tree).map(([key, value]) => (
                  <TreeNode
                    key={key}
                    label={key}
                    value={value}
                    depth={0}
                    expanded={expandedPaths.has(key)}
                    onToggle={handleToggle}
                    path={key}
                    allExpanded={allExpanded}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
