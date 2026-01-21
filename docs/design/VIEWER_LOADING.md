# Viewer Loading State Implementation

## Overview
This document describes the PDF and DOCX viewer loading state implementation, which provides better user feedback and error handling.

## Problem Statement
Previously, when loading PDF or DOCX files in the viewer:
- Users saw a blank panel with just a small spinner and "Loading..." text
- The blank state made it look broken, especially when the right panel loaded immediately
- No retry mechanism existed for failed loads
- No feedback for slow-loading files
- Error states were minimal (just text)

## Solution

### 1. Skeleton Loading UI
**Before:** Blank panel with spinner
**After:** Animated skeleton placeholder that looks like document content

#### PDF Viewer Skeleton
- Shows a realistic document-like skeleton with multiple animated lines
- Wrapped in a white/dark card with shadow to mimic a PDF page
- Provides visual structure while loading

#### DOCX Viewer Skeleton
- Shows document-like skeleton with varying line widths (headings + paragraphs)
- Multiple sections to mimic document structure
- Animates with pulse effect

### 2. Retry Functionality
**Implementation:**
- Added "Retry" button with refresh icon on error states
- Uses a `retryKey` state that forces component re-render when incremented
- Clears error state and resets loading state on retry
- Visual error icon (X in circle) with red accent color

### 3. Slow Loading Detection
**Implementation:**
- Starts a 10-second timer when loading begins
- After 10 seconds, updates message to "Still loading... This may take a moment."
- Provides reassurance that the system is still working
- Timer is cleared when loading completes or component unmounts

## Technical Implementation

### Files Modified
1. `/src/features/bookmarks/components/PDFPreview.tsx`
2. `/src/features/bookmarks/components/DOCXPreview.tsx`

### Key Changes

#### State Management
```typescript
const [isSlowLoading, setIsSlowLoading] = useState<boolean>(false);
const [retryKey, setRetryKey] = useState<number>(0);
```

#### Slow Loading Detection
```typescript
useEffect(() => {
  if (loading) {
    setIsSlowLoading(false);
    const timer = setTimeout(() => {
      if (loading) {
        setIsSlowLoading(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  } else {
    setIsSlowLoading(false);
  }
}, [loading, retryKey]);
```

#### Retry Handler
```typescript
const handleRetry = () => {
  setError(null);
  setLoading(true);
  setIsSlowLoading(false);
  setRetryKey(prev => prev + 1);
};
```

#### Skeleton UI (PDF Example)
```tsx
{loading && (
  <div className="w-full h-full flex items-center justify-center p-8">
    <div className="w-full max-w-2xl space-y-4">
      {/* Skeleton placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        {/* ... more lines ... */}
      </div>
      <div className="text-center space-y-2">
        <LoadingSpinner 
          size="sm" 
          text={isSlowLoading 
            ? "Still loading PDF... This may take a moment." 
            : "Loading PDF..."
          } 
        />
      </div>
    </div>
  </div>
)}
```

#### Error State with Retry
```tsx
{error && !loading && (
  <div className="p-8 text-center space-y-4">
    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
      <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
    <p className="text-sm text-destructive font-medium">{error}</p>
    <Button 
      onClick={handleRetry}
      variant="outline"
      size="sm"
      className="mt-4"
    >
      <RefreshCw className="h-4 w-4 mr-2" />
      Retry
    </Button>
  </div>
)}
```

## User Experience Flow

### Loading Flow
1. User opens item with PDF/DOCX file
2. Skeleton appears immediately (no blank panel)
3. Loading spinner shows "Loading PDF..." or "Loading document..."
4. If > 10 seconds: Message updates to "Still loading... This may take a moment."
5. When loaded: Skeleton fades out, actual content appears

### Error Flow
1. If loading fails: Error icon appears
2. Error message displays: "Failed to load PDF. Please try again."
3. "Retry" button is visible and clickable
4. On retry: Error clears, loading state restarts with fresh skeleton

### Success Flow
1. Content loads successfully
2. Skeleton/loading state disappears
3. Full PDF/DOCX viewer appears with controls

## Benefits

### User Experience
- **No blank panels**: Skeleton provides visual structure during load
- **Clear feedback**: Users know the system is working
- **Error recovery**: Easy retry without closing modal
- **Slow connection support**: Patient messaging for slow loads

### Technical
- **Minimal code changes**: ~50 lines added per component
- **No breaking changes**: All existing functionality preserved
- **Consistent patterns**: Same approach for PDF and DOCX
- **Performance**: No impact on load times, just better UX

## Testing Recommendations

1. **Fast connection**: Verify skeleton appears briefly then loads
2. **Slow connection**: Verify "Still loading..." message appears after 10s
3. **Failed load**: Verify error state and retry button work
4. **Multiple retries**: Verify retry can be clicked multiple times
5. **Dark mode**: Verify skeleton looks good in both themes

## Acceptance Criteria ✅

- [x] While loading: viewer shows skeleton/placeholder (not blank)
- [x] If load fails: show error state + "Retry" button
- [x] If load is slow: show "Still loading…" messaging after 10-second threshold
- [x] Works for both PDF and DOCX viewers
- [x] Preserves all existing functionality
- [x] No linting errors introduced
