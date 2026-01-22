# Calendar Component

Date picker and calendar component for date selection.

## Files

- **calendar.tsx** - Calendar date picker
- **index.ts** - Barrel export

## Usage

```tsx
import { Calendar } from '@/ui';
import { useState } from 'react';

function DatePicker() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      className="rounded-md border"
    />
  );
}
```

## Modes

### Single Date
```tsx
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
/>
```

### Multiple Dates
```tsx
<Calendar
  mode="multiple"
  selected={dates}
  onSelect={setDates}
/>
```

### Date Range
```tsx
<Calendar
  mode="range"
  selected={dateRange}
  onSelect={setDateRange}
/>
```

## Common Use Cases

- Date of birth selection
- Event scheduling
- Date range filters
- Booking systems
- Availability calendars

## Best Practices

- Wrap in a Popover for space-saving date picker
- Set min/max dates to restrict selection
- Disable specific dates as needed
- Format selected dates for display
- Consider timezone handling for date storage

## Example: Date Picker in Popover

```tsx
import { Calendar } from '@/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui';
import { Button } from '@/ui';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date ? format(date, 'PPP') : 'Pick a date'}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0">
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      initialFocus
    />
  </PopoverContent>
</Popover>
```
