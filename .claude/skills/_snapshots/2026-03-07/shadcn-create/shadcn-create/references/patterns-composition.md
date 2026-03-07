# Composition Patterns: Layouts & Dashboards

Patterns for composing shadcn/ui components into complete layouts.

---

## Dashboard Grid Patterns

### Auto-Fit KPI Grid

```tsx
function KPIGrid({ kpis }: { kpis: KPI[] }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} {...kpi} />
      ))}
    </div>
  );
}

function KPICard({ title, value, change, icon: Icon }: KPI) {
  const isPositive = change >= 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          <span className={isPositive ? "text-success" : "text-destructive"}>
            {isPositive ? "+" : ""}{change}%
          </span>
          {" "}from last period
        </p>
      </CardContent>
    </Card>
  );
}
```

### Mixed-Size Dashboard

```tsx
function DashboardGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Large chart spans 2 columns */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart />
        </CardContent>
      </Card>

      {/* Stacked small cards */}
      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2%</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Full-Width + 2-Column

```tsx
function AnalyticsDashboard() {
  return (
    <div className="space-y-4">
      {/* Full-width top section */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Revenue" value="$45,231" change={20.1} />
        <KPICard title="Orders" value="1,234" change={-5.2} />
        <KPICard title="Customers" value="573" change={12.5} />
        <KPICard title="Avg Order" value="$89" change={3.1} />
      </div>

      {/* Two-column main content */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader><CardTitle>Sales Chart</CardTitle></CardHeader>
          <CardContent><SalesChart /></CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
          <CardContent><RecentOrdersList /></CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## Content Density by Theme

| Theme | Padding | Gap | Card Padding | Best For |
|-------|---------|-----|--------------|----------|
| Nova | p-2 | gap-2 | p-3 | Dense admin, data-heavy |
| Vega | p-4 | gap-4 | p-6 | Standard apps, balanced |
| Maia | p-6 | gap-6 | p-8 | Consumer, marketing |
| Mira | p-2 | gap-3 | p-4 | Admin panels, information-dense |

### Theme-Aware Wrapper

```tsx
function DashboardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      "space-y-4",
      "[data-theme='nova'] &:space-y-2",
      "[data-theme='maia'] &:space-y-6"
    )}>
      {children}
    </div>
  );
}
```

---

## Sidebar + Content Layout

### Responsive Pattern

```tsx
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Logo />
          </div>
          <Navigation />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <Header />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Mobile Menu with Sheet

```tsx
function Header() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 items-center px-6">
            <Logo />
          </div>
          <Navigation />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      {/* Right side actions */}
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
```

### Collapsible Sidebar

```tsx
function CollapsibleSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300",
      collapsed ? "lg:w-16" : "lg:w-64"
    )}>
      <div className="flex grow flex-col border-r bg-background">
        <div className="flex h-16 items-center justify-between px-4">
          {!collapsed && <Logo />}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
        </div>
        <Navigation collapsed={collapsed} />
      </div>
    </aside>
  );
}
```

---

## Card Compositions

### Stats Card with Trend

```tsx
function StatsCard({ title, value, previousValue, icon: Icon }: StatsCardProps) {
  const change = ((value - previousValue) / previousValue) * 100;
  const isPositive = change >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        <div className="flex items-center text-xs text-muted-foreground">
          {isPositive ? (
            <TrendingUp className="mr-1 h-3 w-3 text-success" />
          ) : (
            <TrendingDown className="mr-1 h-3 w-3 text-destructive" />
          )}
          <span className={isPositive ? "text-success" : "text-destructive"}>
            {isPositive ? "+" : ""}{change.toFixed(1)}%
          </span>
          <span className="ml-1">from last period</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Action Card

```tsx
function ActionCard({ title, description, action, icon: Icon }: ActionCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={action}>
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
```

### Card with Tabs

```tsx
function TabbedCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Analytics</CardTitle>
          <Tabs defaultValue="week">
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs">Day</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tab content */}
      </CardContent>
    </Card>
  );
}
```

---

## Header Patterns

### Breadcrumb + Actions

```tsx
function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.href}>
              <BreadcrumbItem>
                {i === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {i < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="flex gap-2">{actions}</div>
      </div>
    </div>
  );
}
```

### Search + Filter Header

```tsx
function TableHeader({ onSearch, onFilter, onExport }: TableHeaderProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8 w-[250px]"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {/* Filter options */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Button variant="outline" size="sm" onClick={onExport}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
    </div>
  );
}
```

---

## Split Layouts

### Settings Page Layout

```tsx
function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-64 shrink-0">
        <nav className="flex flex-col gap-1">
          <NavLink href="/settings/profile">Profile</NavLink>
          <NavLink href="/settings/account">Account</NavLink>
          <NavLink href="/settings/billing">Billing</NavLink>
          <NavLink href="/settings/notifications">Notifications</NavLink>
        </nav>
      </aside>
      <main className="flex-1 max-w-2xl">{children}</main>
    </div>
  );
}
```

### Detail Page Layout

```tsx
function DetailLayout({ main, sidebar }: { main: React.ReactNode; sidebar: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <main className="flex-1">{main}</main>
      <aside className="lg:w-80 shrink-0">{sidebar}</aside>
    </div>
  );
}
```

---

## Layout Patterns Quick Reference

| Pattern | Grid Classes | When |
|---------|--------------|------|
| KPI row | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` | Top of dashboard |
| 2-column (wide left) | `lg:grid-cols-7` + `col-span-4` + `col-span-3` | Chart + list |
| 3-column equal | `lg:grid-cols-3` | Card grid |
| Sidebar + content | `flex` + `lg:pl-64` | App layout |
| Stacked cards | Nested `grid gap-4` | Secondary content |

---

*See also: references/patterns-edge.md for empty and loading states*
