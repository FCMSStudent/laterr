import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Search, BookmarkIcon, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Landing = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      }
    });
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/app");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Logo/Title */}
        <div className="space-y-4">
          <h1 className="text-7xl md:text-8xl font-bold text-foreground tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
            Laterr
          </h1>
          <p className="text-2xl md:text-3xl text-muted-foreground font-medium animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            Save it for later
          </p>
        </div>

        {/* Tagline */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          Your personal knowledge space. Organize thoughts, links, and images with AI-powered semantic search.
        </p>

        {/* CTA Button */}
        <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white shadow-xl hover:shadow-2xl premium-transition hover:scale-[1.05] font-semibold text-lg px-12 py-7 rounded-2xl"
          >
            <Sparkles className="w-5 h-5 mr-2" aria-hidden="true" />
            Get Started
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
          <div className="glass-card rounded-2xl p-6 space-y-3 hover:scale-[1.02] premium-transition">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-foreground text-lg">Smart Search</h3>
            <p className="text-sm text-muted-foreground">
              Find content by meaning, not just keywords
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3 hover:scale-[1.02] premium-transition">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <BookmarkIcon className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-foreground text-lg">Organize</h3>
            <p className="text-sm text-muted-foreground">
              Save URLs, notes, images, and documents
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3 hover:scale-[1.02] premium-transition">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-foreground text-lg">AI-Powered</h3>
            <p className="text-sm text-muted-foreground">
              Get personalized content recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-center text-sm text-muted-foreground">
        <p>Built with ❤️ for knowledge enthusiasts</p>
      </footer>
    </div>
  );
};

export default Landing;
