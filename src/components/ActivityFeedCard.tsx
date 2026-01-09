import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, CreditCard, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { UnifiedActivity } from "@/hooks/useUnifiedActivity";

interface ActivityFeedCardProps {
  activity: UnifiedActivity;
}

export const ActivityFeedCard = ({ activity }: ActivityFeedCardProps) => {
  const getIcon = () => {
    switch (activity.entity_type) {
      case 'bookmark':
        return <Bookmark className="h-4 w-4 text-blue-500" />;
      case 'subscription':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'health_measurement':
        return <Activity className="h-4 w-4 text-purple-500" />;
    }
  };

  const getBadgeText = () => {
    switch (activity.activity_type) {
      case 'created':
        return 'Created';
      case 'renewal_due':
        return 'Renewal Due';
      case 'recorded':
        return 'Recorded';
    }
  };

  const getBadgeVariant = () => {
    switch (activity.activity_type) {
      case 'created':
        return 'default' as const;
      case 'renewal_due':
        return 'destructive' as const;
      case 'recorded':
        return 'secondary' as const;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-lg">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate">{activity.title}</h3>
              <Badge variant={getBadgeVariant()} className="text-xs">
                {getBadgeText()}
              </Badge>
            </div>
            {activity.summary && (
              <p className="text-sm text-muted-foreground truncate">
                {activity.summary}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(activity.activity_date), { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
