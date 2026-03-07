# Troubleshooting Reference

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Components unstyled | CSS variables missing | Run `npx shadcn@latest init` |
| Wrong radius | --radius not set | Add to :root in globals.css |
| Dark mode broken | Theme class missing | Add `dark` class to html element |
| Import errors | Wrong path alias | Check tsconfig paths for `@/` |
| cn() undefined | Utils missing | Run init or add manually |
| MCP tools unavailable | Server not configured | Run `npx shadcn registry:mcp` |
| Browser automation fails | Claude in Chrome not available | Use WebFetch fallback or direct CLI |
| Block dependencies missing | Incomplete install | Reinstall with `--overwrite` flag |
| TypeScript errors | Missing types | Install @types for dependencies |

## React 19 + Static Export Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Radix Dialog.Close not working | React 19 event timing in static export | Use plain button with onClick |
| Modal won't close | Same timing issue | Add onCloseClick prop pattern |
| Hydration errors | Server/client mismatch | Use `suppressHydrationWarning` or dynamic imports |

### Dialog Close Fix (React 19)

```tsx
// DON'T: Radix primitive (may fail in React 19 static export)
<DialogPrimitive.Close asChild>
  <Button><X className="h-4 w-4" /></Button>
</DialogPrimitive.Close>

// DO: Plain button with handler
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  onCloseClick?: () => void;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, onCloseClick, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content ref={ref} className={cn("...", className)} {...props}>
      {children}
      <button
        onClick={onCloseClick}
        className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    </DialogPrimitive.Content>
  </DialogPortal>
));

// Usage
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent onCloseClick={() => setOpen(false)}>
    {/* content */}
  </DialogContent>
</Dialog>
```
