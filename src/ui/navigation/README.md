# Navigation Components

Components for organizing and navigating between content sections.

## Files

- **tabs.tsx** - Tab navigation for switching between views
- **accordion.tsx** - Collapsible sections with expand/collapse
- **collapsible.tsx** - Simple collapsible content wrapper
- **index.ts** - Barrel export

## Usage

### Tabs
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
    <TabsTrigger value="tab3">Tab 3</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    <p>Content for tab 1</p>
  </TabsContent>
  <TabsContent value="tab2">
    <p>Content for tab 2</p>
  </TabsContent>
  <TabsContent value="tab3">
    <p>Content for tab 3</p>
  </TabsContent>
</Tabs>
```

### Accordion
```tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/ui';

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>
      Content for section 1
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Section 2</AccordionTrigger>
    <AccordionContent>
      Content for section 2
    </AccordionContent>
  </AccordionItem>
</Accordion>

// Multiple sections open at once
<Accordion type="multiple">
  {/* ... */}
</Accordion>
```

### Collapsible
```tsx
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/ui';

<Collapsible>
  <CollapsibleTrigger>
    <Button variant="ghost">Toggle Details</Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <p>Hidden content that can be toggled</p>
  </CollapsibleContent>
</Collapsible>
```

## Use Cases

- **Tabs** - Multiple views in same space, settings panels, dashboards
- **Accordion** - FAQs, documentation, grouped content
- **Collapsible** - Show/hide details, expandable sections
