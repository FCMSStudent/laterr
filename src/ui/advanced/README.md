# Advanced Components

Complex, feature-rich components for specialized use cases.

## Files

- **command.tsx** - Command palette / search interface
- **menubar.tsx** - Application menu bar
- **navigation-menu.tsx** - Complex navigation menu
- **sidebar.tsx** - Collapsible sidebar navigation
- **slider.tsx** - Range slider input
- **toggle.tsx** - Toggle button
- **toggle-group.tsx** - Group of toggle buttons
- **breadcrumb.tsx** - Breadcrumb navigation
- **chart.tsx** - Chart components (Recharts integration)
- **input-otp.tsx** - One-time password input
- **index.ts** - Barrel export

## Usage Examples

### Command Palette
```tsx
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/ui';

<Command>
  <CommandInput placeholder="Type a command or search..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem>Calendar</CommandItem>
      <CommandItem>Search Emoji</CommandItem>
      <CommandItem>Calculator</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

### Sidebar
```tsx
import { Sidebar, SidebarProvider, SidebarTrigger } from '@/ui';

<SidebarProvider>
  <Sidebar>
    {/* Sidebar content */}
  </Sidebar>
  <main>
    <SidebarTrigger />
    {/* Main content */}
  </main>
</SidebarProvider>
```

### Slider
```tsx
import { Slider } from '@/ui';

<Slider
  defaultValue={[50]}
  max={100}
  step={1}
  onValueChange={(value) => console.log(value)}
/>

// Range slider
<Slider
  defaultValue={[25, 75]}
  max={100}
  step={1}
/>
```

### Toggle
```tsx
import { Toggle } from '@/ui';
import { Bold } from 'lucide-react';

<Toggle aria-label="Toggle bold">
  <Bold className="h-4 w-4" />
</Toggle>
```

### Toggle Group
```tsx
import { ToggleGroup, ToggleGroupItem } from '@/ui';
import { Bold, Italic, Underline } from 'lucide-react';

<ToggleGroup type="multiple">
  <ToggleGroupItem value="bold" aria-label="Toggle bold">
    <Bold className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="italic" aria-label="Toggle italic">
    <Italic className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="underline" aria-label="Toggle underline">
    <Underline className="h-4 w-4" />
  </ToggleGroupItem>
</ToggleGroup>
```

### Breadcrumb
```tsx
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/ui';

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/products">Products</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Current Page</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### Input OTP
```tsx
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/ui';

<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>
```

## When to Use

- **Command** - Quick actions, search, keyboard shortcuts
- **Sidebar** - App navigation, collapsible menus
- **Slider** - Volume, brightness, range selection
- **Toggle** - Formatting tools, settings switches
- **Breadcrumb** - Navigation hierarchy, current location
- **Chart** - Data visualization, analytics
- **InputOTP** - Two-factor authentication, verification codes

## Notes

These components are more complex and may require additional setup or dependencies. Refer to individual component documentation for detailed configuration options.
