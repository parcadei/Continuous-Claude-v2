# Midnight Executive Components

Interactive UI components for presentations using **Alpine.js** + Shadcn-inspired styling.

## Quick Start

Add to your presentation's `<head>`:

```html
<!-- Alpine.js -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

<!-- Optional: Collapse plugin for smooth expand/collapse -->
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>
```

## Components

| Component | Use Case | Alpine Attributes |
|-----------|----------|-------------------|
| **Tabs** | Switch between views | `x-data="{ tab: 'name' }"` |
| **Accordion** | Expandable sections | `x-data="{ open: null }"` |
| **Collapsible** | Show/hide details | `x-data="{ open: false }"` |
| **Modal** | Pop-up dialogs | `x-data="{ open: false }"` |
| **Tooltip** | Hover hints | `x-data="{ show: false }"` |
| **Carousel** | Cycle through content | `x-data="{ current: 0, total: N }"` |
| **Toggle** | On/off switches | `x-data="{ active: false }"` |
| **Dropdown** | Select options | `x-data="{ open: false, selected: '' }"` |

## Copy-Paste Examples

### Tabs (Pill Style)

```html
<div x-data="{ tab: 'overview' }">
    <div class="tabs">
        <button class="tab-btn" :class="{ active: tab === 'overview' }" @click="tab = 'overview'">Overview</button>
        <button class="tab-btn" :class="{ active: tab === 'details' }" @click="tab = 'details'">Details</button>
    </div>
    <div class="tab-content">
        <div x-show="tab === 'overview'">Overview content here</div>
        <div x-show="tab === 'details'" x-cloak>Details content here</div>
    </div>
</div>
```

### Accordion

```html
<div x-data="{ open: null }">
    <div class="accordion-item" :data-open="open === 1">
        <button class="accordion-trigger" @click="open = open === 1 ? null : 1">
            <span>Question 1</span>
            <span class="accordion-icon">▼</span>
        </button>
        <div class="accordion-content" x-show="open === 1" x-collapse x-cloak>
            <div class="accordion-inner">Answer content here</div>
        </div>
    </div>
</div>
```

### Modal

```html
<div x-data="{ open: false }">
    <button class="btn btn-primary" @click="open = true">Open Modal</button>

    <div class="modal-overlay" :class="{ open: open }" @click.self="open = false">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Title</h3>
                <button class="modal-close" @click="open = false">✕</button>
            </div>
            <div class="modal-body">Content here</div>
            <div class="modal-footer">
                <button class="btn btn-primary" @click="open = false">Close</button>
            </div>
        </div>
    </div>
</div>
```

### Dropdown

```html
<div class="dropdown" x-data="{ open: false, selected: 'Option 1' }" @click.outside="open = false">
    <button class="dropdown-trigger" @click="open = !open">
        <span x-text="selected"></span>
        <span class="dropdown-icon">▼</span>
    </button>
    <div class="dropdown-menu" :class="{ open: open }">
        <button class="dropdown-item" @click="selected = 'Option 1'; open = false">Option 1</button>
        <button class="dropdown-item" @click="selected = 'Option 2'; open = false">Option 2</button>
    </div>
</div>
```

### Toggle

```html
<div class="toggle" x-data="{ active: false }" :class="{ active: active }" @click="active = !active">
    <div class="toggle-track">
        <div class="toggle-thumb"></div>
    </div>
    <span class="toggle-label">Enable feature</span>
</div>
```

### Carousel

```html
<div x-data="{ current: 0, total: 3 }">
    <div class="carousel">
        <div class="carousel-track" :style="{ transform: `translateX(-${current * 100}%)` }">
            <div class="carousel-slide">Slide 1</div>
            <div class="carousel-slide">Slide 2</div>
            <div class="carousel-slide">Slide 3</div>
        </div>
    </div>
    <div class="carousel-nav">
        <button class="carousel-btn" @click="current = current > 0 ? current - 1 : total - 1">←</button>
        <div class="carousel-dots">
            <template x-for="i in total">
                <button class="carousel-dot" :class="{ active: current === i - 1 }" @click="current = i - 1"></button>
            </template>
        </div>
        <button class="carousel-btn" @click="current < total - 1 ? current++ : current = 0">→</button>
    </div>
</div>
```

## Important CSS

Always include this to hide elements before Alpine initializes:

```css
[x-cloak] { display: none !important; }
```

## Files

| File | Description |
|------|-------------|
| `midnight-components.html` | Full interactive demo with all components |
| `README.md` | This documentation |

## Combining with Charts

These components work alongside Chart.js. Use tabs/dropdowns to switch chart data:

```html
<div x-data="{ metric: 'revenue' }">
    <div class="tabs">
        <button class="tab-btn" :class="{ active: metric === 'revenue' }" @click="metric = 'revenue'; updateChart('revenue')">Revenue</button>
        <button class="tab-btn" :class="{ active: metric === 'users' }" @click="metric = 'users'; updateChart('users')">Users</button>
    </div>
    <canvas id="myChart"></canvas>
</div>

<script>
function updateChart(metric) {
    // Update chart data based on selected metric
    myChart.data.datasets[0].data = chartData[metric];
    myChart.update();
}
</script>
```
