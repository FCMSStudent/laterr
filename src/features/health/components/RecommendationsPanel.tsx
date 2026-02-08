import { useEffect, useState, useCallback } from "react";
import { Item } from "@/features/bookmarks/types";
import { getRecommendations } from "@/features/bookmarks/utils/semantic-search";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui";
import { Loader2, Lightbulb } from "lucide-react";
import { ItemCard } from "@/features/bookmarks/components/ItemCard";

interface RecommendationsPanelProps {
  onItemClick?: (item: Item) => void;
  refreshTrigger?: number; // Increment to force refresh
}

/**
 * Displays recommended items based on user's recent activity and interests
 * Uses semantic similarity from embeddings to suggest relevant content
 */
const STABLE_EMPTY_TAG_HANDLER = () => {};

export const RecommendationsPanel = ({ onItemClick, refreshTrigger = 0 }: RecommendationsPanelProps) => {
  const [recommendations, setRecommendations] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const handleItemClick = useCallback((id: string) => {
    const item = recommendations.find(i => i.id === id);
    if (item && onItemClick) {
      onItemClick(item);
    }
  }, [recommendations, onItemClick]);

  useEffect(() => {
    const loadRecommendations = async () => {
      setLoading(true);
      try {
        const items = await getRecommendations(5);
        setRecommendations(items);
      } catch (error) {
        console.error('Failed to load recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Recommended for You
          </CardTitle>
          <CardDescription>Finding personalized recommendations...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Recommended for You
          </CardTitle>
          <CardDescription>
            Add more items to get personalized recommendations
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Recommended for You
        </CardTitle>
        <CardDescription>
          Based on your saved content and interests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((item) => (
          <ItemCard
            key={item.id}
            id={item.id}
            type={item.type}
            title={item.title}
            summary={item.summary}
            previewImageUrl={item.preview_image_url}
            tags={item.tags || []}
            createdAt={item.created_at}
            updatedAt={item.updated_at}
            onClick={handleItemClick}
            onTagClick={STABLE_EMPTY_TAG_HANDLER}
          />
        ))}
      </CardContent>
    </Card>
  );
};
