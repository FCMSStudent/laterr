import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionCard } from "./components/SubscriptionCard";
import { SubscriptionCardSkeleton } from "./components/SubscriptionCardSkeleton";
import { SearchBar } from "./components/SearchBar";
import { SubscriptionFilterBar, type SortOption } from "./components/SubscriptionFilterBar";
import { UpcomingRenewalsPanel } from "./components/UpcomingRenewalsPanel";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { Button } from "@/shared/components/ui/button";
import { Plus, LogOut, CreditCard, ArrowLeft } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useSubscriptions } from "./hooks/useSubscriptions";
import { BottomNav } from "@/shared/components/layout/BottomNav";
import { MobileHeader } from "@/shared/components/layout/MobileHeader";
import type { User } from "@/shared/types";
import type { Subscription, BillingCycle, SubscriptionStatus } from "./types";

// Lazy load modal components
const AddSubscriptionModal = lazy(() =>
  import("./components/AddSubscriptionModal").then(({ AddSubscriptionModal }) => ({
    default: AddSubscriptionModal,
  }))
);
const DetailViewModal = lazy(() =>
  import("./components/DetailViewModal").then(({ DetailViewModal }) => ({
    default: DetailViewModal,
  }))
);
const EditSubscriptionModal = lazy(() =>
  import("./components/EditSubscriptionModal").then(({ EditSubscriptionModal }) => ({
    default: EditSubscriptionModal,
  }))
);

const SubscriptionsIndex = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<SubscriptionStatus | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [user, setUser] = useState<User | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const {
    subscriptions,
    isLoading,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    deleteSubscription,
  } = useSubscriptions({
    category: selectedCategory ?? undefined,
    status: selectedStatus ?? undefined,
    search: debouncedSearchQuery,
  });

  // Filter and sort subscriptions
  const filteredSubscriptions = subscriptions
    .filter(sub => {
      if (selectedBillingCycle && sub.billing_cycle !== selectedBillingCycle) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      if (!currentUser) {
        navigate("/auth");
      } else {
        setUser(currentUser);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubscriptionClick = useCallback((subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowDetailModal(true);
  }, []);

  const handleEditClick = useCallback((subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowEditModal(true);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setSelectedCategory(null);
    setSelectedStatus(null);
    setSelectedBillingCycle(null);
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  const handleUpcomingRenewalClick = useCallback((id: string) => {
    const subscription = subscriptions.find(s => s.id === id);
    if (subscription) {
      setSelectedSubscription(subscription);
      setShowDetailModal(true);
    }
  }, [subscriptions]);

  if (!user) {
    return null;
  }

  return (
    <main className="w-full">
      <div className="min-h-screen pb-20 md:pb-0">
        {/* Skip Navigation Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md"
        >
          Skip to main content
        </a>

        {/* Mobile Header */}
        <MobileHeader title="Subscriptions" subtitle="Track your recurring payments" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Desktop Header */}
          <header className="mb-6 items-center justify-between flex-row hidden md:flex">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/app")}
                  className="h-8 w-8"
                  aria-label="Back to home"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl sm:text-3xl md:text-4xl text-foreground tracking-tight font-sans font-semibold">
                  Subscriptions
                </h1>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium ml-11">
                Track your recurring payments
              </p>
            </div>
            <nav aria-label="Main navigation" className="flex items-center gap-4">
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl premium-transition hover:scale-[1.03] font-semibold"
                aria-label="Add new subscription"
              >
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                Add Subscription
              </Button>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground smooth-transition"
                aria-label="Sign out of your account"
              >
                <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                Sign Out
              </Button>
            </nav>
          </header>

          {/* Analytics Panel */}
          <div className="mb-6">
            <AnalyticsPanel />
          </div>

          {/* Main Content Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <div className="flex-1">
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto mb-4">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>

              {/* Filter Bar */}
              <div className="mb-4">
                <SubscriptionFilterBar
                  selectedCategory={selectedCategory}
                  selectedStatus={selectedStatus}
                  selectedBillingCycle={selectedBillingCycle}
                  selectedSort={sortOption}
                  onCategorySelect={setSelectedCategory}
                  onStatusSelect={setSelectedStatus}
                  onBillingCycleSelect={setSelectedBillingCycle}
                  onSortChange={setSortOption}
                  onClearAll={handleClearAllFilters}
                />
              </div>

              {/* Subscriptions Grid */}
              <main id="main-content">
                {/* Screen reader announcement */}
                <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                  {isLoading
                    ? "Loading subscriptions..."
                    : `Showing ${filteredSubscriptions.length} ${
                        filteredSubscriptions.length === 1 ? "subscription" : "subscriptions"
                      }`}
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <SubscriptionCardSkeleton key={index} />
                    ))}
                  </div>
                ) : filteredSubscriptions.length === 0 ? (
                  <div className="text-center py-20 space-y-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full bg-primary/5 animate-pulse"></div>
                      </div>
                      <CreditCard
                        className="h-16 w-16 mx-auto text-primary/80 relative z-10"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                        {subscriptions.length === 0
                          ? "No subscriptions yet"
                          : "No matching subscriptions"}
                      </h2>
                      <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                        {subscriptions.length === 0
                          ? "Start tracking your recurring payments"
                          : "Try adjusting your filters or search query"}
                      </p>
                    </div>
                    {subscriptions.length === 0 && (
                      <>
                        <Button
                          onClick={() => setShowAddModal(true)}
                          className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl premium-transition hover:scale-[1.03] font-semibold px-8 py-6 text-base"
                          size="lg"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Add Your First Subscription
                        </Button>
                        <div className="pt-4 space-y-3 max-w-sm mx-auto">
                          <p className="text-sm font-semibold text-muted-foreground">
                            Quick Tips:
                          </p>
                          <ul className="text-sm text-muted-foreground space-y-2 text-left">
                            <li className="flex items-start gap-2">
                              <span className="text-primary font-bold">•</span>
                              <span>Track streaming services like Netflix and Spotify</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary font-bold">•</span>
                              <span>Monitor software subscriptions and tools</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary font-bold">•</span>
                              <span>Get reminders before renewal dates</span>
                            </li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <section aria-label="Subscriptions collection">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                      {filteredSubscriptions.map(subscription => (
                        <SubscriptionCard
                          key={subscription.id}
                          subscription={subscription}
                          onClick={() => handleSubscriptionClick(subscription)}
                          onEdit={() => handleEditClick(subscription)}
                          onPause={() => pauseSubscription(subscription.id)}
                          onResume={() => resumeSubscription(subscription.id)}
                          onCancel={() => cancelSubscription(subscription.id)}
                          onDelete={() => deleteSubscription(subscription.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </main>
            </div>

            {/* Sidebar - Upcoming Renewals */}
            <aside className="lg:w-80 shrink-0">
              <div className="lg:sticky lg:top-6">
                <UpcomingRenewalsPanel onSubscriptionClick={handleUpcomingRenewalClick} />
              </div>
            </aside>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav
          onAddItem={() => setShowAddModal(true)}
          onShowAllItems={() => {}}
          onShowBookmarks={() => {}}
          activeView="all"
        />
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
        <AddSubscriptionModal open={showAddModal} onOpenChange={setShowAddModal} />

        {selectedSubscription && (
          <>
            <DetailViewModal
              open={showDetailModal}
              onOpenChange={setShowDetailModal}
              subscription={selectedSubscription}
              onEdit={() => {
                setShowDetailModal(false);
                setShowEditModal(true);
              }}
            />

            <EditSubscriptionModal
              open={showEditModal}
              onOpenChange={setShowEditModal}
              subscription={selectedSubscription}
            />
          </>
        )}
      </Suspense>
    </main>
  );
};

export default SubscriptionsIndex;
