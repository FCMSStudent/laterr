import { DashboardWidget } from "./DashboardWidget";
import { Bookmark, CreditCard, Activity, Target } from "lucide-react";

interface QuickStatsGridProps {
  totalBookmarks: number;
  activeSubscriptions: number;
  recentMeasurements: number;
  goalsProgress: number;
}

export const QuickStatsGrid = ({
  totalBookmarks,
  activeSubscriptions,
  recentMeasurements,
  goalsProgress,
}: QuickStatsGridProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <DashboardWidget
        icon={Bookmark}
        label="Total Bookmarks"
        value={totalBookmarks}
      />
      <DashboardWidget
        icon={CreditCard}
        label="Active Subscriptions"
        value={activeSubscriptions}
      />
      <DashboardWidget
        icon={Activity}
        label="Recent Measurements"
        value={recentMeasurements}
      />
      <DashboardWidget
        icon={Target}
        label="Active Goals"
        value={goalsProgress}
      />
    </div>
  );
};
