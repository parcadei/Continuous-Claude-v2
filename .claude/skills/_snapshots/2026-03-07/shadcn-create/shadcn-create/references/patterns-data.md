# Composition Patterns: Data Display

Patterns for tables, charts, and data-heavy interfaces with shadcn/ui.

---

## Expandable Table Rows

### Basic Pattern with Collapsible

```tsx
function ExpandableTable({ data }: { data: RowData[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]"></TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <ExpandableRow key={row.id} row={row} />
        ))}
      </TableBody>
    </Table>
  );
}

function ExpandableRow({ row }: { row: RowData }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-90"
            )} />
          </Button>
        </TableCell>
        <TableCell>{row.name}</TableCell>
        <TableCell><Badge>{row.status}</Badge></TableCell>
        <TableCell>
          <DropdownMenu>...</DropdownMenu>
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow>
          <TableCell colSpan={4} className="bg-muted/50 p-4">
            <ExpandedContent data={row.details} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
```

### Permission Matrix in Expanded Row

```tsx
function PermissionMatrix({ userId, permissions, onToggle }: {
  userId: string;
  permissions: Permission[];
  onToggle: (permId: string, checked: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
      {permissions.map((perm) => (
        <div key={perm.id} className="flex items-center gap-2">
          <Checkbox
            id={`${userId}-${perm.id}`}
            checked={perm.granted}
            onCheckedChange={(checked) => onToggle(perm.id, !!checked)}
          />
          <Label htmlFor={`${userId}-${perm.id}`} className="text-sm">
            {perm.name}
          </Label>
        </div>
      ))}
    </div>
  );
}
```

---

## Bulk Selection

### Selection State

```tsx
function useTableSelection<T extends { id: string }>(data: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map(d => d.id)));
    }
  };

  const clear = () => setSelected(new Set());

  const isSelected = (id: string) => selected.has(id);
  const isAllSelected = selected.size === data.length && data.length > 0;
  const isPartiallySelected = selected.size > 0 && selected.size < data.length;

  return { selected, toggle, toggleAll, clear, isSelected, isAllSelected, isPartiallySelected };
}
```

### Header Checkbox

```tsx
<TableHead className="w-[40px]">
  <Checkbox
    checked={selection.isAllSelected}
    indeterminate={selection.isPartiallySelected}
    onCheckedChange={selection.toggleAll}
    aria-label="Select all"
  />
</TableHead>
```

### Bulk Actions Bar

```tsx
function BulkActionsBar({ count, onDelete, onExport, onClear }: {
  count: number;
  onDelete: () => void;
  onExport: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between p-2 bg-muted rounded-md mb-4">
      <span className="text-sm text-muted-foreground">
        {count} item{count !== 1 ? 's' : ''} selected
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash className="h-4 w-4 mr-2" />
          Delete
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear selection
        </Button>
      </div>
    </div>
  );
}
```

---

## Chart + Shadcn Color Coordination

### Color Utilities

```tsx
const chartColors = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  muted: "hsl(var(--muted))",
  accent: "hsl(var(--accent))",
  destructive: "hsl(var(--destructive))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  info: "hsl(var(--info))",
};

const chartColorScale = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.accent,
  chartColors.muted,
];
```

### Bar Chart with Theme Colors

```tsx
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

function RevenueChart({ data }: { data: ChartData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Bar dataKey="revenue" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
            <Bar dataKey="target" fill={chartColors.muted} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### Pie Chart with Legend

```tsx
import { PieChart, Pie, Cell, Legend } from "recharts";

function DistributionChart({ data }: { data: PieData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%">
          {data.map((_, i) => (
            <Cell key={i} fill={chartColorScale[i % chartColorScale.length]} />
          ))}
        </Pie>
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

---

## Filter Bar Pattern

### Complete Filter Bar

```tsx
interface Filters {
  status: string;
  dateRange: DateRange | undefined;
  search: string;
}

function FilterBar({ filters, onChange }: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const hasFilters = filters.status !== 'all' || filters.search || filters.dateRange;

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      <Select
        value={filters.status}
        onValueChange={(status) => onChange({ ...filters, status })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>

      <DatePickerWithRange
        date={filters.dateRange}
        onSelect={(dateRange) => onChange({ ...filters, dateRange })}
      />

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-8 w-[200px]"
        />
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ status: 'all', dateRange: undefined, search: '' })}
        >
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
```

### Filter Affecting Multiple Components

```tsx
function DashboardWithFilters() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const filteredData = useFilteredData(data, filters);

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} onChange={setFilters} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart data={filteredData.chartData} />
        <DataTable data={filteredData.tableData} />
      </div>
    </div>
  );
}
```

---

## TanStack Table Integration

### Basic Setup

```tsx
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";

function DataTableDemo({ data, columns }: { data: User[]; columns: ColumnDef<User>[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination table={table} />
    </div>
  );
}
```

### Sortable Column Header

```tsx
function SortableHeader({ column, children }: { column: Column<any>; children: React.ReactNode }) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {children}
      {column.getIsSorted() === "asc" ? (
        <ChevronUp className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === "desc" ? (
        <ChevronDown className="ml-2 h-4 w-4" />
      ) : (
        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}
```

---

## Data Patterns Quick Reference

| Pattern | When | Key Components |
|---------|------|----------------|
| Expandable rows | Nested details, permissions | Table + Collapsible |
| Bulk selection | Multi-item actions | Checkbox + Selection bar |
| Filter bar | Data slicing | Select, DatePicker, Input |
| Sortable table | Ordered data | TanStack Table |
| Chart + Table | Dashboard analytics | Card, Chart, Table |

---

*See also: references/patterns-composition.md for dashboard layouts*
