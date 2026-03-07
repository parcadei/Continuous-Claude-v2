# Composition Patterns: Edge Cases

Patterns for empty states, loading, errors, and overflow handling with shadcn/ui.

---

## Empty States

### Standard Template

```tsx
interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 mb-4 max-w-sm">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          <Plus className="mr-2 h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

### Context-Specific Variations

| Context | Icon | Title | Description | CTA |
|---------|------|-------|-------------|-----|
| No team members | Users | "No team members yet" | "Invite colleagues to collaborate" | "Invite member" |
| No data for period | CalendarX | "No data for this period" | "Try selecting a different date range" | "Adjust dates" |
| No integrations | Plug | "No integrations connected" | "Connect your tools to get started" | "Browse integrations" |
| Search no results | Search | "No results found" | "Try adjusting your search terms" | "Clear search" |
| First-time user | Sparkles | "Welcome!" | "Let's set up your first project" | "Get started" |
| No notifications | Bell | "All caught up" | "No new notifications" | None |

### In Table Context

```tsx
function DataTable({ data, columns }: DataTableProps) {
  return (
    <Table>
      <TableHeader>...</TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              <span className="text-muted-foreground">No results found.</span>
            </TableCell>
          </TableRow>
        ) : (
          data.map(row => <TableRow key={row.id}>...</TableRow>)
        )}
      </TableBody>
    </Table>
  );
}
```

### In Card Context

```tsx
function ActivityCard({ activities }: { activities: Activity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <ActivityList activities={activities} />
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Overflow Handling

### Text Truncation with Tooltip

```tsx
function TruncatedText({ text, maxWidth = 200 }: { text: string; maxWidth?: number }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="block truncate"
            style={{ maxWidth }}
          >
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs break-words">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### Number Abbreviation

```tsx
function formatNumber(num: number): string {
  if (Math.abs(num) >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

function AbbreviatedNumber({ value }: { value: number }) {
  return (
    <span title={value.toLocaleString()}>
      {formatNumber(value)}
    </span>
  );
}
```

### Long Validation Messages

```tsx
function LongFormMessage({ message }: { message: string }) {
  if (message.length <= 80) {
    return <FormMessage />;
  }

  return (
    <Collapsible>
      <p className="text-sm text-destructive">
        {message.slice(0, 60)}...
        <CollapsibleTrigger className="ml-1 underline text-xs">
          more
        </CollapsibleTrigger>
      </p>
      <CollapsibleContent>
        <p className="text-sm text-destructive mt-1">{message}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

### Responsive Table Overflow

```tsx
function ResponsiveTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full overflow-auto">
      <Table className="min-w-[600px]">
        {children}
      </Table>
    </div>
  );
}
```

---

## Loading States

### Skeleton Patterns by Component

| Component | Skeleton |
|-----------|----------|
| Card | `<Skeleton className="h-32 w-full rounded-lg" />` |
| Table row | Multiple `<Skeleton className="h-4 w-full" />` in cells |
| Avatar | `<Skeleton className="h-10 w-10 rounded-full" />` |
| Button | `<Skeleton className="h-10 w-24 rounded-md" />` |
| Text line | `<Skeleton className="h-4 w-3/4" />` |
| Badge | `<Skeleton className="h-5 w-16 rounded-full" />` |

### KPI Card Skeleton

```tsx
function KPICardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}
```

### Table Skeleton

```tsx
function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="h-4 w-20" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            {Array.from({ length: columns }).map((_, j) => (
              <TableCell key={j}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Progressive Dashboard Loading

```tsx
function DashboardLoading() {
  return (
    <div className="space-y-4">
      {/* KPI row skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>

      {/* Chart skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Loading Button State

```tsx
function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" disabled={isPending}>
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        "Save changes"
      )}
    </Button>
  );
}
```

### Inline Loading

```tsx
function InlineLoader() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
```

---

## Error Boundaries

### Error Fallback Component

```tsx
interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold">Something went wrong</h3>
      <p className="text-muted-foreground mt-1 mb-4 max-w-sm">
        {error.message || "An unexpected error occurred"}
      </p>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}
```

### Inline Error State

```tsx
function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

---

## Confirmation Patterns

### Delete Confirmation

```tsx
function DeleteConfirmation({ onConfirm, itemName }: { onConfirm: () => void; itemName: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the {itemName.toLowerCase()}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Edge Case Quick Reference

| Scenario | Pattern | Components |
|----------|---------|------------|
| No data | Empty state | Custom component with icon, text, CTA |
| Long text | Truncate + tooltip | Tooltip, truncate class |
| Large numbers | Abbreviate | formatNumber utility |
| Loading list | Skeleton rows | Skeleton, Table |
| Loading card | Skeleton card | Skeleton, Card |
| Loading button | Spinner + text | Loader2, Button disabled |
| API error | Toast | Sonner/Toast |
| Page error | Error boundary | Custom fallback |
| Delete confirm | Alert dialog | AlertDialog |

---

*See also: references/patterns-forms.md for validation error patterns*
