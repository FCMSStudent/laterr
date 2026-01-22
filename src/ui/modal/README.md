# Modal Components

Overlay components for dialogs, drawers, sheets, and alert confirmations.

## Files

- **dialog.tsx** - Modal dialog (center-screen overlay)
- **drawer.tsx** - Slide-in drawer (mobile-optimized)
- **sheet.tsx** - Side sheet panel
- **alert-dialog.tsx** - Confirmation dialog with actions
- **index.ts** - Barrel export

## Usage

### Dialog
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/ui';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Optional description</DialogDescription>
    </DialogHeader>
    <p>Dialog content here</p>
  </DialogContent>
</Dialog>
```

### Drawer (Mobile-friendly)
```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/ui';

<Drawer open={isOpen} onOpenChange={setIsOpen}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Drawer Title</DrawerTitle>
    </DrawerHeader>
    <p>Drawer content</p>
  </DrawerContent>
</Drawer>
```

### Sheet (Side Panel)
```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/ui';

<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Sheet Title</SheetTitle>
    </SheetHeader>
    <p>Sheet content</p>
  </SheetContent>
</Sheet>
```

### Alert Dialog (Confirmation)
```tsx
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/ui';

<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirm}>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## When to Use

- **Dialog** - General purpose modals, forms, content display
- **Drawer** - Mobile-first bottom sheets, filters, menus
- **Sheet** - Side panels, navigation, settings
- **AlertDialog** - Confirmations, destructive actions, important alerts
