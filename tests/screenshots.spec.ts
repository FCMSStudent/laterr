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
    { id: 'navigation-layout', name: 'Navigation & Layout Components' },
    { id: 'data-display', name: 'Data Display Components' },
    { id: 'form-input', name: 'Form & Input Components' },
    { id: 'overlays-feedback', name: 'Overlays & Feedback Components' },
    { id: 'miscellaneous', name: 'Miscellaneous Components' },
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

    // Add component list organized by category
    markdown += '## Component List\n\n';
    markdown += 'The following components are available:\n\n';

    markdown += '### Navigation & Layout Components\n';
    markdown += '- NavigationHeader\n';
    markdown += '- MobileBottomNav\n';
    markdown += '- ModuleNavigationCard\n';
    markdown += '- Breadcrumbs\n';
    markdown += '- SearchBar (wrapping EnhancedInput)\n';
    markdown += '- CollapsibleSummary\n';
    markdown += '- GradientBackground\n\n';

    markdown += '### Data Display Components\n';
    markdown += '- CompactListRow\n';
    markdown += '- QuickStatsGrid\n';
    markdown += '- DashboardWidget\n';
    markdown += '- RecommendationsPanel (wrapping ItemCard)\n\n';

    markdown += '### Form & Input Components\n';
    markdown += '- EnhancedInput\n';
    markdown += '- Input\n';
    markdown += '- Textarea\n';
    markdown += '- Form Components (FormLabel, FormItem, FormControl, FormDescription, FormMessage, FormField)\n';
    markdown += '- RadioGroup & RadioGroupItem\n';
    markdown += '- Switch & Checkbox\n\n';

    markdown += '### Overlays & Feedback Components\n';
    markdown += '- Dialog (includes DialogContent, DialogHeader, etc.)\n';
    markdown += '- Drawer (includes DrawerContent, DrawerHeader, etc.)\n';
    markdown += '- AlertDialog\n';
    markdown += '- Sheet (includes SheetTrigger, SheetOverlay, etc.)\n';
    markdown += '- Popover\n';
    markdown += '- HoverCard\n';
    markdown += '- Tooltip (includes TooltipProvider)\n';
    markdown += '- Toaster (Radix Toast)\n';
    markdown += '- Sonner Toaster\n';
    markdown += '- LoadingSpinner\n';
    markdown += '- PageLoading\n\n';

    markdown += '### Miscellaneous Components\n';
    markdown += '- Avatar\n';
    markdown += '- Badge\n';
    markdown += '- Tabs (includes TabsList, TabsTrigger, TabsContent)\n';
    markdown += '- Separator\n\n';

    markdown += '---\n\n';
    markdown += '## Usage\n\n';
    markdown += 'All components can be imported from `@/shared/components/ui`:\n\n';
    markdown += '```typescript\n';
    markdown += 'import { Button, Card, CardHeader, CardTitle, ... } from "@/shared/components/ui";\n';
    markdown += '```\n\n';
    markdown += 'Custom shared components can be imported from `@/shared/components`:\n\n';
    markdown += '```typescript\n';
    markdown += 'import { NavigationHeader, SearchBar, LoadingSpinner } from "@/shared/components";\n';
    markdown += '```\n\n';
    markdown += 'For detailed usage examples, please refer to the component showcase page at `/components`.\n';

    // Write the markdown file
    const docPath = path.join(process.cwd(), 'laterr_ui_components_canvas_document.md');
    fs.writeFileSync(docPath, markdown);
    
    console.log(`Documentation generated at: ${docPath}`);
  });
});
