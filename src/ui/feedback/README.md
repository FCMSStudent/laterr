# Feedback Components

User feedback components for alerts, notifications, and progress indicators.

## Files

- **alert.tsx** - Alert message boxes
- **toast.tsx** - Toast notification system
- **toaster.tsx** - Toast container component
- **use-toast.ts** - Toast hook for programmatic toasts
- **progress.tsx** - Progress bar indicator
- **sonner.tsx** - Alternative toast library
- **index.ts** - Barrel export

## Usage

### Alert
```tsx
import { Alert, AlertTitle, AlertDescription } from '@/ui';
import { AlertCircle } from 'lucide-react';

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Something went wrong. Please try again.
  </AlertDescription>
</Alert>

// Variants: default, destructive
```

### Toast
```tsx
import { useToast } from '@/ui';

function MyComponent() {
  const { toast } = useToast();

  const showToast = () => {
    toast({
      title: "Success",
      description: "Your changes have been saved.",
    });
  };

  const showError = () => {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to save changes.",
    });
  };

  return <Button onClick={showToast}>Show Toast</Button>;
}

// Add Toaster to your app root
import { Toaster } from '@/ui';

function App() {
  return (
    <>
      {/* Your app content */}
      <Toaster />
    </>
  );
}
```

### Progress
```tsx
import { Progress } from '@/ui';

<Progress value={60} className="w-[60%]" />

// With state
const [progress, setProgress] = useState(0);

useEffect(() => {
  const timer = setTimeout(() => setProgress(66), 500);
  return () => clearTimeout(timer);
}, []);

<Progress value={progress} />
```

### Sonner (Alternative Toast)
```tsx
import { toast } from 'sonner';

// Simple toast
toast('Event has been created');

// With description
toast('Event has been created', {
  description: 'Monday, January 3rd at 6:00pm',
});

// Success, error, etc.
toast.success('Success message');
toast.error('Error message');
toast.warning('Warning message');
toast.info('Info message');
```

## Toast vs Sonner

- **Toast** - Built-in, customizable, integrated with UI system
- **Sonner** - Third-party library, simpler API, more opinionated

Choose based on your needs and existing patterns.
