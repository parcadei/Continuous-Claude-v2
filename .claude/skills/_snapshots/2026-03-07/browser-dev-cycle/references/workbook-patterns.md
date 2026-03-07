# Workbook Platform Browser Patterns

## Overview

The Workbook is a Next.js 14+ App Router application deployed on Railway. It serves as an executive productivity platform with dashboard, meeting prep, and action tracking views.

## URL Patterns

| Environment | URL Pattern |
|-------------|-------------|
| Production | `https://<app>.railway.app` |
| Local dev | `http://localhost:3000` |

## Common UI Patterns

### Sidebar Navigation

The app uses a persistent left sidebar for navigation.

```
Workflow:
1. browser_snapshot -> find sidebar nav items
2. browser_click ref="<nav-item-ref>" -> triggers SPA route change
3. Wait 1-2s for route transition
4. browser_snapshot -> get new page content (refs reset after SPA nav)
```

**Known issue:** After SPA route change, ALL refs from previous snapshot are invalid. Always re-snapshot.

### Authentication

- Next.js authentication (NextAuth.js / Auth.js)
- Login page at `/login` or `/auth/signin`
- After login, redirects to dashboard
- Session cookie: `next-auth.session-token`

### Data Tables

Tables use client-side rendering with sort and pagination.

```
Pattern:
1. browser_snapshot -> find table headers and rows
2. browser_click ref="<header-ref>" -> sort by column
3. Wait 500ms
4. browser_snapshot -> verify sort order
5. For pagination: find "Next" button ref, click
```

### Modal Dialogs

Modals overlay the page and trap focus.

```
Pattern:
1. browser_click ref="<trigger-button>" -> opens modal
2. Wait 500ms for animation
3. browser_snapshot -> get modal content (new refs)
4. Fill form fields, click submit
5. browser_snapshot -> verify modal closed
```

### Theme System

Three themes (from spark-frontend-experiment):
- **Prism**: Glass morphism, workspace hue system
- **Meridian**: Editorial flat, serif typography
- **Catalyst**: Command-first, AI chat panel

Theme toggle is typically in header or settings.

### Command Palette

Keyboard-activated command interface (Catalyst theme pattern).

```
Pattern:
1. browser_press_key "Control+k" -> open command palette
2. browser_snapshot -> see command input
3. browser_type ref="<input-ref>" text="search term"
4. Wait 300ms for results
5. browser_click ref="<result-ref>" -> execute command
```

## Known Issues

| Issue | Impact | Workaround |
|-------|--------|-----------|
| Hydration mismatch on first load | Content may flash | Wait 2s after navigation |
| Auth redirect loop | Can't access pages | Clear cookies, login fresh |
| Dark mode CSS variables not loading | Wrong colors | Refresh page after theme switch |
| Table pagination resets on sort | Data position changes | Re-read table after sort |
| Modal backdrop click doesn't close | Modal stuck open | Click explicit close button |

## Viewport Breakpoints

From the theme design tokens:

| Breakpoint | Width | Layout Change |
|-----------|-------|---------------|
| Mobile | < 640px | Sidebar collapses, single column |
| Tablet | 640-1024px | Sidebar as overlay, 2 columns |
| Desktop | > 1024px | Full sidebar, multi-column |
| Wide | > 1920px | Max-width container |

## Performance Expectations

| Metric | Target | Notes |
|--------|--------|-------|
| FCP | < 1.8s | First Contentful Paint |
| LCP | < 2.5s | Largest Contentful Paint |
| CLS | < 0.1 | Cumulative Layout Shift |
| TTI | < 3.0s | Time to Interactive |

## Testing Checklist

- [ ] Login flow works
- [ ] Dashboard loads with data
- [ ] Sidebar navigation works (all routes)
- [ ] Tables sort and paginate
- [ ] Modals open, submit, close
- [ ] Theme switching works
- [ ] Responsive at 375px, 768px, 1920px
- [ ] Console has no errors
- [ ] Network requests succeed (no 4xx/5xx)
