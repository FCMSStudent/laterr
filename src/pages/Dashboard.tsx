import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bookmark, CreditCard, Activity } from "lucide-react";
import { NavigationHeader } from "@/shared/components/NavigationHeader";

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
    return null;
  }

  const modules = [
    {
      icon: Bookmark,
      title: "Bookmarks",
      description: "Save and organize your links, notes, and files",
      href: "/bookmarks",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: CreditCard,
      title: "Subscriptions",
      description: "Track and manage your recurring payments",
      href: "/subscriptions",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Activity,
      title: "Health",
      description: "Monitor your health metrics and documents",
      href: "/health",
      gradient: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <NavigationHeader title="Dashboard" />
        </div>

        <main className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-3xl font-bold text-center mb-2">Welcome back</h1>
          <p className="text-muted-foreground text-center mb-10">
            Choose a module to get started
          </p>

          <div className="grid gap-6 w-full max-w-2xl">
            {modules.map((module) => (
              <button
                key={module.title}
                onClick={() => navigate(module.href)}
                className="group relative flex items-center gap-6 p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 text-left"
              >
                <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center shadow-lg`}>
                  <module.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                    {module.title}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {module.description}
                  </p>
                </div>
                <div className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all">
                  →
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
