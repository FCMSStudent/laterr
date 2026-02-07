import { Routes, Route, useLocation } from "react-router-dom";
import { useIsMobile } from "@/shared/hooks/useMobile";
import { MobileBottomNav } from "@/shared/components/MobileBottomNav";
import { OfflineIndicator } from "@/shared/components/OfflineIndicator";
import Landing from "@/features/landing/pages/LandingPage";
import Dashboard from "@/features/dashboard/pages/DashboardPage";
import Bookmarks from "@/features/bookmarks/pages/BookmarksPage";
import Subscriptions from "@/features/subscriptions/pages/SubscriptionsPage";
import Auth from "@/features/auth/pages/AuthPage";
import Health from "@/features/health/pages/HealthPage";
import Settings from "@/features/settings/pages/SettingsPage";
import NotFound from "@/features/core/pages/NotFoundPage";
import { ViewerLoadingTestPage } from "@/features/core/pages/ViewerLoadingTestPage";
import ComponentShowcasePage from "@/features/core/pages/ComponentShowcasePage";

export const AppRoutes = () => {
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
        <Route path="/components" element={<ComponentShowcasePage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* Mobile Bottom Navigation - only show on mobile and not on auth pages */}
      {isMobile && !isAuthPage && <MobileBottomNav />}
      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
};
