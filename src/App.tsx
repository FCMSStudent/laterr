import { Toaster } from "@/ui";
import { Toaster as Sonner } from "@/ui";
import { TooltipProvider } from "@/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { MobileBottomNav } from "@/shared/components/MobileBottomNav";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { DynamicBackground } from "@/shared/components/DynamicBackground";
import { Agentation } from "agentation";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Bookmarks from "./pages/Bookmarks";
import Subscriptions from "./pages/Subscriptions";
import Auth from "./pages/Auth";
import Health from "./pages/Health";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { ViewerLoadingTestPage } from "./pages/ViewerLoadingTest";

const queryClient = new QueryClient();



const AppContent = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/auth");

  return (
    <div>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/app" element={<Bookmarks />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/health" element={<Health />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/landing" element={<Landing />} />
        {process.env.NODE_ENV === "development" && (
          <Route path="/viewer-loading-test" element={<ViewerLoadingTestPage />} />
        )}
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* Mobile Bottom Navigation - only show on mobile and not on auth pages */}
      {isMobile && !isAuthPage && <MobileBottomNav />}
    </div>
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
            <DynamicBackground />
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
