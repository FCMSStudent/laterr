# Feedback & Loading State Components

This document describes the feedback and loading state components added to enhance user experience.

## Components

### OfflineIndicator
**Location:** `src/components/OfflineIndicator.tsx`

Displays a fixed position alert at the top of the screen when the application goes offline.

**Usage:**
```tsx
// Added to App.tsx - automatically shows/hides based on network status
<OfflineIndicator />
```

**Features:**
- Automatically detects online/offline status
- Fixed position at top center of screen
- Glass-morphism design matching app aesthetic
- Uses Alert component with destructive variant

---

### ProgressWithLabel
**Location:** `src/components/ProgressWithLabel.tsx`

Enhanced progress bar that displays both a label and percentage.

**Usage:**
```tsx
<ProgressWithLabel
  value={75}
  label="Uploading file..."
  showPercentage={true}
/>
```

**Props:**
- `value` (number): Progress value 0-100
- `label` (string, optional): Label text to display
- `showPercentage` (boolean, optional): Show percentage, default true
- `className` (string, optional): Additional CSS classes

---

### SaveStatusIndicator
**Location:** `src/components/SaveStatusIndicator.tsx`

Shows the current save status with appropriate icons and colors.

**Usage:**
```tsx
const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

<SaveStatusIndicator status={saveStatus} />
```

**Status Types:**
- `idle`: Nothing shown
- `saving`: Shows spinner with "Saving..."
- `saved`: Shows green checkmark with "Saved"
- `error`: Shows error icon with "Failed to save"

**Features:**
- Animated transitions between states
- Color-coded feedback (primary, green, destructive)
- Auto-hides when idle

---

### SuccessAnimation
**Location:** `src/components/SuccessAnimation.tsx`

Animated checkmark icon for success feedback.

**Usage:**
```tsx
<SuccessAnimation show={isSuccess} className="h-6 w-6" />
```

**Props:**
- `show` (boolean, optional): Controls visibility, default true
- `className` (string, optional): Additional CSS classes

**Features:**
- Zoom-in animation on mount
- Green circular background with white checkmark
- Matches toast notification style

---

## Hooks

### useNetworkStatus
**Location:** `src/hooks/useNetworkStatus.ts`

React hook that monitors the browser's online/offline status.

**Usage:**
```tsx
const isOnline = useNetworkStatus();

if (!isOnline) {
  // Show offline UI or disable features
}
```

**Returns:**
- `boolean`: true if online, false if offline

**Implementation:**
- Listens to window `online` and `offline` events
- Uses `navigator.onLine` for initial state
- Properly cleans up event listeners on unmount

---

## Utilities

### retry-utils.ts
**Location:** `src/lib/retry-utils.ts`

Utilities for implementing retry logic with exponential backoff.

**Functions:**

#### retryWithBackoff
Retries a function with exponential backoff delays.

```tsx
const result = await retryWithBackoff(
  async () => await fetchData(),
  3,      // maxRetries
  1000    // baseDelay in ms
);
```

**Parameters:**
- `fn`: Async function to retry
- `maxRetries`: Maximum number of retry attempts (default: 3)
- `baseDelay`: Base delay in milliseconds (default: 1000)

**Behavior:**
- Delays: 1s, 2s, 4s (exponential)
- Throws last error if all retries fail

#### isRetryableError
Checks if an error should be retried (network errors, timeouts, etc.).

```tsx
if (isRetryableError(error)) {
  // Show retry button
}
```

---

### toast-with-animation.tsx
**Location:** `src/lib/toast-with-animation.tsx`

Enhanced toast notifications with animations.

**Functions:**

#### toastSuccess
Shows a success toast with animated checkmark icon.

```tsx
toastSuccess("Item saved!", {
  description: "Your changes have been saved"
});
```

#### toastError
Shows an error toast with optional retry action.

```tsx
toastError("Failed to save", {
  description: "Network error occurred",
  onRetry: () => saveData()
});
```

---

## Features Implemented

### 1. Progress Bars for Long Operations
File uploads now show detailed progress:
- Uploading (20%)
- Extracting (50%)
- Summarizing (75%)
- Saving (90%)
- Complete (100%)

**Location:** `AddItemModal.tsx` - File upload section

### 2. Auto-Save with Status Indicators
The EditItemModal automatically saves changes after 2 seconds of inactivity.

**Implementation:**
- Uses `useDebounce` hook with 2000ms delay
- Shows "Saving..." → "Saved" → auto-hides
- Updates server in background
- Shows error if save fails

**Location:** `EditItemModal.tsx`

### 3. Undo Functionality for Delete
Delete operations are optimistic with 5-second undo window.

**Behavior:**
1. Item immediately removed from UI (optimistic)
2. Toast appears with "Undo" button (5s duration)
3. If undo clicked: item restored
4. If not undone: item deleted from database after 5s
5. If deletion fails: item automatically restored with error message

**Location:** `Index.tsx` - `handleDeleteItem` function

### 4. Offline Indicator
Fixed position alert appears when app loses network connection.

**Features:**
- Automatically detects offline status
- Shows at top center of screen
- Disappears when back online
- Uses WiFi-off icon for clarity

**Location:** `App.tsx` and `OfflineIndicator.tsx`

### 5. Retry Mechanism
Failed operations show retry button for network-related errors.

**Implementation:**
- Detects retryable errors (network, timeout, connection)
- Shows "Retry" action button in error toast
- Re-executes the failed operation
- Works for URL and file operations

**Location:** `AddItemModal.tsx` - Error handlers

### 6. Success Animations
All success toasts now include animated checkmark.

**Animation:**
- Zoom-in effect (zoom-in-50)
- 300ms duration
- Green circular background
- White checkmark icon

**Usage:** Replaced all `toast.success()` with `toastSuccess()`

### 7. Standardized Loading States
Consistent loading UI across the application:

**Components Used:**
- `LoadingButton`: Buttons with loading state
- `LoadingSpinner`: Full-screen or section loading
- `ProgressWithLabel`: Progress bars for uploads

**Standardization:**
- Same spinner icon (Loader2 from lucide-react)
- Consistent animation speed
- Same color (primary theme color)
- Same sizing conventions (sm, md, lg)

---

## Testing

### Network Status
1. Open browser DevTools
2. Go to Network tab
3. Set throttling to "Offline"
4. Verify offline indicator appears

### Progress Bars
1. Upload a file in AddItemModal
2. Verify progress updates through all stages
3. Verify percentage matches stage

### Auto-Save
1. Open EditItemModal
2. Edit title or summary
3. Wait 2 seconds
4. Verify "Saving..." → "Saved" indicator appears

### Undo Delete
1. Delete an item
2. Click "Undo" in toast notification
3. Verify item is restored
4. Delete again and don't click undo
5. Wait 5 seconds, verify item is permanently deleted

### Success Animations
1. Add any item (URL, note, or file)
2. Verify checkmark animation in success toast
3. Verify zoom-in effect is smooth

### Retry Mechanism
1. Simulate network error (disconnect during operation)
2. Verify error toast shows "Retry" button
3. Click retry
4. Verify operation is re-attempted

---

## Performance Considerations

1. **Network Status Hook**: Uses native browser events, minimal overhead
2. **Auto-Save**: Debounced to prevent excessive server requests
3. **Optimistic Updates**: Immediate UI feedback, better perceived performance
4. **Progress Simulation**: Provides feedback even when actual progress unavailable
5. **Animations**: Use CSS transforms for GPU acceleration

---

## Accessibility

1. **Screen Readers**: 
   - ARIA labels on all status indicators
   - Live regions for dynamic status updates
   - Semantic HTML structure

2. **Keyboard Navigation**:
   - All interactive elements keyboard accessible
   - Retry buttons focusable and activatable

3. **Visual Indicators**:
   - Not relying solely on color
   - Icons accompany all status messages
   - High contrast for visibility

---

## Future Enhancements

Potential improvements for future iterations:

1. **Actual Upload Progress**: Use XMLHttpRequest progress events for real file upload progress
2. **Batch Operations**: Extend undo functionality to support multiple items
3. **Offline Queue**: Queue operations when offline, execute when back online
4. **Advanced Retry**: Configurable retry strategies per operation type
5. **Toast Persistence**: Option to keep certain toasts until explicitly dismissed
6. **Animation Settings**: User preference to reduce animations for accessibility
7. **Real-time Sync**: WebSocket support for real-time status across devices

---

## Troubleshooting

### Offline Indicator Not Showing
- Check browser support for online/offline events
- Verify component is rendered in App.tsx
- Test with actual network disconnection, not just API failures

### Auto-Save Not Working
- Verify debounce hook is functioning
- Check console for save errors
- Ensure modal is open (auto-save only works when editing)

### Progress Bar Stuck
- Check if upload operations are completing
- Verify progress state is being reset in finally block
- Check for errors in async operations

### Undo Not Working
- Verify toast duration is long enough (5s minimum)
- Check if optimistic update is applied correctly
- Ensure item data is being captured before deletion

---

## Dependencies

These components rely on:

- `lucide-react`: Icons
- `sonner`: Toast notifications
- `@radix-ui/react-progress`: Progress bar primitive
- `@radix-ui/react-alert`: Alert component
- `tailwindcss`: Styling
- `tailwindcss-animate`: Animations

---

## Related Documentation

- [UI_UX_FEEDBACK.md](./UI_UX_FEEDBACK.md) - Original UI/UX improvement plan
- [IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md) - Overall improvements tracking
- Component Library: shadcn/ui components in `src/components/ui/`
