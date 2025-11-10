import { useEffect, useState } from "react";
import { Item } from "@/types";
import { getRecommendations } from "@/lib/semantic-search";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lightbulb } from "lucide-react";
import { ItemCard } from "./ItemCard";

interface RecommendationsPanelProps {
  onItemClick?: (item: Item) => void;
  refreshTrigger?: number; // Increment to force refresh
}

/**
 * Displays recommended items based on user's recent activity and interests
 * Uses semantic similarity from embeddings to suggest relevant content
 */
export const RecommendationsPanel = ({ onItemClick, refreshTrigger = 0 }: RecommendationsPanelProps) => {
  const [recommendations, setRecommendations] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

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
            item={item}
            onClick={() => onItemClick?.(item)}
          />
        ))}
      </CardContent>
    </Card>
  );
};
