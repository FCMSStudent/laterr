import { useState, useEffect, useCallback, lazy, Suspense, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookmarkCard } from "@/features/bookmarks/components/BookmarkCard";
import { ItemListRow } from "@/features/bookmarks/components/ItemListRow";
import { ItemCardSkeleton } from "@/features/bookmarks/components/ItemCardSkeleton";
import { SearchBar } from "@/shared/components/SearchBar";
import { NavigationHeader } from "@/shared/components/NavigationHeader";
import { Button } from "@/ui";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useProgressiveDisclosure } from "@/shared/hooks/useProgressiveDisclosure";
import { FilterBar, MobileFilterButton, MobileSortButton, type SortOption, type ViewMode } from "@/features/bookmarks/components/FilterBar";
import { BulkActionsBar } from "@/features/bookmarks/components/BulkActionsBar";
import { useInfiniteScroll } from "@/features/bookmarks/hooks/useInfiniteScroll";
import { SUPABASE_ITEMS_TABLE } from "@/features/bookmarks/constants";
import type { Item, User, ItemType } from "@/features/bookmarks/types";
import { generateSignedUrlsForItems } from "@/shared/lib/supabase-utils";
import { NetworkError, toTypedError } from "@/shared/types/errors";
import { getNetworkErrorMessage } from "@/shared/lib/error-messages";

// Lazy load modal components for better code splitting
const AddItemModal = lazy(() => import("@/features/bookmarks/components/AddItemModal").then(({
  AddItemModal
}) => ({
  default: AddItemModal
})));
const DetailViewModal = lazy(() => import("@/features/bookmarks/components/DetailViewModal").then(({
  DetailViewModal
}) => ({
  default: DetailViewModal
})));
const EditItemModal = lazy(() => import("@/features/bookmarks/components/EditItemModal").then(({
  EditItemModal
}) => ({
  default: EditItemModal
})));
const NoteEditorModal = lazy(() => import("@/features/bookmarks/components/NoteEditorModal").then(({
  NoteEditorModal
}) => ({
  default: NoteEditorModal
})));
const PAGE_SIZE = 20;
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
      const {
        data,
        error
      } = await supabase.from(SUPABASE_ITEMS_TABLE).select('*').order('created_at', {
        ascending: false
      }).range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      const rawItems = (data ?? []) as any[];
      const normalizedItems: Item[] = rawItems.map(item => ({
        ...item,
        tags: item.tags ?? [],
        preview_image_url: item.preview_image_url ?? null,
        summary: item.summary ?? null,
        user_notes: item.user_notes ?? null,
        content: item.content ?? null,
        embedding: item.embedding ? JSON.parse(item.embedding) : null
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
  }, [toast]);

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
  const handleDeleteItem = useCallback(async (itemId: string) => {
    try {
      const {
        error
      } = await supabase.from(SUPABASE_ITEMS_TABLE).delete().eq('id', itemId);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Item deleted successfully"
      });
      // Reset pagination and refetch
      setPage(0);
      fetchItems(0, false);
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error deleting item:', typedError);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  }, [toast, fetchItems]);
  const handleBulkDelete = useCallback(async () => {
    try {
      const ids = Array.from(selectedItems);
      const {
        error
      } = await supabase.from(SUPABASE_ITEMS_TABLE).delete().in('id', ids);
      if (error) throw error;
      toast({
        title: "Success",
        description: `${ids.length} items deleted successfully`
      });
      setIsSelectionMode(false);
      setSelectedItems(new Set());
      setPage(0);
      fetchItems(0, false);
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error deleting items:', typedError);
      toast({
        title: "Error",
        description: "Failed to delete items",
        variant: "destructive"
      });
    }
  }, [selectedItems, toast, fetchItems]);
  const handleEditItem = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
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
    switch (sortOption) {
      case "date-asc":
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "date-desc":
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
  }, [debouncedSearchQuery, selectedTag, items, typeFilter, sortOption]);
  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    // Open note editor for note-type items, detail modal for others
    if (item.type === 'note') {
      setShowNoteEditor(true);
    } else {
      setShowDetailModal(true);
    }
  };
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
        <NavigationHeader title="Bookmarks" onAddClick={() => setShowAddModal(true)} addLabel="Add" searchValue={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Search" filterButton={<MobileFilterButton selectedTag={selectedTag} selectedTypeFilter={typeFilter} selectedSort={sortOption} onTagSelect={setSelectedTag} onTypeFilterChange={setTypeFilter} onSortChange={setSortOption} onClearAll={handleClearAllFilters} />} sortButton={<MobileSortButton selectedSort={sortOption} onSortChange={setSortOption} />} />
      </div>




      <main id="main-content">
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {loading ? "Loading items..." : `Showing ${filteredItems.length} ${filteredItems.length === 1 ? 'item' : 'items'}`}
        </div>


        {loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-12">
          {Array.from({
            length: 8
          }).map((_, index) => <ItemCardSkeleton key={index} />)}
        </div> : filteredItems.length === 0 ? <div className="text-center py-32 space-y-5">
          <Sparkles className="h-16 w-16 mx-auto text-muted-foreground/60" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Your space is empty</h2>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Start building your knowledge by adding your first item
          </p>
          <Button onClick={() => setShowAddModal(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Add your first bookmark
          </Button>
        </div> : <section aria-label="Items collection">
          {viewMode === 'grid' ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6 pb-12">
            {filteredItems.map(item => <BookmarkCard key={item.id} id={item.id} type={item.type} title={item.title} summary={item.summary} previewImageUrl={item.preview_image_url} content={item.content} tags={item.tags} createdAt={item.created_at} onDelete={handleDeleteItem} onEdit={handleEditItem} onClick={() => handleItemClick(item)} onTagClick={setSelectedTag} isSelectionMode={isSelectionMode} isSelected={selectedItems.has(item.id)} onSelectionChange={handleSelectionChange} />)}
          </div> : <div className="space-y-2 pb-12">
            {filteredItems.map(item => <ItemListRow key={item.id} id={item.id} type={item.type} title={item.title} summary={item.summary} previewImageUrl={item.preview_image_url} content={item.content} tags={item.tags} createdAt={item.created_at} updatedAt={item.updated_at} onDelete={handleDeleteItem} onEdit={handleEditItem} onClick={() => handleItemClick(item)} onTagClick={setSelectedTag} isSelectionMode={isSelectionMode} isSelected={selectedItems.has(item.id)} onSelectionChange={handleSelectionChange} />)}
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
    <BulkActionsBar selectedCount={selectedItems.size} totalCount={filteredItems.length} onSelectAll={handleSelectAll} onDeselectAll={handleDeselectAll} onDelete={handleBulkDelete} onCancel={() => {
      setIsSelectionMode(false);
      setSelectedItems(new Set());
    }} />

    <Suspense fallback={null}>
      <AddItemModal open={showAddModal} onOpenChange={setShowAddModal} onItemAdded={handleRefresh} />

      {selectedItem && <>
        <DetailViewModal open={showDetailModal} onOpenChange={setShowDetailModal} item={selectedItem} onUpdate={handleRefresh} />
        <EditItemModal open={showEditModal} onOpenChange={setShowEditModal} item={selectedItem} onItemUpdated={handleRefresh} />
        <NoteEditorModal open={showNoteEditor} onOpenChange={setShowNoteEditor} item={selectedItem} onUpdate={handleRefresh} />
      </>}
    </Suspense>
  </div>;
};
export default Index;