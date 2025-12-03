import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ItemCard } from "@/components/ItemCard";
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { FilterBar, type SortOption } from "@/components/FilterBar";
import {
  SUPABASE_ITEMS_TABLE,
} from "@/constants";
import type { Item, User, ItemType } from "@/types";
import { generateSignedUrlsForItems } from "@/lib/supabase-utils";
import { formatError } from "@/lib/error-utils";
import { AuthError, NetworkError, toTypedError } from "@/types/errors";
import { AUTH_ERRORS, getNetworkErrorMessage } from "@/lib/error-messages";

// Lazy load modal components for better code splitting
const AddItemModal = lazy(() => import("@/components/AddItemModal").then(({ AddItemModal }) => ({ default: AddItemModal })));
const DetailViewModal = lazy(() => import("@/components/DetailViewModal").then(({ DetailViewModal }) => ({ default: DetailViewModal })));
const EditItemModal = lazy(() => import("@/components/EditItemModal").then(({ EditItemModal }) => ({ default: EditItemModal })));

type RawItem = Omit<Item, 'tags'> & { tags: string[] | null };

const Index = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [typeFilter, setTypeFilter] = useState<ItemType | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load bookmarks from localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('bookmarkedItems');
    if (savedBookmarks) {
      try {
        setBookmarkedItems(new Set(JSON.parse(savedBookmarks)));
      } catch (e) {
        console.error('Error loading bookmarks:', e);
      }
    }
  }, []);

  const handleBookmarkToggle = useCallback((itemId: string) => {
    setBookmarkedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      localStorage.setItem('bookmarkedItems', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Generate signed URLs for preview images
      const rawItems = (data ?? []) as any[];
      const normalizedItems: Item[] = rawItems.map((item) => ({
        ...item,
        tags: item.tags ?? [],
        preview_image_url: item.preview_image_url ?? null,
        summary: item.summary ?? null,
        user_notes: item.user_notes ?? null,
        content: item.content ?? null,
        embedding: item.embedding ? JSON.parse(item.embedding) : null,
      }));

      const itemsWithSignedUrls = await generateSignedUrlsForItems(normalizedItems);

      setItems(itemsWithSignedUrls);
      setFilteredItems(itemsWithSignedUrls);
    } catch (error: unknown) {
      const errorMessage = getNetworkErrorMessage('fetch');
      const typedError = toTypedError(error);
      const networkError = new NetworkError(
        errorMessage.message,
        typedError
      );
      
      console.error('Error fetching items:', networkError);
      toast({
        title: errorMessage.title,
        description: networkError.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      
      fetchItems();
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error deleting item:', typedError);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  }, [toast, fetchItems]);

  const handleEditItem = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setSelectedItem(item);
      setShowEditModal(true);
    }
  }, [items]);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      if (!currentUser) {
        navigate('/auth');
      } else {
        setUser(currentUser);
        fetchItems();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

    // Filter by search (sanitize input)
    if (debouncedSearchQuery) {
      const sanitizedQuery = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(sanitizedQuery) ||
        item.summary?.toLowerCase().includes(sanitizedQuery) ||
        item.user_notes?.toLowerCase().includes(sanitizedQuery)
      );
    }

    // Filter by tag
    if (selectedTag) {
      filtered = filtered.filter(item =>
        item.tags?.includes(selectedTag)
      );
    }

    // Filter by type
    if (typeFilter) {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    // Sort items
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
    setShowDetailModal(true);
  };

  const handleClearAllFilters = () => {
    setSelectedTag(null);
    setTypeFilter(null);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      const authError = new AuthError(
        AUTH_ERRORS.SIGN_OUT_FAILED.message,
        error instanceof Error ? error : undefined
      );
      toast({
        title: AUTH_ERRORS.SIGN_OUT_FAILED.title,
        description: authError.message,
        variant: "destructive",
      });
    } else {
      navigate('/');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Skip Navigation Link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md"
      >
        Skip to main content
      </a>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-1 tracking-tight">Laterr</h1>
            <p className="text-muted-foreground text-sm font-medium">Your personal knowledge space</p>
          </div>
          <nav aria-label="Main navigation" className="flex items-center gap-4">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl premium-transition hover:scale-[1.03] font-semibold"
              aria-label="Add new item to your collection"
            >
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Add Item
            </Button>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground smooth-transition"
              aria-label="Sign out of your account"
            >
              <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
              Sign Out
            </Button>
          </nav>
        </header>

        <div className="max-w-2xl mx-auto mb-4">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        <div className="mb-6">
          <FilterBar
            selectedTag={selectedTag}
            selectedSort={sortOption}
            selectedTypeFilter={typeFilter}
            onTagSelect={setSelectedTag}
            onSortChange={setSortOption}
            onTypeFilterChange={setTypeFilter}
            onClearAll={handleClearAllFilters}
          />
        </div>

        <main id="main-content">
          {/* Screen reader announcement for filtered results */}
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {loading ? "Loading items..." : `Showing ${filteredItems.length} ${filteredItems.length === 1 ? 'item' : 'items'}`}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
              {Array.from({ length: 8 }).map((_, index) => (
                <ItemCardSkeleton key={index} />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-32 space-y-5">
              <Sparkles className="h-16 w-16 mx-auto text-muted-foreground/60" aria-hidden="true" />
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Your space is empty</h2>
              <p className="text-muted-foreground text-base max-w-md mx-auto">
                Start building your knowledge by adding your first item
              </p>
            </div>
          ) : (
            <section aria-label="Items collection">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  id={item.id}
                  type={item.type}
                  title={item.title}
                  summary={item.summary}
                  previewImageUrl={item.preview_image_url}
                  tags={item.tags}
                  createdAt={item.created_at}
                  updatedAt={item.updated_at}
                  isBookmarked={bookmarkedItems.has(item.id)}
                  onBookmarkToggle={handleBookmarkToggle}
                  onDelete={handleDeleteItem}
                  onEdit={handleEditItem}
                  onClick={() => handleItemClick(item)}
                  onTagClick={setSelectedTag}
                />
              ))}
            </div>
          </section>
        )}
        </main>
      </div>

      <Suspense fallback={null}>
        <AddItemModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onItemAdded={fetchItems}
        />

        {selectedItem && (
          <>
            <DetailViewModal
              open={showDetailModal}
              onOpenChange={setShowDetailModal}
              item={selectedItem}
              onUpdate={fetchItems}
            />

            <EditItemModal
              open={showEditModal}
              onOpenChange={setShowEditModal}
              item={selectedItem}
              onItemUpdated={fetchItems}
            />
          </>
        )}
      </Suspense>
    </div>
  );
};

export default Index;
