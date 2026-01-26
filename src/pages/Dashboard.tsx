import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bookmark, CreditCard, Activity } from "lucide-react";
import { ModuleNavigationCard } from "@/shared/components/ModuleNavigationCard";

import { NavigationHeader } from "@/shared/components/NavigationHeader";
import { PageLoading } from "@/shared/components/PageLoading";

type User = { id: string; email?: string };

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      if (!currentUser) {
        navigate('/auth');
      } else {
        setUser(currentUser);
      }
    });

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
    return <PageLoading />;
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="mb-8">
          <NavigationHeader title="Dashboard" />
        </div>

        <main id="main-content" className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
            <p className="text-muted-foreground">Choose a module to get started</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <ModuleNavigationCard
              icon={Bookmark}
              title="Bookmarks"
              description="Save and organize your links, notes, and files"
              href="/bookmarks"
              onClick={() => navigate('/bookmarks')}
            />
            <ModuleNavigationCard
              icon={CreditCard}
              title="Subscriptions"
              description="Track and manage your recurring payments"
              href="/subscriptions"
              onClick={() => navigate('/subscriptions')}
            />
            <ModuleNavigationCard
              icon={Activity}
              title="Health"
              description="Monitor your health metrics and documents"
              href="/health"
              onClick={() => navigate('/health')}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
