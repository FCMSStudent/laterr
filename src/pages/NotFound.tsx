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
    <div className="flex min-h-screen items-center justify-center">
      <div className="glass-card rounded-3xl p-12 shadow-apple max-w-2xl mx-4 text-center">
        <div className="mb-6 flex justify-center">
          <Sparkles className="h-20 w-20 text-primary animate-pulse" aria-hidden="true" />
        </div>
        <h1 className="text-6xl font-semibold text-foreground mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-3">Page Not Found</h2>
        <p className="text-muted-foreground mb-8 text-lg">
          Oops! The page you're looking for seems to have wandered off into the garden.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            asChild
            className="bg-primary hover:bg-primary/90 text-white gap-2"
          >
            <Link to="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              Return to Home
            </Link>
          </Button>
          <Button 
            asChild
            variant="outline"
            className="gap-2"
          >
            <Link to="/">
              <Search className="h-4 w-4" aria-hidden="true" />
              Search Your Garden
            </Link>
          </Button>
        </div>
        
        <div className="mt-8 text-sm text-muted-foreground">
          <p>Looking for something specific? Try using the search bar on the home page.</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
