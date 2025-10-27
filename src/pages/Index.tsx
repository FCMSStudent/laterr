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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Laterr
          </h1>
          <p className="text-xl text-muted-foreground">
            Your personal knowledge garden 🌱
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center items-center">
            <span className="text-sm text-muted-foreground">Filter by tag:</span>
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => handleTagClick(tag)}
              >
                #{tag}
              </Badge>
            ))}
            {selectedTag && (
              <Badge
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setSelectedTag(null)}
              >
                Clear filter
              </Badge>
            )}
          </div>
        )}

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading your garden...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Sparkles className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Your garden is empty</h2>
            <p className="text-muted-foreground">
              Click the + button to plant your first item!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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