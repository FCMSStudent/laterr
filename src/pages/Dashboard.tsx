import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bookmark, CreditCard, Activity } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useUnifiedActivity } from "@/hooks/useUnifiedActivity";
import { QuickStatsGrid } from "@/components/QuickStatsGrid";
import { ModuleNavigationCard } from "@/components/ModuleNavigationCard";
import { ActivityFeedCard } from "@/components/ActivityFeedCard";
import { NavigationHeader } from "@/components/NavigationHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type User = { id: string; email?: string };

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  
  const stats = useDashboardStats();
  const { activities, loading: activitiesLoading } = useUnifiedActivity(10);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      if (!currentUser) {
        navigate('/auth');
      } else {
        setUser(currentUser);
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
  }, [navigate]);

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
        <NavigationHeader 
          title="Laterr Dashboard"
          subtitle="Your unified personal hub"
        />

        <main id="main-content" className="space-y-8">
          {/* Quick Stats */}
          <section aria-label="Quick Statistics">
            {stats.loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <QuickStatsGrid
                totalBookmarks={stats.totalBookmarks}
                activeSubscriptions={stats.activeSubscriptions}
                recentMeasurements={stats.recentMeasurements}
                goalsProgress={stats.goalsProgress}
              />
            )}
          </section>

          {/* Module Navigation Cards */}
          <section aria-label="Module Navigation">
            <h2 className="text-2xl font-semibold mb-4">Your Modules</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ModuleNavigationCard
                icon={Bookmark}
                title="Bookmarks"
                description="Manage your saved links and notes"
                count={stats.totalBookmarks}
                href="/bookmarks"
                onClick={() => navigate('/bookmarks')}
              />
              <ModuleNavigationCard
                icon={CreditCard}
                title="Subscriptions"
                description="Track your recurring payments"
                count={stats.activeSubscriptions}
                href="/subscriptions"
                onClick={() => navigate('/subscriptions')}
              />
              <ModuleNavigationCard
                icon={Activity}
                title="Health"
                description="Monitor your health metrics"
                count={stats.recentMeasurements}
                href="/health"
                onClick={() => navigate('/health')}
              />
            </div>
          </section>

          {/* Activity Feed */}
          <section aria-label="Recent Activity">
            <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
            {activitiesLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No recent activity. Start using the modules to see your activity here.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {activities.map((activity) => (
                  <ActivityFeedCard key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Events */}
          <section aria-label="Upcoming Events">
            <h2 className="text-2xl font-semibold mb-4">Upcoming Events</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {activities
                .filter((a) => a.activity_type === 'renewal_due')
                .slice(0, 6)
                .map((activity) => (
                  <ActivityFeedCard key={activity.id} activity={activity} />
                ))}
              {activities.filter((a) => a.activity_type === 'renewal_due').length === 0 && (
                <div className="text-center py-8 text-muted-foreground col-span-full">
                  No upcoming subscription renewals in the next 7 days.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
