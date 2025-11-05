import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card rounded-3xl p-12 shadow-2xl max-w-2xl mx-4 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-8 flex justify-center">
          <Sparkles className="h-24 w-24 text-primary animate-pulse" aria-hidden="true" />
        </div>
        <h1 className="text-7xl font-bold text-foreground mb-4 tracking-tight">404</h1>
        <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Page Not Found</h2>
        <p className="text-muted-foreground mb-10 text-lg leading-relaxed max-w-lg mx-auto">
          Oops! The page you're looking for seems to have wandered off into the garden.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            asChild
            className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg hover:shadow-xl premium-transition hover:scale-105"
            size="lg"
          >
            <Link to="/">
              <Home className="h-5 w-5" aria-hidden="true" />
              Return to Home
            </Link>
          </Button>
          <Button 
            asChild
            variant="outline"
            className="gap-2 shadow-md hover:shadow-lg smooth-transition"
            size="lg"
          >
            <Link to="/">
              <Search className="h-5 w-5" aria-hidden="true" />
              Search Your Garden
            </Link>
          </Button>
        </div>
        
        <div className="mt-10 text-sm text-muted-foreground">
          <p>Looking for something specific? Try using the search bar on the home page.</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
