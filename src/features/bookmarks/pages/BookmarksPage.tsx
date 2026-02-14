import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookmarkCard } from "@/features/bookmarks/components/BookmarkCard";
import { ItemListRow } from "@/features/bookmarks/components/ItemListRow";
import { ItemCardSkeleton } from "@/features/bookmarks/components/ItemCardSkeleton";
import { Button, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui";
import { Sparkles, Plus, Loader2, Search, Settings, LogOut, MoreVertical, Sun } from "lucide-react";
import { useToast } from "@/shared/hooks/useToast";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useIsMobile } from "@/shared/hooks/useMobile";
import { useProgressiveDisclosure } from "@/shared/hooks/useProgressiveDisclosure";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { LoadingSpinner } from "@/shared/components/ui";
import { useTheme } from "next-themes";
import { AuthError } from "@/shared/types/errors";
import { AUTH_ERRORS } from "@/shared/lib/error-messages";
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
import { removeItemStorageObjects, removeMultipleItemsStorageObjects } from "@/features/bookmarks/utils/trash";

const PAGE_SIZE = 20;

type OpenItemEventDetail = {
  id: string;
};

  const OPEN_ITEM_EVENT = "bookmarks:open-item";

  type ItemRow = Omit<Item, "embedding"> & {
    embedding: string | null;
  };

  const Index = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[]>([]);
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
  const { theme, setTheme } = useTheme();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isMobile = useIsMobile();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      const authError = new AuthError(AUTH_ERRORS.SIGN_OUT_FAILED.message, error instanceof Error ? error : undefined);
      toast({
        title: AUTH_ERRORS.SIGN_OUT_FAILED.title,
        description: authError.message,
        variant: "destructive"
      });
      setSigningOut(false);
    } else {
      navigate('/');
    }
  };

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

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
      const rawItems = (data ?? []) as ItemRow[];
      const normalizedItems: Item[] = rawItems.map(item => ({
        ...item,
        tags: item.tags ?? [],
        preview_image_url: item.preview_image_url ?? null,
        summary: item.summary ?? null,
        user_notes: item.user_notes ?? null,
        content: item.content ?? null,
        embedding: item.embedding ? (JSON.parse(item.embedding) as number[]) : null,
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
      await removeMultipleItemsStorageObjects(itemsToDelete);
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
  const filteredItems = useMemo(() => {
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
    return sorted;
  }, [debouncedSearchQuery, selectedTag, items, typeFilter, sortOption, viewScope]);
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
  const handleItemClick = useCallback((id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    setSelectedItem(item);
    // Open note editor for note-type items, detail modal for others
    if (item.type === 'note' && !item.deleted_at) {
      setShowNoteEditor(true);
    } else {
      setShowDetailModal(true);
    }
  }, [items]);

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
  const handleClearAllFilters = useCallback(() => {
    setSelectedTag(null);
    setTypeFilter(null);
  }, []);
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
      {/* Unified Header Bar */}
      <header className="flex items-center gap-3 py-2 mb-4">
        {/* Title */}
        <h1 className="text-lg font-semibold text-foreground shrink-0">
          Bookmarks
        </h1>

        {/* All/Trash Toggle */}
        <div className="relative inline-flex items-center rounded-full border border-border/50 bg-muted/20 p-0.5 shrink-0">
          <span
            className={`absolute inset-y-0.5 w-1/2 rounded-full bg-background shadow-sm transition-transform duration-200 ${viewScope === "trash" ? "translate-x-full" : "translate-x-0"}`}
            aria-hidden="true"
          />
          <button
            type="button"
            className={`relative z-10 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${viewScope === "active" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewScope("active")}
          >
            All
          </button>
          <button
            type="button"
            className={`relative z-10 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${viewScope === "trash" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewScope("trash")}
          >
            Trash
          </button>
        </div>

        {/* Search Input */}
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full h-8 pl-9 pr-3 rounded-full border border-border/50 bg-muted/20 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-transparent transition-shadow"
            data-search-input
          />
        </div>

        {/* Filter Button (mobile) */}
        <MobileFilterSortButton
          selectedTag={selectedTag}
          selectedTypeFilter={typeFilter}
          selectedSort={sortOption}
          onTagSelect={setSelectedTag}
          onTypeFilterChange={setTypeFilter}
          onSortChange={setSortOption}
          onClearAll={handleClearAllFilters}
        />

        {/* Add Button */}
        {!isTrashView && (
          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        )}

        {/* Settings & Actions */}
        <AlertDialog>
          {!isMobile && (
            <>
              <Button
                onClick={() => navigate("/settings")}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground/80 hover:text-foreground shrink-0"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </Button>
              <div className="opacity-85 hover:opacity-100 transition-opacity">
                <ThemeToggle />
              </div>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground/80 hover:text-foreground shrink-0"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </Button>
              </AlertDialogTrigger>
            </>
          )}

          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="More options"
                >
                  <MoreVertical className="w-[18px] h-[18px]" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem onSelect={() => /* @perf-check */ navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleToggleTheme}>
                  <Sun className="mr-2 h-4 w-4" aria-hidden="true" />
                  Toggle theme
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                    Sign out
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll need to sign in again to access your data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSignOut}
                disabled={signingOut}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {signingOut ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Signing out...
                  </>
                ) : (
                  "Sign Out"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>




      <main id="main-content">
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {loading ? "Loading items..." : `Showing ${filteredItems.length} ${filteredItems.length === 1 ? 'item' : 'items'}`}
        </div>


        {loading ? <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 md:gap-6 pb-12">
          {Array.from({
            length: 8
          }).map((_, index) => (
            <div key={index} className="break-inside-avoid mb-5 md:mb-6">
              <ItemCardSkeleton />
            </div>
          ))}
        </div> : filteredItems.length === 0 ? <div data-testid="bookmarks-empty-state" className="text-center py-32 space-y-5">
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
        </div> : <section aria-label="Items collection" data-testid="bookmarks-collection">
          {viewMode === 'grid' ? <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 md:gap-6 pt-1 pb-12">
            {filteredItems.map(item => (
              <div key={item.id} className="break-inside-avoid mb-5 md:mb-6">
                <BookmarkCard id={item.id} type={item.type} title={item.title} summary={item.summary} previewImageUrl={item.preview_image_url} content={item.content} tags={item.tags} createdAt={item.created_at} onDelete={handleMoveToTrash} onRestore={handleRestoreItem} onPermanentDelete={handlePermanentDeleteItem} isTrashed={Boolean(item.deleted_at)} onEdit={handleEditItem} onClick={handleItemClick} onTagClick={setSelectedTag} isSelectionMode={isSelectionMode} isSelected={selectedItems.has(item.id)} onSelectionChange={handleSelectionChange} />
              </div>
            ))}
          </div> : <div className="space-y-2 pb-12">
            {filteredItems.map(item => <ItemListRow key={item.id} id={item.id} type={item.type} title={item.title} summary={item.summary} previewImageUrl={item.preview_image_url} content={item.content} tags={item.tags} createdAt={item.created_at} updatedAt={item.updated_at} onDelete={handleMoveToTrash} onRestore={handleRestoreItem} onPermanentDelete={handlePermanentDeleteItem} isTrashed={Boolean(item.deleted_at)} onEdit={handleEditItem} onClick={handleItemClick} onTagClick={setSelectedTag} isSelectionMode={isSelectionMode} isSelected={selectedItems.has(item.id)} onSelectionChange={handleSelectionChange} />)}
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
    <BulkActionsBar mode={isTrashView ? "trash" : "active"} selectedCount={selectedItems.size} totalCount={filteredItems.length} onSelectAll={handleSelectAll} onDeselectAll={handleDeselectAll} onDelete={handleBulkMoveToTrash} onRestore={handleBulkRestore} onPermanentDelete={handleBulkPermanentDelete} onCancel={() => /* @perf-check */ {
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
