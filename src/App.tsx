import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import GradientBackground from "./components/GradientBackground";
import "./styles/gradient.css";

// Lazy load route components for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Index = lazy(() => import("./pages/Index"));
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
              <Route path="/" element={<Dashboard />} />
              <Route path="/app" element={<Dashboard />} />
              <Route path="/bookmarks" element={<Index />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/health" element={<Health />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/landing" element={<Landing />} />
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
