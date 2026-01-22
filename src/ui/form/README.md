# Form Components

Form controls and input elements with validation support.

## Files

- **form.tsx** - Form wrapper with react-hook-form integration
- **label.tsx** - Accessible form label
- **checkbox.tsx** - Checkbox input
- **radio-group.tsx** - Radio button group
- **select.tsx** - Dropdown select
- **switch.tsx** - Toggle switch
- **index.ts** - Barrel export

## Usage

### Form with react-hook-form
```tsx
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/ui';
import { useForm } from 'react-hook-form';

const form = useForm();

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

### Label
```tsx
import { Label } from '@/ui';

<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" />
```

### Checkbox
```tsx
import { Checkbox, Label } from '@/ui';

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>
```

### Radio Group
```tsx
import { RadioGroup, RadioGroupItem, Label } from '@/ui';

<RadioGroup defaultValue="option1">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="option1" />
    <Label htmlFor="option1">Option 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option2" id="option2" />
    <Label htmlFor="option2">Option 2</Label>
  </div>
</RadioGroup>
```

### Select
```tsx
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/ui';

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

### Switch
```tsx
import { Switch, Label } from '@/ui';

<div className="flex items-center space-x-2">
  <Switch id="notifications" />
  <Label htmlFor="notifications">Enable notifications</Label>
</div>
```

## Accessibility

All form components include:
- Proper ARIA labels and descriptions
- Keyboard navigation support
- Focus management
- Error state handling
