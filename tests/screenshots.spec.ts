import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Ensure screenshots directory exists
const screenshotsDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.describe('UI Components Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the components showcase page
    await page.goto('/components');
    await page.waitForLoadState('networkidle');
    // Wait a bit more for any animations or dynamic content
    await page.waitForTimeout(1000);
  });

  const sections = [
    { id: 'buttons', name: 'Buttons' },
    { id: 'cards', name: 'Cards' },
    { id: 'badges', name: 'Badges' },
    { id: 'form-inputs', name: 'Form Inputs' },
    { id: 'select-radio', name: 'Select and Radio Groups' },
    { id: 'slider-calendar', name: 'Slider and Calendar' },
    { id: 'progress-alerts', name: 'Progress and Alerts' },
    { id: 'avatar', name: 'Avatars' },
    { id: 'accordion-tabs', name: 'Accordion and Tabs' },
    { id: 'dialogs', name: 'Dialogs and Modals' },
    { id: 'dropdowns', name: 'Dropdowns and Menus' },
    { id: 'table', name: 'Table' },
    { id: 'navigation', name: 'Navigation Components' },
    { id: 'toggles', name: 'Toggle Components' },
    { id: 'layout', name: 'Layout Components' },
    { id: 'skeleton', name: 'Loading States' },
    { id: 'collapsible', name: 'Collapsible' },
    { id: 'command', name: 'Command Palette' },
    { id: 'context-menu', name: 'Context Menu' },
  ];

  test('Capture full page screenshot', async ({ page }) => {
    await page.screenshot({
      path: path.join(screenshotsDir, '00-full-page.png'),
      fullPage: true,
    });
  });

  for (const section of sections) {
    test(`Capture ${section.name} screenshot`, async ({ page }) => {
      const sectionElement = page.locator(`#${section.id}`);
      
      // Scroll to the section
      await sectionElement.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500); // Wait for scroll animation
      
      // Take screenshot of the section
      const filename = `${sections.indexOf(section) + 1}-${section.id}.png`;
      await sectionElement.screenshot({
        path: path.join(screenshotsDir, filename),
      });
    });
  }

  test('Generate component documentation', async ({ page }) => {
    // Generate markdown documentation with screenshots
    let markdown = '# Laterr UI Components Canvas Document\n\n';
    markdown += 'This document provides a visual reference for all UI components available in the Laterr application.\n\n';
    markdown += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    markdown += '---\n\n';

    markdown += '## Full Page Preview\n\n';
    markdown += '![Full Page](./screenshots/00-full-page.png)\n\n';
    markdown += '---\n\n';

    for (const section of sections) {
      const filename = `${sections.indexOf(section) + 1}-${section.id}.png`;
      markdown += `## ${section.name}\n\n`;
      markdown += `![${section.name}](./screenshots/${filename})\n\n`;
      markdown += '---\n\n';
    }

    // Add component list
    markdown += '## Component List\n\n';
    markdown += 'The following components are available:\n\n';
    markdown += '### Button Components\n';
    markdown += '- Button (with variants: default, secondary, destructive, outline, ghost, link)\n';
    markdown += '- IconButton\n';
    markdown += '- LoadingButton\n\n';

    markdown += '### Card Components\n';
    markdown += '- Card\n';
    markdown += '- CardHeader\n';
    markdown += '- CardTitle\n';
    markdown += '- CardDescription\n';
    markdown += '- CardContent\n';
    markdown += '- CardFooter\n\n';

    markdown += '### Badge Components\n';
    markdown += '- Badge (with variants: default, secondary, destructive, outline)\n\n';

    markdown += '### Form Components\n';
    markdown += '- Input\n';
    markdown += '- Textarea\n';
    markdown += '- Label\n';
    markdown += '- Checkbox\n';
    markdown += '- RadioGroup & RadioGroupItem\n';
    markdown += '- Select (SelectTrigger, SelectValue, SelectContent, SelectItem)\n';
    markdown += '- Switch\n';
    markdown += '- Slider\n';
    markdown += '- Calendar\n\n';

    markdown += '### Feedback Components\n';
    markdown += '- Alert (with AlertTitle, AlertDescription)\n';
    markdown += '- Progress\n';
    markdown += '- Toast & Toaster\n';
    markdown += '- Sonner\n\n';

    markdown += '### Media Components\n';
    markdown += '- Avatar (with AvatarImage, AvatarFallback)\n';
    markdown += '- Carousel\n\n';

    markdown += '### Navigation Components\n';
    markdown += '- Accordion (AccordionItem, AccordionTrigger, AccordionContent)\n';
    markdown += '- Tabs (TabsList, TabsTrigger, TabsContent)\n';
    markdown += '- Breadcrumb (BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator)\n';
    markdown += '- NavigationMenu (NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink)\n';
    markdown += '- Menubar (MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarSeparator)\n';
    markdown += '- Collapsible (CollapsibleTrigger, CollapsibleContent)\n\n';

    markdown += '### Modal Components\n';
    markdown += '- Dialog (DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription)\n';
    markdown += '- AlertDialog (AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel)\n';
    markdown += '- Drawer\n';
    markdown += '- Sheet\n\n';

    markdown += '### Overlay Components\n';
    markdown += '- DropdownMenu (DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator)\n';
    markdown += '- Popover (PopoverTrigger, PopoverContent)\n';
    markdown += '- Tooltip (TooltipTrigger, TooltipContent)\n';
    markdown += '- HoverCard (HoverCardTrigger, HoverCardContent)\n';
    markdown += '- ContextMenu (ContextMenuTrigger, ContextMenuContent, ContextMenuItem)\n\n';

    markdown += '### Data Components\n';
    markdown += '- Table (TableHeader, TableBody, TableRow, TableHead, TableCell)\n';
    markdown += '- Pagination\n\n';

    markdown += '### Layout Components\n';
    markdown += '- Separator\n';
    markdown += '- ScrollArea\n';
    markdown += '- AspectRatio\n';
    markdown += '- Resizable\n\n';

    markdown += '### Advanced Components\n';
    markdown += '- Command (CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem)\n';
    markdown += '- Chart\n';
    markdown += '- Sidebar\n';
    markdown += '- InputOTP\n\n';

    markdown += '### Toggle Components\n';
    markdown += '- Toggle\n';
    markdown += '- ToggleGroup (ToggleGroupItem)\n\n';

    markdown += '### Loading Components\n';
    markdown += '- Skeleton\n';
    markdown += '- LoadingSpinner\n\n';

    markdown += '---\n\n';
    markdown += '## Usage\n\n';
    markdown += 'All components can be imported from `@/shared/components/ui`:\n\n';
    markdown += '```typescript\n';
    markdown += 'import { Button, Card, CardHeader, CardTitle, ... } from "@/shared/components/ui";\n';
    markdown += '```\n\n';
    markdown += 'For detailed usage examples, please refer to the component showcase page at `/components`.\n';

    // Write the markdown file
    const docPath = path.join(process.cwd(), 'laterr_ui_components_canvas_document.md');
    fs.writeFileSync(docPath, markdown);
    
    console.log(`Documentation generated at: ${docPath}`);
  });
});
