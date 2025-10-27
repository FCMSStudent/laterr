import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { AddItemModal } from "@/components/AddItemModal";
import { ItemCard } from "@/components/ItemCard";
import { DetailViewModal } from "@/components/DetailViewModal";
import { SearchBar } from "@/components/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

const Index = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
      setFilteredItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    let filtered = items;

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.user_notes?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  const allTags = Array.from(new Set(items.flatMap(item => item.tags || [])));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 pt-12 pb-4">
          <h1 className="text-7xl font-semibold tracking-tight text-foreground">
            Laterr
          </h1>
          <p className="text-lg text-muted-foreground font-light">
            Your personal knowledge garden
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center items-center max-w-4xl mx-auto">
            <span className="text-sm text-muted-foreground font-medium mr-2">Tags:</span>
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

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-24">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            <p className="mt-4 text-muted-foreground text-sm">Loading your garden...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h2 className="text-xl font-semibold">Your garden is empty</h2>
            <p className="text-muted-foreground text-sm">
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
                tags={item.tags || []}
                onClick={() => handleItemClick(item)}
                onTagClick={handleTagClick}
              />
            ))}
          </div>
        )}
      </div>

      <FloatingActionButton onClick={() => setShowAddModal(true)} />
      
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