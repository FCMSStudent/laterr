import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AddItemModal } from "@/components/AddItemModal";
import { ItemCard } from "@/components/ItemCard";
import { DetailViewModal } from "@/components/DetailViewModal";
import { SearchBar } from "@/components/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_ITEM_TAGS,
  SUPABASE_ITEMS_TABLE,
} from "@/constants";
import type { Item, User } from "@/types";
import { generateSignedUrlsForItems } from "@/lib/supabase-utils";
import { formatError } from "@/lib/error-utils";

type RawItem = Omit<Item, 'tags'> & { tags: string[] | null };

const Index = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Generate signed URLs for preview images
      const rawItems = ((data ?? []) as RawItem[]);
      const normalizedItems: Item[] = rawItems.map((item) => ({
        ...item,
        tags: item.tags ?? [],
        preview_image_url: item.preview_image_url ?? null,
        summary: item.summary ?? null,
        user_notes: item.user_notes ?? null,
        content: item.content ?? null,
      }));

      const itemsWithSignedUrls = await generateSignedUrlsForItems(normalizedItems);

      setItems(itemsWithSignedUrls);
      setFilteredItems(itemsWithSignedUrls);
    } catch (error) {
      console.error('Error fetching items:', error);
      const message = formatError(error, "Failed to load items");
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
    if (searchQuery) {
      const sanitizedQuery = searchQuery.toLowerCase().trim();
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

    setFilteredItems(filtered);
  }, [searchQuery, selectedTag, items]);

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  const allTags = Array.from(
    new Set([
      ...items.flatMap(item => item.tags || []),
      ...DEFAULT_ITEM_TAGS,
    ])
  );

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: formatError(error, "Failed to sign out"),
        variant: "destructive",
      });
    } else {
      navigate('/auth');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-apple-gray-50 to-apple-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-semibold text-apple-gray-900 mb-2">Laterr</h1>
            <p className="text-apple-gray-600 text-lg">Your personal knowledge dumpster</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary/90 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="text-apple-gray-600 hover:text-apple-gray-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center items-center max-w-4xl mx-auto mb-8">
            <span className="text-sm text-apple-gray-600 font-medium mr-2">Tags:</span>
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                className="cursor-pointer hover:scale-105 smooth-transition text-xs font-medium"
                onClick={() => handleTagClick(tag)}
              >
                #{tag}
              </Badge>
            ))}
            {selectedTag && (
              <Badge
                variant="secondary"
                className="cursor-pointer text-xs"
                onClick={() => setSelectedTag(null)}
              >
                Clear
              </Badge>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-24">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-apple-blue border-t-transparent"></div>
            <p className="mt-4 text-apple-gray-600 text-sm">Loading your garden...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-apple-gray-400" />
            <h2 className="text-xl font-semibold text-apple-gray-900">Your garden is empty</h2>
            <p className="text-apple-gray-600 text-sm">
              Click the + button to plant your first item
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-8">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                id={item.id}
                type={item.type}
                title={item.title}
                summary={item.summary}
                previewImageUrl={item.preview_image_url}
                tags={item.tags}
                onClick={() => handleItemClick(item)}
                onTagClick={handleTagClick}
              />
            ))}
          </div>
        )}
      </div>

      <AddItemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onItemAdded={fetchItems}
      />

      {selectedItem && (
        <DetailViewModal
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          item={selectedItem}
          onUpdate={fetchItems}
        />
      )}
    </div>
  );
};

export default Index;
