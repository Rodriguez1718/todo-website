# UI Component Library

Reusable design system components for the todo app.

## Components

### Button
Versatile button component with multiple variants.

**Props:**
- `variant`: 'primary' | 'secondary' | 'ghost' | 'danger' (default: 'primary')
- `type`: 'button' | 'submit' | 'reset' (default: 'button')
- `class`: Additional CSS classes
- `id`: Element ID
- `disabled`: Boolean

**Usage:**
```astro
import Button from '@/components/ui/Button.astro';

<Button variant="primary">Click Me</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger">Delete</Button>
<Button variant="ghost">Link Style</Button>
```

### Badge
Status indicator badge component.

**Props:**
- `variant`: 'success' | 'warning' | 'error' | 'info' (default: 'warning')
- `class`: Additional CSS classes

**Usage:**
```astro
import Badge from '@/components/ui/Badge.astro';

<Badge variant="success">Completed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Overdue</Badge>
<Badge variant="info">New</Badge>
```

### Input
Form input component with validation states.

**Props:**
- `type`: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' (default: 'text')
- `variant`: 'default' | 'error' | 'success' (default: 'default')
- `placeholder`: Placeholder text
- `id`: Element ID
- `name`: Input name
- `value`: Input value
- `required`: Boolean
- `class`: Additional CSS classes

**Usage:**
```astro
import Input from '@/components/ui/Input.astro';

<Input placeholder="Enter task..." />
<Input variant="error" placeholder="Invalid input" />
<Input variant="success" placeholder="Valid input" />
```

## Design Tokens

### Colors
- `--color-success`: #16a34a
- `--color-warning`: #eab308
- `--color-error`: #dc2626
- `--color-info`: #3b82f6

### Priority Colors
- `--priority-high`: #dc2626
- `--priority-medium`: #f59e0b
- `--priority-low`: #10b981

### Spacing
- `--space-xs`: 0.25rem
- `--space-sm`: 0.5rem
- `--space-md`: 1rem
- `--space-lg`: 1.5rem
- `--space-xl`: 2rem
- `--space-2xl`: 3rem
- `--space-3xl`: 4rem

### Transitions
- `--transition-fast`: 150ms
- `--transition-base`: 200ms
- `--transition-slow`: 300ms

### Easing
- `--easing-bounce`: cubic-bezier(0.34, 1.56, 0.64, 1)
- `--easing-smooth`: cubic-bezier(0.4, 0, 0.2, 1)
- `--easing-spring`: cubic-bezier(0.68, -0.55, 0.265, 1.55)

### Shadows
- `--shadow-sm`: 0 1px 2px rgba(217, 119, 6, 0.1)
- `--shadow-md`: 0 4px 6px rgba(217, 119, 6, 0.15)
- `--shadow-lg`: 0 8px 12px rgba(217, 119, 6, 0.2)
- `--shadow-xl`: 0 12px 24px rgba(217, 119, 6, 0.25)

## Utility Classes

### Typography
- `.text-balance`: Balance text wrapping
- `.text-pretty`: Pretty text wrapping

### Performance
- `.gpu-accelerated`: Enable GPU acceleration
- `.contain-layout`: Layout containment
- `.contain-paint`: Paint containment
- `.contain-strict`: Strict containment

### Interactions
- `.draggable`: Drag and drop cursor states
- `.drag-over`: Drag over indicator

## JavaScript Utilities

### Toast Notifications
```javascript
// Show success toast
showToast('Task completed!', 'success', 2000);

// Show error toast
showToast('Something went wrong', 'error', 3000);

// Show info toast
showToast('Task reopened', 'info', 2000);
```

### Task Celebration
Automatically triggered on task completion with confetti animation.

## Accessibility

All components include:
- Proper ARIA attributes
- Keyboard navigation support
- Focus visible states
- Reduced motion support
- Screen reader compatibility
