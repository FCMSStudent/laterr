# Data Components

Components for displaying and navigating tabular data.

## Files

- **table.tsx** - Data table with rows and columns
- **pagination.tsx** - Pagination controls for data
- **index.ts** - Barrel export

## Usage

### Table
```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/ui';

<Table>
  <TableCaption>A list of your recent invoices.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Invoice</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>INV001</TableCell>
      <TableCell>Paid</TableCell>
      <TableCell>$250.00</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>INV002</TableCell>
      <TableCell>Pending</TableCell>
      <TableCell>$150.00</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Pagination
```tsx
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/ui';

<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#" isActive>1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">2</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">3</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationEllipsis />
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

## Best Practices

### Table
- Use `TableCaption` for accessibility
- Keep tables responsive with horizontal scroll on mobile
- Add sorting and filtering for large datasets
- Use zebra striping for better readability

### Pagination
- Show current page clearly with `isActive`
- Use ellipsis for large page counts
- Disable prev/next at boundaries
- Consider infinite scroll for mobile
