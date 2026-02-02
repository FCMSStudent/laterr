# UI Components Screenshots

This directory contains automatically generated screenshots of all UI components in the Laterr application.

## Screenshot Generation

Screenshots are automatically generated using Playwright tests. To regenerate screenshots:

```bash
# Install Playwright browsers (first time only)
npx playwright install --with-deps chromium

# Run screenshot generation
npm run screenshots
```

## Available Screenshots

- `00-full-page.png` - Full page view of the component showcase
- `1-buttons.png` - Button components with all variants
- `2-cards.png` - Card components
- `3-badges.png` - Badge components with variants
- `4-form-inputs.png` - Form input components
- `5-select-radio.png` - Select and radio group components
- `6-slider-calendar.png` - Slider and calendar components
- `7-progress-alerts.png` - Progress bars and alert components
- `8-avatar.png` - Avatar components
- `9-accordion-tabs.png` - Accordion and tabs components
- `10-dialogs.png` - Dialog and modal components
- `11-dropdowns.png` - Dropdown menus and overlay components
- `12-table.png` - Table components
- `13-navigation.png` - Navigation components (breadcrumb, menubar)
- `14-toggles.png` - Toggle components
- `15-layout.png` - Layout components (separator, scroll area)
- `16-skeleton.png` - Loading state components
- `17-collapsible.png` - Collapsible components
- `18-command.png` - Command palette component
- `19-context-menu.png` - Context menu component

## Component Showcase Page

You can view all components interactively at:
```
http://localhost:8080/components
```

When the development server is running.

## Documentation

For a comprehensive visual reference with all screenshots, see the main documentation:
- [laterr_ui_components_canvas_document.md](../laterr_ui_components_canvas_document.md)

## Updating Screenshots

When components are updated or new components are added:

1. Update the component showcase page at `src/features/core/pages/ComponentShowcasePage.tsx`
2. Update the test file at `tests/screenshots.spec.ts` to include new sections
3. Run `npm run screenshots` to regenerate all screenshots
4. The markdown documentation will be automatically updated

## Notes

- Screenshots are generated in a headless Chrome browser
- The showcase page uses the actual production components
- All screenshots are taken at desktop resolution (1280x720)
