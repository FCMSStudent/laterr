import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
// Fixed: Direct import instead of barrel file to prevent "Cannot access before initialization" error
// Barrel files (@/shared/components/index.ts) can cause bundler initialization issues in entry points
// when mixed with code-splitting and lazy loading, leading to circular references in the bundle
import { GradientBackground } from "@/shared/components/layout/GradientBackground";
import "./styles/gradient.css";

// Lazy load route components for code splitting
const Landing = lazy(() => import("./pages/landing"));
const Index = lazy(() => import("./pages/home"));
const Subscriptions = lazy(() => import("./pages/subscriptions"));
const Auth = lazy(() => import("./pages/auth"));
const NotFound = lazy(() => import("./pages/not-found"));
const MobileNavDemo = lazy(() => import("./pages/mobile-demo"));

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GradientBackground />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <div className="animate-in fade-in duration-500">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/app" element={<Index />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/mobile-demo" element={<MobileNavDemo />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
