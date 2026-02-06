import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookmarkCard } from "@/features/bookmarks/components/BookmarkCard";
import { ItemListRow } from "@/features/bookmarks/components/ItemListRow";
import { ItemCardSkeleton } from "@/features/bookmarks/components/ItemCardSkeleton";
import { SearchBar } from "@/shared/components/SearchBar";
import { NavigationHeader } from "@/shared/components/NavigationHeader";
import { Button } from "@/shared/components/ui";
import { Sparkles, Plus, Loader2, Search } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useProgressiveDisclosure } from "@/shared/hooks/useProgressiveDisclosure";
import { FilterBar, MobileFilterSortButton, type SortOption, type ViewMode } from "@/features/bookmarks/components/FilterBar";
import { BulkActionsBar } from "@/features/bookmarks/components/BulkActionsBar";
import { useInfiniteScroll } from "@/features/bookmarks/hooks/useInfiniteScroll";
import { SUPABASE_ITEMS_TABLE } from "@/features/bookmarks/constants";
import type { Item, User, ItemType } from "@/features/bookmarks/types";
import { generateSignedUrlsForItems } from "@/shared/lib/supabase-utils";
import { NetworkError, toTypedError } from "@/shared/types/errors";
import { getNetworkErrorMessage } from "@/shared/lib/error-messages";
import { AddItemModal } from "@/features/bookmarks/components/AddItemModal";
import { DetailViewModal } from "@/features/bookmarks/components/DetailViewModal";
import { EditItemModal } from "@/features/bookmarks/components/EditItemModal";
import { NoteEditorModal } from "@/features/bookmarks/components/NoteEditorModal";
import { removeItemStorageObjects } from "@/features/bookmarks/utils/trash";

const PAGE_SIZE = 20;

type OpenItemEventDetail = {
  id: string;
};

const OPEN_ITEM_EVENT = "bookmarks:open-item";
const Index = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [typeFilter, setTypeFilter] = useState<ItemType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return localStorage.getItem('bookmarks-view-mode') as ViewMode || 'grid';
  });
  const [viewScope, setViewScope] = useState<"active" | "trash">("active");
  const isTrashView = viewScope === "trash";

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Filter bar collapsed state
  const {
    expanded: filtersExpanded,
    toggle: toggleFilters
  } = useProgressiveDisclosure({
    storageKey: 'bookmarks-filters-expanded',
    defaultExpanded: false
  });
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isMobile = useIsMobile();

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('bookmarks-view-mode', viewMode);
  }, [viewMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // "n" for new item
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowAddModal(true);
      }

      // Escape to exit selection mode
      if (e.key === 'Escape' && isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedItems(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode]);
  const fetchItems = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const orderField = viewScope === "trash" ? "deleted_at" : "created_at";
      let query = supabase
        .from(SUPABASE_ITEMS_TABLE)
        .select('*')
        .order(orderField, { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (viewScope === "trash") {
        query = query.not('deleted_at', 'is', null);
      } else {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rawItems = (data ?? []) as any[];
      const normalizedItems: Item[] = rawItems.map(item => ({
        ...item,
        tags: item.tags ?? [],
        preview_image_url: item.preview_image_url ?? null,
        summary: item.summary ?? null,
        user_notes: item.user_notes ?? null,
        content: item.content ?? null,
        embedding: item.embedding ? JSON.parse(item.embedding) : null,
        deleted_at: item.deleted_at ?? null
      }));
      const itemsWithSignedUrls = await generateSignedUrlsForItems(normalizedItems);
      setHasMore(rawItems.length === PAGE_SIZE);
      if (append) {
        setItems(prev => [...prev, ...itemsWithSignedUrls]);
      } else {
        setItems(itemsWithSignedUrls);
      }
    } catch (error: unknown) {
      const errorMessage = getNetworkErrorMessage('fetch');
      const typedError = toTypedError(error);
      const networkError = new NetworkError(errorMessage.message, typedError);
      console.error('Error fetching items:', networkError);
      toast({
        title: errorMessage.title,
        description: networkError.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [toast, viewScope]);

  // Load more when page changes
  useEffect(() => {
    if (page > 0) {
      fetchItems(page, true);
    }
  }, [page, fetchItems]);

  // Infinite scroll hook
  const {
    loadMoreRef
  } = useInfiniteScroll({
    loading: loadingMore,
    hasMore,
    onLoadMore: () => setPage(prev => prev + 1)
  });
  const handleMoveToTrash = useCallback(async (itemId: string) => {
    try {
      const {
        error
      } = await supabase.from(SUPABASE_ITEMS_TABLE).update({
        deleted_at: new Date().toISOString()
      }).eq('id', itemId);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Item moved to trash"
      });
      // Reset pagination and refetch
      setPage(0);
      fetchItems(0, false);
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error moving item to trash:', typedError);
      toast({
        title: "Error",
        description: "Failed to move item to trash",
        variant: "destructive"
      });
    }
  }, [toast, fetchItems]);
  const handleBulkMoveToTrash = useCallback(async () => {
    try {
      const ids = Array.from(selectedItems);
      const {
        error
      } = await supabase.from(SUPABASE_ITEMS_TABLE).update({
        deleted_at: new Date().toISOString()
      }).in('id', ids);
      if (error) throw error;
      toast({
        title: "Success",
        description: `${ids.length} items moved to trash`
      });
      setIsSelectionMode(false);
      setSelectedItems(new Set());
      setPage(0);
      fetchItems(0, false);
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error moving items to trash:', typedError);
      toast({
        title: "Error",
        description: "Failed to move items to trash",
        variant: "destructive"
      });
    }
  }, [selectedItems, toast, fetchItems]);
  const handleRestoreItem = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase.from(SUPABASE_ITEMS_TABLE).update({
        deleted_at: null
      }).eq('id', itemId);
      if (error) throw error;
      toast({
        title: "Restored",
        description: "Item restored from trash"
      });
      setPage(0);
      fetchItems(0, false);
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error restoring item:', typedError);
      toast({
        title: "Error",
        description: "Failed to restore item",
        variant: "destructive"
      });
    }
  }, [toast, fetchItems]);
  const handleBulkRestore = useCallback(async () => {
    try {
      const ids = Array.from(selectedItems);
      const { error } = await supabase.from(SUPABASE_ITEMS_TABLE).update({
        deleted_at: null
      }).in('id', ids);
      if (error) throw error;
      toast({
        title: "Restored",
        description: `${ids.length} items restored`
      });
      setIsSelectionMode(false);
      setSelectedItems(new Set());
      setPage(0);
      fetchItems(0, false);
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error restoring items:', typedError);
      toast({
        title: "Error",
        description: "Failed to restore items",
        variant: "destructive"
      });
    }
  }, [selectedItems, toast, fetchItems]);
  const handlePermanentDeleteItem = useCallback(async (itemId: string) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (item) {
        await removeItemStorageObjects(item);
      }
      const { error } = await supabase.from(SUPABASE_ITEMS_TABLE).delete().eq('id', itemId);
      if (error) throw error;
      toast({
        title: "Deleted",
        description: "Item permanently deleted"
      });
      setPage(0);
      fetchItems(0, false);
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error permanently deleting item:', typedError);
      toast({
        title: "Error",
        description: "Failed to permanently delete item",
        variant: "destructive"
      });
    }
  }, [items, toast, fetchItems]);
  const handleBulkPermanentDelete = useCallback(async () => {
    try {
      const ids = Array.from(selectedItems);
      const itemsToDelete = items.filter(item => ids.includes(item.id));
      await Promise.all(itemsToDelete.map(item => removeItemStorageObjects(item)));
      const { error } = await supabase.from(SUPABASE_ITEMS_TABLE).delete().in('id', ids);
      if (error) throw error;
      toast({
        title: "Deleted",
        description: `${ids.length} items permanently deleted`
      });
      setIsSelectionMode(false);
      setSelectedItems(new Set());
      setPage(0);
      fetchItems(0, false);
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error permanently deleting items:', typedError);
      toast({
        title: "Error",
        description: "Failed to permanently delete items",
        variant: "destructive"
      });
    }
  }, [items, selectedItems, toast, fetchItems]);
  const handleEditItem = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item && !item.deleted_at) {
      setSelectedItem(item);
      setShowEditModal(true);
    }
  }, [items]);
  const handleSelectionChange = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(itemId);
        // Enable selection mode when first item is selected
        if (!isSelectionMode) {
          setIsSelectionMode(true);
        }
      } else {
        newSet.delete(itemId);
        // Exit selection mode if no items selected
        if (newSet.size === 0) {
          setIsSelectionMode(false);
        }
      }
      return newSet;
    });
  }, [isSelectionMode]);
  const handleSelectAll = useCallback(() => {
    setSelectedItems(new Set(filteredItems.map(item => item.id)));
  }, [filteredItems]);
  const handleDeselectAll = useCallback(() => {
    setSelectedItems(new Set());
  }, []);
  const handleSelectionModeToggle = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev) {
        setSelectedItems(new Set());
      }
      return !prev;
    });
  }, []);
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      const currentUser = session?.user ?? null;
      if (!currentUser) {
        navigate('/auth');
      } else {
        setUser(currentUser);
        fetchItems(0, false);
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user ?? null);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, fetchItems]);
  useEffect(() => {
    if (!user) return;
    setPage(0);
    setHasMore(true);
    setIsSelectionMode(false);
    setSelectedItems(new Set());
    fetchItems(0, false);
  }, [viewScope, user, fetchItems]);
  useEffect(() => {
    let filtered = items;
    if (debouncedSearchQuery) {
      const sanitizedQuery = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => item.title.toLowerCase().includes(sanitizedQuery) || item.summary?.toLowerCase().includes(sanitizedQuery) || item.user_notes?.toLowerCase().includes(sanitizedQuery));
    }
    if (selectedTag) {
      filtered = filtered.filter(item => item.tags?.includes(selectedTag));
    }
    if (typeFilter) {
      filtered = filtered.filter(item => item.type === typeFilter);
    }
    const sorted = [...filtered];
    const getSortDate = (item: Item) => {
      if (viewScope === "trash") {
        return new Date(item.deleted_at || item.created_at).getTime();
      }
      return new Date(item.created_at).getTime();
    };
    switch (sortOption) {
      case "date-asc":
        sorted.sort((a, b) => getSortDate(a) - getSortDate(b));
        break;
      case "date-desc":
        sorted.sort((a, b) => getSortDate(b) - getSortDate(a));
        break;
      case "title-asc":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title-desc":
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "type":
        sorted.sort((a, b) => a.type.localeCompare(b.type));
        break;
    }
    setFilteredItems(sorted);
  }, [debouncedSearchQuery, selectedTag, items, typeFilter, sortOption, viewScope]);
  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    // Open note editor for note-type items, detail modal for others
    if (item.type === 'note' && !item.deleted_at) {
      setShowNoteEditor(true);
    } else {
      setShowDetailModal(true);
    }
  };

  // Allow nested UIs (like DetailViewModal) to request opening another item.
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<OpenItemEventDetail>;
      const id = custom.detail?.id;
      if (!id) return;

      const found = items.find((i) => i.id === id);
      if (!found) return;

      // Close any open modal first to prevent stacked dialogs.
      setShowDetailModal(false);
      setShowEditModal(false);
      setShowNoteEditor(false);

      // Open after a short tick.
      setTimeout(() => {
        setSelectedItem(found);
        if (found.type === 'note' && !found.deleted_at) {
          setShowNoteEditor(true);
        } else {
          setShowDetailModal(true);
        }
      }, 0);
    };

    window.addEventListener(OPEN_ITEM_EVENT, handler);
    return () => window.removeEventListener(OPEN_ITEM_EVENT, handler);
  }, [items]);
  const handleClearAllFilters = () => {
    setSelectedTag(null);
    setTypeFilter(null);
  };
  const handleRefresh = useCallback(() => {
    setPage(0);
    fetchItems(0, false);
  }, [fetchItems]);
  if (!user) {
    return null;
  }
  return <div className="min-h-screen pb-20 md:pb-0">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md">
      Skip to main content
    </a>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="mb-4">
        <NavigationHeader title="Bookmarks" onAddClick={isTrashView ? undefined : () => setShowAddModal(true)} addLabel="Add" filterButton={<MobileFilterSortButton selectedTag={selectedTag} selectedTypeFilter={typeFilter} selectedSort={sortOption} onTagSelect={setSelectedTag} onTypeFilterChange={setTypeFilter} onSortChange={setSortOption} onClearAll={handleClearAllFilters} />} />
      </div>

      {/* Unified Search & Filter Bar */}
      <div className="flex items-center gap-3 pb-3">
        {/* All/Trash Toggle */}
        <div className="relative inline-flex items-center rounded-full border border-border/60 bg-muted/30 p-1 shrink-0">
          <span
            className={`absolute inset-y-1 w-1/2 rounded-full bg-background shadow-sm transition-transform duration-200 ${viewScope === "trash" ? "translate-x-full" : "translate-x-0"}`}
            aria-hidden="true"
          />
          <Button
            size="sm"
            variant={viewScope === "active" ? "secondary" : "ghost"}
            className={`relative z-10 rounded-full px-3 transition-colors ${viewScope === "active" ? "text-foreground bg-transparent hover:bg-transparent" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewScope("active")}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={viewScope === "trash" ? "secondary" : "ghost"}
            className={`relative z-10 rounded-full px-3 transition-colors ${viewScope === "trash" ? "text-foreground bg-transparent hover:bg-transparent" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewScope("trash")}
          >
            Trash
          </Button>
        </div>

        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookmarks..."
            className="w-full h-9 pl-9 pr-3 rounded-full border border-border/60 bg-muted/30 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-transparent transition-shadow"
            data-search-input
          />
        </div>
      </div>




      <main id="main-content">
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {loading ? "Loading items..." : `Showing ${filteredItems.length} ${filteredItems.length === 1 ? 'item' : 'items'}`}
        </div>


        {loading ? <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 md:gap-6 pb-12 [column-fill:_balance]">
          {Array.from({
            length: 8
          }).map((_, index) => (
            <div key={index} className="break-inside-avoid mb-5 md:mb-6">
              <ItemCardSkeleton />
            </div>
          ))}
        </div> : filteredItems.length === 0 ? <div className="text-center py-32 space-y-5">
          <Sparkles className="h-16 w-16 mx-auto text-muted-foreground/60" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            {isTrashView ? "Trash is empty" : "Your space is empty"}
          </h2>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            {isTrashView
              ? "Items auto-delete after 30 days."
              : "Start building your knowledge by adding your first item"}
          </p>
          {!isTrashView && (
            <Button onClick={() => setShowAddModal(true)} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Add your first bookmark
            </Button>
          )}
        </div> : <section aria-label="Items collection">
          {viewMode === 'grid' ? <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 md:gap-6 pb-12 [column-fill:_balance]">
            {filteredItems.map(item => (
              <div key={item.id} className="break-inside-avoid mb-5 md:mb-6">
                <BookmarkCard id={item.id} type={item.type} title={item.title} summary={item.summary} previewImageUrl={item.preview_image_url} content={item.content} tags={item.tags} createdAt={item.created_at} onDelete={handleMoveToTrash} onRestore={handleRestoreItem} onPermanentDelete={handlePermanentDeleteItem} isTrashed={Boolean(item.deleted_at)} onEdit={handleEditItem} onClick={() => handleItemClick(item)} onTagClick={setSelectedTag} isSelectionMode={isSelectionMode} isSelected={selectedItems.has(item.id)} onSelectionChange={handleSelectionChange} />
              </div>
            ))}
          </div> : <div className="space-y-2 pb-12">
            {filteredItems.map(item => <ItemListRow key={item.id} id={item.id} type={item.type} title={item.title} summary={item.summary} previewImageUrl={item.preview_image_url} content={item.content} tags={item.tags} createdAt={item.created_at} updatedAt={item.updated_at} onDelete={handleMoveToTrash} onRestore={handleRestoreItem} onPermanentDelete={handlePermanentDeleteItem} isTrashed={Boolean(item.deleted_at)} onEdit={handleEditItem} onClick={() => handleItemClick(item)} onTagClick={setSelectedTag} isSelectionMode={isSelectionMode} isSelected={selectedItems.has(item.id)} onSelectionChange={handleSelectionChange} />)}
          </div>}

          {/* Infinite scroll sentinel */}
          {hasMore && <div ref={loadMoreRef} className="flex justify-center py-8">
            {loadingMore && <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>}
          </div>}
        </section>}
      </main>
    </div>



    {/* Bulk Actions Bar */}
    <BulkActionsBar mode={isTrashView ? "trash" : "active"} selectedCount={selectedItems.size} totalCount={filteredItems.length} onSelectAll={handleSelectAll} onDeselectAll={handleDeselectAll} onDelete={handleBulkMoveToTrash} onRestore={handleBulkRestore} onPermanentDelete={handleBulkPermanentDelete} onCancel={() => {
      setIsSelectionMode(false);
      setSelectedItems(new Set());
    }} />

    <AddItemModal open={showAddModal} onOpenChange={setShowAddModal} onItemAdded={handleRefresh} />

    {selectedItem && <>
      <DetailViewModal open={showDetailModal} onOpenChange={setShowDetailModal} item={selectedItem} onUpdate={handleRefresh} />
      <EditItemModal open={showEditModal} onOpenChange={setShowEditModal} item={selectedItem} onItemUpdated={handleRefresh} />
      <NoteEditorModal open={showNoteEditor} onOpenChange={setShowNoteEditor} item={selectedItem} onUpdate={handleRefresh} />
    </>}
  </div>;
};
export default Index;
