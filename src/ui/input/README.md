# Input Components

Form input components for text entry and multi-line text.

## Files

- **input.tsx** - Single-line text input with enhanced variant
- **textarea.tsx** - Multi-line text input with enhanced variant
- **index.ts** - Barrel export

## Usage

```tsx
import { Input, EnhancedInput, Textarea, EnhancedTextarea } from '@/ui';

// Basic input
<Input 
  type="email" 
  placeholder="Enter email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// Enhanced input with clear button
<EnhancedInput
  placeholder="Search..."
  showClearButton={true}
  maxLength={100}
/>

// Basic textarea
<Textarea
  placeholder="Enter description"
  rows={4}
/>

// Enhanced textarea with character count
<EnhancedTextarea
  placeholder="Write your message"
  maxLength={500}
  showCharacterCount={true}
/>
```

## Enhanced Features

Both `EnhancedInput` and `EnhancedTextarea` support:
- Character count display
- Clear button
- Max length validation
- All standard HTML input attributes
