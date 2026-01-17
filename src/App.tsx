import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { MobileBottomNav } from "@/shared/components/MobileBottomNav";

// Lazy load route components for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const Auth = lazy(() => import("./pages/Auth"));
const Health = lazy(() => import("./pages/Health"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => {
  const isMobile = useIsMobile();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <div>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/app" element={<Bookmarks />} />
                <Route path="/bookmarks" element={<Bookmarks />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/health" element={<Health />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/landing" element={<Landing />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              {/* Mobile Bottom Navigation - only show on mobile and not on auth pages */}
              {isMobile && (
                <MobileBottomNav />
              )}
            </div>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
