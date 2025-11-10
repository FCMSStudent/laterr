import { useEffect, useState } from "react";
import { Item } from "@/types";
import { findSimilarItems } from "@/lib/semantic-search";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { ItemCard } from "./ItemCard";

interface SimilarItemsPanelProps {
  itemId: string;
  onItemClick?: (item: Item) => void;
}

/**
 * Displays items that are semantically similar based on embeddings
 * Uses cosine similarity to find related content
 */
export const SimilarItemsPanel = ({ itemId, onItemClick }: SimilarItemsPanelProps) => {
  const [similarItems, setSimilarItems] = useState<(Item & { similarity: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSimilarItems = async () => {
      setLoading(true);
      try {
        const items = await findSimilarItems(itemId, 5, 0.7);
        setSimilarItems(items);
      } catch (error) {
        console.error('Failed to load similar items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSimilarItems();
  }, [itemId]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Similar Items
          </CardTitle>
          <CardDescription>Finding related content...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (similarItems.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Similar Items
          </CardTitle>
          <CardDescription>No similar items found yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Similar Items
        </CardTitle>
        <CardDescription>
          Related content based on semantic similarity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {similarItems.map((item) => (
          <div key={item.id} className="relative">
            <ItemCard
              item={item}
              onClick={() => onItemClick?.(item)}
            />
            <div className="absolute top-2 right-2 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
              {Math.round(item.similarity * 100)}% match
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
