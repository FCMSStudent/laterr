import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, Component, ReactNode } from "react";
// Fixed: Direct import instead of barrel file to prevent "Cannot access before initialization" error
// Barrel files (@/shared/components/index.ts) can cause bundler initialization issues in entry points
// when mixed with code-splitting and lazy loading, leading to circular references in the bundle
import { GradientBackground } from "@/shared/components/layout/GradientBackground";
import "./styles/gradient.css";

// Lazy load route components for code splitting
const Landing = lazy(() => import("./pages/landing").catch(err => {
  console.error("[Laterr] Failed to load Landing page:", err);
  return import("./pages/not-found");  // Fallback to 404 page
}));
const Index = lazy(() => import("./pages/home").catch(err => {
  console.error("[Laterr] Failed to load Index page:", err);
  return import("./pages/not-found");
}));
const Subscriptions = lazy(() => import("./pages/subscriptions").catch(err => {
  console.error("[Laterr] Failed to load Subscriptions page:", err);
  return import("./pages/not-found");
}));
const Health = lazy(() => import("./pages/health").catch(err => {
  console.error("[Laterr] Failed to load Health page:", err);
  return import("./pages/not-found");
}));
const Auth = lazy(() => import("./pages/auth").catch(err => {
  console.error("[Laterr] Failed to load Auth page:", err);
  return import("./pages/not-found");
}));
const NotFound = lazy(() => import("./pages/not-found").catch(err => {
  console.error("[Laterr] Failed to load NotFound page:", err);
  // Ultimate fallback - inline component
  return {
    default: () => (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
          <p className="text-muted-foreground mb-4">The page you're looking for doesn't exist.</p>
          <a href="/" className="text-primary hover:underline">Go back home</a>
        </div>
      </div>
    )
  };
}));
const MobileNavDemo = lazy(() => import("./pages/mobile-demo").catch(err => {
  console.error("[Laterr] Failed to load MobileNavDemo page:", err);
  return import("./pages/not-found");
}));

const queryClient = new QueryClient();

// Loading fallback component
const LoadingFallback = () => {
  console.log("[Laterr] Showing loading fallback - lazy component is loading");
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};

// Error boundary specifically for Suspense/lazy loading failures
class SuspenseErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error("[Laterr] SuspenseErrorBoundary caught error:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[Laterr] Suspense/Lazy loading failed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-destructive mb-4">Failed to Load</h1>
            <p className="text-muted-foreground mb-4">
              The application failed to load properly. This might be due to a network issue or a deployment problem.
            </p>
            <details className="text-left bg-muted p-4 rounded text-xs overflow-auto mb-4">
              <summary className="cursor-pointer font-semibold mb-2">Technical Details</summary>
              <pre className="whitespace-pre-wrap">{this.state.error?.message || "Unknown error"}</pre>
              <pre className="whitespace-pre-wrap mt-2">{this.state.error?.stack}</pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  // Log when App component renders
  console.log("[Laterr] App component rendering", {
    pathname: window.location.pathname,
    search: window.location.search,
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GradientBackground />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SuspenseErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <div className="animate-in fade-in duration-500">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/app" element={<Index />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                  <Route path="/health" element={<Health />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/mobile-demo" element={<MobileNavDemo />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </Suspense>
          </SuspenseErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
