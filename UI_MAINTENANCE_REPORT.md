# UI/UX Maintenance Audit Report

Generated on: 2/25/2026, 1:16:27 AM

## Summary

- **Total Issues:** 114
- **Critical:** 0
- **High:** 12
- **Medium:** 0
- **Low:** 102

## Issues by Severity

### HIGH

| Type | Description | File | Line |
| --- | --- | --- | --- |
| accessibility | Form element <input> missing accessible label (label, aria-label, or aria-labelledby) | `src/features/bookmarks/components/ChecklistItem.tsx` | 58 |
| accessibility | Form element <input> missing accessible label (label, aria-label, or aria-labelledby) | `src/features/bookmarks/components/RichNotesEditor.tsx` | 323 |
| accessibility | Form element <input> missing accessible label (label, aria-label, or aria-labelledby) | `src/features/bookmarks/components/BulletItem.tsx` | 51 |
| accessibility | Form element <input> missing accessible label (label, aria-label, or aria-labelledby) | `src/features/bookmarks/components/NumberedItem.tsx` | 53 |
| accessibility | Form element <input> missing accessible label (label, aria-label, or aria-labelledby) | `src/features/bookmarks/components/HeadingItem.tsx` | 59 |
| accessibility | Form element <input> missing accessible label (label, aria-label, or aria-labelledby) | `src/features/health/components/AddHealthDocumentModal.tsx` | 395 |
| accessibility | Form element <input> missing accessible label (label, aria-label, or aria-labelledby) | `src/features/core/pages/ViewerLoadingTestPage.tsx` | 33 |
| accessibility | Form element <input> missing accessible label (label, aria-label, or aria-labelledby) | `src/features/core/pages/ViewerLoadingTestPage.tsx` | 67 |
| accessibility | Icon-only button missing aria-label | `src/features/bookmarks/components/DetailViewModal.tsx` | 535 |
| accessibility | Icon-only button missing aria-label | `src/features/health/components/HealthChatPanel.tsx` | 180 |
| accessibility | Icon-only button missing aria-label | `src/features/health/components/HealthDocumentCard.tsx` | 61 |
| accessibility | Icon-only button missing aria-label | `src/features/health/components/MeasurementCard.tsx` | 91 |

### LOW

| Type | Description | File | Line |
| --- | --- | --- | --- |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/auth/pages/AuthPage.tsx` | 367 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/auth/pages/AuthPage.tsx` | 466 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/auth/pages/AuthPage.tsx` | 541 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/auth/pages/AuthPage.tsx` | 573 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/bookmarks/components/CardDetailRightPanel.tsx` | 238 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/bookmarks/components/CardDetailRightPanel.tsx` | 261 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/bookmarks/components/EditItemModal.tsx` | 143 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/bookmarks/components/BookmarkCard.tsx` | 398 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/bookmarks/pages/BookmarksPage.tsx` | 521 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/bookmarks/pages/BookmarksPage.tsx` | 528 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/health/components/AddHealthDocumentModal.tsx` | 431 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/health/components/AddMeasurementModal.tsx` | 259 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/health/components/InlineHealthStats.tsx` | 63 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/health/components/MeasurementGroup.tsx` | 67 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/subscriptions/components/SubscriptionListRow.tsx` | 40 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/subscriptions/components/EditSubscriptionModal.tsx` | 358 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/subscriptions/components/CollapsibleStatsSummary.tsx` | 30 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/features/subscriptions/components/AddSubscriptionModal.tsx` | 403 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/shared/components/CollapsibleSummary.tsx` | 66 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/shared/components/RecentlyViewedSection.tsx` | 30 |
| consistency | Raw <button> tag used; consider using the standard Button component | `src/shared/components/MobileBottomNav.tsx` | 53 |
| styling | Hardcoded pixel value found in Tailwind class: <DialogContent className="w-[600px] max-w-[90vw] h-[600px] max-h-[80vh] border-0 bg-muted/20 backdrop-blur-md rounded-2xl flex flex-col p-0"> | `src/features/bookmarks/components/NoteEditorModal.tsx` | 125 |
| styling | Hardcoded pixel value found in Tailwind class: <AlertDialogCancel className="glass-input min-h-[44px]">Cancel</AlertDialogCancel> | `src/features/bookmarks/components/NoteEditorModal.tsx` | 145 |
| styling | Hardcoded pixel value found in Tailwind class: <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"> | `src/features/bookmarks/components/NoteEditorModal.tsx` | 146 |
| styling | Hardcoded pixel value found in Tailwind class: <div className="space-y-1 min-h-[200px] p-3 rounded-xl glass-input flex-1 overflow-y-auto"> | `src/features/bookmarks/components/RichNotesEditor.tsx` | 306 |
| styling | Hardcoded pixel value found in Tailwind class: <div className="flex-1 overflow-auto glass-heavy rounded-xl p-6 min-h-[300px]"> | `src/features/bookmarks/components/DOCXPreview.tsx` | 84 |
| styling | Hardcoded pixel value found in Tailwind class: <span className="text-xs text-muted-foreground px-2 min-w-[80px] text-center"> | `src/features/bookmarks/components/PDFPreview.tsx` | 118 |
| styling | Hardcoded pixel value found in Tailwind class: <Button variant={!selectedTag ? "default" : "outline"} size="sm" onClick={() => onTagSelect(null)} className="min-h-[44px]"> | `src/features/bookmarks/components/FilterBar.tsx` | 75 |
| styling | Hardcoded pixel value found in Tailwind class: {CATEGORY_OPTIONS.map(category => <Button key={category.value} variant={selectedTag === category.value ? "default" : "outline"} size="sm" onClick={() => onTagSelect(category.value)} className="min-h-[44px]"> | `src/features/bookmarks/components/FilterBar.tsx` | 78 |
| styling | Hardcoded pixel value found in Tailwind class: <Button variant={!selectedTypeFilter ? "default" : "outline"} size="sm" onClick={() => onTypeFilterChange(null)} className="min-h-[44px]"> | `src/features/bookmarks/components/FilterBar.tsx` | 88 |
| styling | Hardcoded pixel value found in Tailwind class: <Button variant={selectedTypeFilter === "url" ? "default" : "outline"} size="sm" onClick={() => onTypeFilterChange("url")} className="min-h-[44px]"> | `src/features/bookmarks/components/FilterBar.tsx` | 91 |
| styling | Hardcoded pixel value found in Tailwind class: <Button variant={selectedTypeFilter === "note" ? "default" : "outline"} size="sm" onClick={() => onTypeFilterChange("note")} className="min-h-[44px]"> | `src/features/bookmarks/components/FilterBar.tsx` | 95 |
| styling | Hardcoded pixel value found in Tailwind class: <Button variant={selectedTypeFilter === "document" ? "default" : "outline"} size="sm" onClick={() => onTypeFilterChange("document")} className="min-h-[44px]"> | `src/features/bookmarks/components/FilterBar.tsx` | 99 |
| styling | Hardcoded pixel value found in Tailwind class: <Button variant={selectedTypeFilter === "image" ? "default" : "outline"} size="sm" onClick={() => onTypeFilterChange("image")} className="min-h-[44px]"> | `src/features/bookmarks/components/FilterBar.tsx` | 103 |
| styling | Hardcoded pixel value found in Tailwind class: }].map(option => <Button key={option.value} variant={selectedSort === option.value ? "default" : "outline"} size="sm" onClick={() => onSortChange(option.value)} className="min-h-[44px] justify-start"> | `src/features/bookmarks/components/FilterBar.tsx` | 129 |
| styling | Hardcoded pixel value found in Tailwind class: {hasActiveFilters && <Button variant="destructive" size="sm" onClick={onClearAll} className="w-full min-h-[44px]"> | `src/features/bookmarks/components/FilterBar.tsx` | 136 |
| styling | Hardcoded pixel value found in Tailwind class: <div className="glass-card rounded-2xl p-5 md:p-7 min-h-[280px] md:min-h-[320px]"> | `src/features/bookmarks/components/ItemCardSkeleton.tsx` | 5 |
| styling | Hardcoded pixel value found in Tailwind class: <a href={item.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors truncate max-w-[120px]"> | `src/features/bookmarks/components/CardDetailRightPanel.tsx` | 191 |
| styling | Hardcoded pixel value found in Tailwind class: className="min-h-[100px] max-h-[100px] resize-none glass-input rounded-xl text-sm leading-relaxed placeholder:text-muted-foreground/50" | `src/features/bookmarks/components/CardDetailRightPanel.tsx` | 213 |
| styling | Hardcoded pixel value found in Tailwind class: className="glass-input border-0 h-12 md:h-10 min-h-[44px]" | `src/features/bookmarks/components/EditItemModal.tsx` | 103 |
| styling | Hardcoded pixel value found in Tailwind class: className="glass-input border-0 min-h-[100px] resize-none" | `src/features/bookmarks/components/EditItemModal.tsx` | 117 |
| styling | Hardcoded pixel value found in Tailwind class: className="glass-input border-0 h-12 md:h-10 min-h-[44px]" | `src/features/bookmarks/components/EditItemModal.tsx` | 132 |
| styling | Hardcoded pixel value found in Tailwind class: className="text-xs font-semibold shadow-sm flex items-center gap-1 pr-1 min-h-[32px]" | `src/features/bookmarks/components/EditItemModal.tsx` | 140 |
| styling | Hardcoded pixel value found in Tailwind class: className="ml-1 hover:bg-destructive/20 rounded-full p-1 premium-transition min-h-[24px] min-w-[24px]" | `src/features/bookmarks/components/EditItemModal.tsx` | 146 |
| styling | Hardcoded pixel value found in Tailwind class: className="w-full min-h-[48px]" | `src/features/bookmarks/components/EditItemModal.tsx` | 162 |
| styling | Hardcoded pixel value found in Tailwind class: }} className={cn("glass-card rounded-2xl p-5 md:p-7 cursor-pointer hover:scale-[1.02] premium-transition hover:shadow-2xl group overflow-hidden relative focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:outline-none min-h-[280px] md:min-h-[320px]", type === 'note' && "border border-border/60 dark:border-transparent", isSelected && "ring-2 ring-primary bg-primary/5 scale-[0.98]", isSelectionMode && !isSelected && "hover:ring-2 hover:ring-primary/50")}> | `src/features/bookmarks/components/ItemCard.tsx` | 204 |
| styling | Hardcoded pixel value found in Tailwind class: <Button variant="ghost" size="sm" className="h-10 w-10 md:h-8 md:w-8 p-0 rounded-full glass-light hover:shadow-md min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0" aria-label="Card actions"> | `src/features/bookmarks/components/ItemCard.tsx` | 215 |
| styling | Hardcoded pixel value found in Tailwind class: {!isTrashed && onEdit && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onEdit(id))} className="min-h-[44px] md:min-h-0 text-base md:text-sm"> | `src/features/bookmarks/components/ItemCard.tsx` | 220 |
| styling | Hardcoded pixel value found in Tailwind class: {!isTrashed && onDelete && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onDelete(id))} className="text-destructive focus:text-destructive min-h-[44px] md:min-h-0 text-base md:text-sm"> | `src/features/bookmarks/components/ItemCard.tsx` | 224 |
| styling | Hardcoded pixel value found in Tailwind class: {isTrashed && onRestore && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onRestore(id))} className="min-h-[44px] md:min-h-0 text-base md:text-sm"> | `src/features/bookmarks/components/ItemCard.tsx` | 228 |
| styling | Hardcoded pixel value found in Tailwind class: {isTrashed && onPermanentDelete && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onPermanentDelete(id))} className="text-destructive focus:text-destructive min-h-[44px] md:min-h-0 text-base md:text-sm"> | `src/features/bookmarks/components/ItemCard.tsx` | 232 |
| styling | Hardcoded pixel value found in Tailwind class: {(isMobile ? expandedTags ? tags : tags.slice(0, 2) : showAllTags ? tags : tags.slice(0, 3)).map((tag, index) => <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-accent premium-transition text-xs font-semibold shadow-sm min-h-[32px] px-3" role="button" tabIndex={0} aria-label={`Filter by tag ${tag}`} onClick={e => { | `src/features/bookmarks/components/ItemCard.tsx` | 287 |
| styling | Hardcoded pixel value found in Tailwind class: {isMobile ? tags.length > 2 && <Badge variant="outline" className="text-xs font-medium min-h-[32px] px-3 cursor-pointer" aria-label={expandedTags ? 'Show less tags' : `${tags.length - 2} more tags`} onClick={e => { | `src/features/bookmarks/components/ItemCard.tsx` | 299 |
| styling | Hardcoded pixel value found in Tailwind class: </Badge> : !showAllTags && tags.length > 3 && <Badge variant="outline" className="text-xs font-medium min-h-[32px] px-3" aria-label={`${tags.length - 3} more tags`}> | `src/features/bookmarks/components/ItemCard.tsx` | 304 |
| styling | Hardcoded pixel value found in Tailwind class: <div className="p-5 flex flex-col justify-between min-h-[220px]"> | `src/features/bookmarks/components/BookmarkCard.tsx` | 372 |
| styling | Hardcoded pixel value found in Tailwind class: <TabsTrigger value="url" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground smooth-transition min-h-[44px] md:min-h-0"> | `src/features/bookmarks/components/AddItemModal.tsx` | 548 |
| styling | Hardcoded pixel value found in Tailwind class: <TabsTrigger value="note" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground smooth-transition min-h-[44px] md:min-h-0"> | `src/features/bookmarks/components/AddItemModal.tsx` | 552 |
| styling | Hardcoded pixel value found in Tailwind class: <TabsTrigger value="image" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground smooth-transition min-h-[44px] md:min-h-0"> | `src/features/bookmarks/components/AddItemModal.tsx` | 556 |
| styling | Hardcoded pixel value found in Tailwind class: className="glass-input border-0 h-12 md:h-11 text-[15px] min-h-[44px]" | `src/features/bookmarks/components/AddItemModal.tsx` | 570 |
| styling | Hardcoded pixel value found in Tailwind class: className="w-full min-h-[48px]" | `src/features/bookmarks/components/AddItemModal.tsx` | 583 |
| styling | Hardcoded pixel value found in Tailwind class: className="glass-input min-h-[150px] md:min-h-[150px] border-0 text-[15px] resize-none" | `src/features/bookmarks/components/AddItemModal.tsx` | 597 |
| styling | Hardcoded pixel value found in Tailwind class: className="w-full min-h-[48px]" | `src/features/bookmarks/components/AddItemModal.tsx` | 608 |
| styling | Hardcoded pixel value found in Tailwind class: <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)} className="text-xs min-h-[44px]"> | `src/features/bookmarks/components/AddItemModal.tsx` | 633 |
| styling | Hardcoded pixel value found in Tailwind class: <div className="px-6 py-3 md:px-4 md:py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium min-h-[48px] flex items-center justify-center"> | `src/features/bookmarks/components/AddItemModal.tsx` | 645 |
| styling | Hardcoded pixel value found in Tailwind class: className="w-full min-h-[48px]" | `src/features/bookmarks/components/AddItemModal.tsx` | 664 |
| styling | Hardcoded pixel value found in Tailwind class: const modalSizeClasses = "w-[min(95vw,1100px)] max-w-[1100px] h-[min(85vh,720px)] overflow-hidden"; | `src/features/bookmarks/components/DetailViewModal.tsx` | 438 |
| styling | Hardcoded pixel value found in Tailwind class: <Textarea value={userNotes} onChange={e => setUserNotes(e.target.value)} placeholder="Add your notes here..." className="bg-muted/30 min-h-[120px]" readOnly={isTrashed} /> | `src/features/bookmarks/components/DetailViewModal.tsx` | 528 |
| styling | Hardcoded pixel value found in Tailwind class: <DialogContent className="sm:max-w-[500px]"> | `src/features/health/components/EmbeddingBackfillDialog.tsx` | 107 |
| styling | Hardcoded pixel value found in Tailwind class: className="w-full max-h-[500px] object-contain" | `src/features/health/components/HealthDocumentDetailModal.tsx` | 221 |
| styling | Hardcoded pixel value found in Tailwind class: <ScrollArea className="max-h-[300px]"> | `src/features/health/components/HealthDocumentDetailModal.tsx` | 315 |
| styling | Hardcoded pixel value found in Tailwind class: <div className="fixed inset-x-0 bottom-0 md:right-4 md:bottom-4 md:left-auto md:w-96 md:max-h-[600px] h-[80vh] md:h-auto glass-heavy rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col"> | `src/features/health/components/FloatingAIChatButton.tsx` | 37 |
| styling | Hardcoded pixel value found in Tailwind class: <div className="relative h-[100px] bg-muted/50 rounded-lg overflow-hidden"> | `src/features/core/pages/ComponentShowcasePage.tsx` | 150 |
| styling | Hardcoded pixel value found in Tailwind class: <div className="relative h-[150px] rounded-lg overflow-hidden border"> | `src/features/core/pages/ComponentShowcasePage.tsx` | 241 |
| styling | Hardcoded pixel value found in Tailwind class: <div className="h-[500px] border border-border rounded-xl"> | `src/features/core/pages/ViewerLoadingTestPage.tsx` | 46 |
| styling | Hardcoded pixel value found in Tailwind class: <div className="h-[500px] border border-border rounded-xl"> | `src/features/core/pages/ViewerLoadingTestPage.tsx` | 80 |
| styling | Hardcoded pixel value found in Tailwind class: className="glass-input border-0 min-h-[80px] resize-none" | `src/features/subscriptions/components/EditSubscriptionModal.tsx` | 379 |
| styling | Hardcoded pixel value found in Tailwind class: className="min-h-[44px]" | `src/features/subscriptions/components/SubscriptionFilterBar.tsx` | 76 |
| styling | Hardcoded pixel value found in Tailwind class: className="min-h-[44px]" | `src/features/subscriptions/components/SubscriptionFilterBar.tsx` | 86 |
| styling | Hardcoded pixel value found in Tailwind class: className="min-h-[44px]" | `src/features/subscriptions/components/SubscriptionFilterBar.tsx` | 103 |
| styling | Hardcoded pixel value found in Tailwind class: className="min-h-[44px]" | `src/features/subscriptions/components/SubscriptionFilterBar.tsx` | 113 |
| styling | Hardcoded pixel value found in Tailwind class: className="min-h-[44px] justify-start" | `src/features/subscriptions/components/SubscriptionFilterBar.tsx` | 140 |
| styling | Hardcoded pixel value found in Tailwind class: className="w-full min-h-[44px]" | `src/features/subscriptions/components/SubscriptionFilterBar.tsx` | 154 |
| styling | Hardcoded pixel value found in Tailwind class: className="glass-input border-0 min-h-[80px] resize-none" | `src/features/subscriptions/components/AddSubscriptionModal.tsx` | 424 |
| styling | Hardcoded pixel value found in Tailwind class: className="glass-input h-10 md:h-11 text-base font-medium rounded-2xl shadow-md focus:shadow-lg min-h-[44px] w-full" | `src/shared/components/SearchBar.tsx` | 15 |
| styling | Hardcoded pixel value found in Tailwind class: <ArrowLeft className="w-[18px] h-[18px] md:w-4 md:h-4" aria-hidden="true" /> | `src/shared/components/NavigationHeader.tsx` | 112 |
| styling | Hardcoded pixel value found in Tailwind class: <h1 className="nav-title text-base md:text-lg font-semibold text-foreground leading-none truncate max-w-[180px] md:max-w-[320px]"> | `src/shared/components/NavigationHeader.tsx` | 114 |
| styling | Hardcoded pixel value found in Tailwind class: {showInlineSearch && <div className="flex-1 relative min-w-[120px] max-w-[380px]"> | `src/shared/components/NavigationHeader.tsx` | 134 |
| styling | Hardcoded pixel value found in Tailwind class: <Plus className="w-[18px] h-[18px]" aria-hidden="true" /> | `src/shared/components/NavigationHeader.tsx` | 145 |
| styling | Hardcoded pixel value found in Tailwind class: <MoreVertical className="w-[18px] h-[18px]" aria-hidden="true" /> | `src/shared/components/NavigationHeader.tsx` | 169 |
| styling | Hardcoded pixel value found in Tailwind class: <DropdownMenuContent align="end" className="min-w-[180px]"> | `src/shared/components/NavigationHeader.tsx` | 172 |
| styling | Hardcoded pixel value found in Tailwind class: return <textarea className={cn("flex min-h-[80px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm focus-visible:shadow-md", className)} ref={ref} {...props} />; | `src/shared/components/ui/input/textarea.tsx` | 11 |
| styling | Hardcoded pixel value found in Tailwind class: const textareaClasses = cn("flex min-h-[80px] w-full rounded-lg border bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm focus-visible:shadow-md", showError && "border-destructive focus-visible:ring-destructive", showSuccess && "border-success focus-visible:ring-success", className); | `src/shared/components/ui/input/textarea.tsx` | 53 |
| styling | Hardcoded pixel value found in Tailwind class: className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)} | `src/shared/components/ui/layout/separator.tsx` | 14 |
| styling | Hardcoded pixel value found in Tailwind class: orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]", | `src/shared/components/ui/layout/scroll-area.tsx` | 27 |
| styling | Hardcoded pixel value found in Tailwind class: orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]", | `src/shared/components/ui/layout/scroll-area.tsx` | 28 |
| styling | Hardcoded pixel value found in Tailwind class: "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]", | `src/shared/components/ui/feedback/toast.tsx` | 17 |
| styling | Hardcoded pixel value found in Tailwind class: className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180" | `src/shared/components/ui/advanced/navigation-menu.tsx` | 48 |
| styling | Hardcoded pixel value found in Tailwind class: "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] group-data-[side=left]:-right-4 group-data-[side=right]:left-0 hover:after:bg-sidebar-border sm:flex", | `src/shared/components/ui/advanced/sidebar.tsx` | 238 |
| styling | Hardcoded pixel value found in Tailwind class: className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)} | `src/shared/components/ui/advanced/command.tsx` | 63 |
| styling | Hardcoded pixel value found in Tailwind class: <div className="mx-auto mt-4 h-1.5 w-[80px] rounded-full bg-foreground/20" /> | `src/shared/components/ui/modal/drawer.tsx` | 39 |
| styling | Hardcoded pixel value found in Tailwind class: <div className="flex items-center justify-around h-[72px] px-1"> | `src/shared/components/MobileBottomNav.tsx` | 46 |
| styling | Hardcoded pixel value found in Tailwind class: "flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-3 py-2 rounded-2xl transition-all duration-200", | `src/shared/components/MobileBottomNav.tsx` | 57 |
