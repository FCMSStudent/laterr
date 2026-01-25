import { Toaster } from "@/ui";
import { Toaster as Sonner } from "@/ui";
import { TooltipProvider } from "@/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { MobileBottomNav } from "@/shared/components/MobileBottomNav";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { Agentation } from "agentation";

// Lazy load route components for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
// Hidden for now - Subscriptions module
// const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const Auth = lazy(() => import("./pages/Auth"));
// Hidden for now - Health module
// const Health = lazy(() => import("./pages/Health"));
const Settings = lazy(() => import("./pages/Settings"));
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

const AppContent = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/auth");

  return (
    <Suspense fallback={<LoadingFallback />}>
      <div>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/app" element={<Bookmarks />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          {/* Hidden for now - Subscriptions module
          <Route path="/subscriptions" element={<Subscriptions />} />
          */}
          {/* Hidden for now - Health module
          <Route path="/health" element={<Health />} />
          */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/landing" element={<Landing />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* Mobile Bottom Navigation - only show on mobile and not on auth pages */}
        {isMobile && !isAuthPage && <MobileBottomNav />}
      </div>
    </Suspense>
  );
};

const App = () => {
  // Agentation integration (dev-only)
  const sendToAgent = (annotation: any) => {
    // TODO: wire to internal agent channel (no network by default)
    console.log("Agentation: Sending annotation to agent", annotation);
  };

  const handleAnnotation = (annotation: any) => {
    console.log("Agentation captured:", {
      element: annotation.element,
      path: annotation.elementPath,
      box: annotation.boundingBox
    });
    sendToAgent(annotation);
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
            {process.env.NODE_ENV === "development" && (
              // @ts-ignore - Agentation might not have types in early versions or if install failed
              <Agentation
                onAnnotationAdd={handleAnnotation}
              // config={{ copyToClipboard: false }} // Placeholder for config if available
              />
            )}
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
