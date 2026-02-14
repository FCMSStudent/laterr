import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionCard } from "@/features/subscriptions/components/SubscriptionCard";
import { SubscriptionListRow } from "@/features/subscriptions/components/SubscriptionListRow";
import { CollapsibleStatsSummary } from "@/features/subscriptions/components/CollapsibleStatsSummary";
import { StatusFilterTabs } from "@/features/subscriptions/components/StatusFilterTabs";
import { SubscriptionFilterBar, MobileSubscriptionFilterButton, type SubscriptionSortOption } from "@/features/subscriptions/components/SubscriptionFilterBar";
import { ItemCardSkeleton } from "@/features/bookmarks/components/ItemCardSkeleton";
import { NavigationHeader } from "@/shared/components/NavigationHeader";
import { Button } from "@/shared/components/ui";
import { CreditCard, Plus } from "lucide-react";
import { useToast } from "@/shared/hooks/useToast";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useIsMobile } from "@/shared/hooks/useMobile";
import { SUBSCRIPTION_TABLES } from "@/features/subscriptions/constants";
import { formatCurrency, calculateMonthlyCost, calculateAnnualCost } from "@/features/subscriptions/utils/currency-utils";
import type { Subscription, SubscriptionStatus, SubscriptionBillingCycle } from "@/features/subscriptions/types";
import { toTypedError } from "@/shared/types/errors";
import { differenceInDays } from "date-fns";
import { parseSubscriptionDate } from "@/features/subscriptions/utils/date-utils";

// Lazy load modal components for better code splitting
const AddSubscriptionModal = lazy(() => import("@/features/subscriptions/components/AddSubscriptionModal").then(m => ({ default: m.AddSubscriptionModal })));
const SubscriptionDetailModal = lazy(() => import("@/features/subscriptions/components/SubscriptionDetailModal").then(m => ({ default: m.SubscriptionDetailModal })));
const EditSubscriptionModal = lazy(() => import("@/features/subscriptions/components/EditSubscriptionModal").then(m => ({ default: m.EditSubscriptionModal })));

type User = { id: string; email?: string };

const Subscriptions = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SubscriptionSortOption>("date-asc");
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all' | 'due_soon'>('all');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isMobile = useIsMobile();

  // Calculate stats
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalMonthly = activeSubscriptions.reduce((sum, s) => sum + calculateMonthlyCost(s.amount, s.billing_cycle as SubscriptionBillingCycle), 0);
  const totalYearly = activeSubscriptions.reduce((sum, s) => sum + calculateAnnualCost(s.amount, s.billing_cycle as SubscriptionBillingCycle), 0);
  const upcomingRenewals = activeSubscriptions.filter(s => {
    const nextBillingDate = parseSubscriptionDate(s.next_billing_date);
    if (!nextBillingDate) {
      return false;
    }
    const daysUntil = differenceInDays(nextBillingDate, new Date());
    return daysUntil >= 0 && daysUntil <= 7;
  }).length;

  // Extract unique tags from all subscriptions
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    subscriptions.forEach(sub => {
      if (sub.tags) {
        sub.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [subscriptions]);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(SUBSCRIPTION_TABLES.SUBSCRIPTIONS)
        .select('*')
        .is('deleted_at', null) // Only fetch non-deleted subscriptions
        .order('next_billing_date', { ascending: true });

      if (error) throw error;

      const normalizedSubscriptions: Subscription[] = (data ?? []).map(item => ({
        ...item,
        tags: item.tags ?? [],
        billing_cycle: item.billing_cycle as SubscriptionBillingCycle,
        status: item.status as SubscriptionStatus,
      }));

      setSubscriptions(normalizedSubscriptions);
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error fetching subscriptions:', typedError);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleDeleteSubscription = useCallback(async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from(SUBSCRIPTION_TABLES.SUBSCRIPTIONS)
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription deleted"
      });
      fetchSubscriptions();
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error deleting subscription:', typedError);
      toast({
        title: "Error",
        description: "Failed to delete subscription",
        variant: "destructive"
      });
    }
  }, [toast, fetchSubscriptions]);

  const handleToggleFavorite = useCallback(async (subscriptionId: string) => {
    try {
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (!subscription) return;

      // is_favorite not in DB schema yet - just refresh for now
      toast({
        title: "Info",
        description: "Favorite toggled"
      });
      fetchSubscriptions();
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error toggling favorite:', typedError);
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive"
      });
    }
  }, [subscriptions, toast, fetchSubscriptions]);

  const handleEditSubscription = useCallback((subscriptionId: string) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (subscription) {
      setSelectedSubscription(subscription);
      setShowEditModal(true);
    }
  }, [subscriptions]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      if (!currentUser) {
        navigate('/auth');
      } else {
        setUser(currentUser);
        fetchSubscriptions();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, fetchSubscriptions]);

  const filteredSubscriptions = useMemo(() => {
    let filtered = subscriptions;

    // Search filter
    if (debouncedSearchQuery) {
      const sanitizedQuery = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(sub =>
        sub.name.toLowerCase().includes(sanitizedQuery) ||
        sub.provider?.toLowerCase().includes(sanitizedQuery) ||
        sub.category.toLowerCase().includes(sanitizedQuery) ||
        sub.notes?.toLowerCase().includes(sanitizedQuery)
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(sub => sub.category === selectedCategory);
    }

    // Tag filter
    if (selectedTag) {
      filtered = filtered.filter(sub => 
        sub.tags && sub.tags.includes(selectedTag)
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(sub => sub.status === 'active');
    } else if (statusFilter === 'due_soon') {
      filtered = filtered.filter(sub => {
        if (sub.status !== 'active') return false;
        const nextBillingDate = parseSubscriptionDate(sub.next_billing_date);
        if (!nextBillingDate) {
          return false;
        }
        const daysUntil = differenceInDays(nextBillingDate, new Date());
        return daysUntil >= 0 && daysUntil <= 7;
      });
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    // Sorting
    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "date-asc": {
          const dateA = parseSubscriptionDate(a.next_billing_date);
          const dateB = parseSubscriptionDate(b.next_billing_date);
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateA.getTime() - dateB.getTime();
        }
        case "date-desc": {
          const dateA = parseSubscriptionDate(a.next_billing_date);
          const dateB = parseSubscriptionDate(b.next_billing_date);
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.getTime() - dateA.getTime();
        }
        case "amount-asc":
          return a.amount - b.amount;
        case "amount-desc":
          return b.amount - a.amount;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "status": {
          const statusOrder: Record<string, number> = { active: 0, paused: 1, cancelled: 2 };
          return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
        }
        default:
          return 0;
      }
    });
  }, [debouncedSearchQuery, selectedCategory, selectedTag, statusFilter, sortOption, subscriptions]);

  const handleSubscriptionClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowDetailModal(true);
  };

  const handleClearFilters = useCallback(() => {
    setSelectedTag(null);
    setSelectedCategory(null);
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md">
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <NavigationHeader 
            title="Subscriptions"
            onAddClick={() => setShowAddModal(true)}
            addLabel="Add"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filterButton={
              isMobile ? (
                <MobileSubscriptionFilterButton
                  selectedTag={selectedTag}
                  selectedCategory={selectedCategory}
                  selectedSort={sortOption}
                  onTagSelect={setSelectedTag}
                  onCategoryChange={setSelectedCategory}
                  onSortChange={setSortOption}
                  onClearAll={handleClearFilters}
                  availableTags={availableTags}
                />
              ) : undefined
            }
          />
        </div>

        {/* Stats Summary - Collapsible */}
        <CollapsibleStatsSummary
          monthlyTotal={totalMonthly}
          yearlyTotal={totalYearly}
          activeCount={activeSubscriptions.length}
          dueSoonCount={upcomingRenewals}
          currency="SAR"
        />

        {/* Status Filter Tabs */}
        <StatusFilterTabs
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          dueSoonCount={upcomingRenewals}
        />

        {/* Desktop Filter Bar */}
        {!isMobile && (
          <SubscriptionFilterBar
            selectedTag={selectedTag}
            selectedCategory={selectedCategory}
            selectedSort={sortOption}
            onTagSelect={setSelectedTag}
            onCategoryChange={setSelectedCategory}
            onSortChange={setSortOption}
            onClearAll={handleClearFilters}
            availableTags={availableTags}
          />
        )}

        <main id="main-content">
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {loading ? "Loading subscriptions..." : `Showing ${filteredSubscriptions.length} ${filteredSubscriptions.length === 1 ? 'subscription' : 'subscriptions'}`}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
              {Array.from({ length: 8 }).map((_, index) => (
                <ItemCardSkeleton key={index} />
              ))}
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-32 space-y-5">
              <CreditCard className="h-16 w-16 mx-auto text-muted-foreground/60" aria-hidden="true" />
              <h2 className="text-2xl font-bold text-foreground tracking-tight">No subscriptions yet</h2>
              <p className="text-muted-foreground text-base max-w-md mx-auto">
                Start tracking your recurring expenses by adding your first subscription
              </p>
            </div>
          ) : (
            <section aria-label="Subscriptions collection">
              {/* Use compact list rows by default */}
              <div className="glass-card rounded-2xl overflow-hidden mb-12">
                {filteredSubscriptions.map(subscription => (
                  <SubscriptionListRow
                    key={subscription.id}
                    subscription={subscription}
                    onClick={() => handleSubscriptionClick(subscription)}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Floating Action Button (FAB) for mobile */}
      {isMobile && (
        <Button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl hover:shadow-xl premium-transition hover:scale-110 p-0"
          aria-label="Add new subscription"
        >
          <Plus className="w-6 h-6" aria-hidden="true" />
        </Button>
      )}

      {/* Lazy-loaded modals wrapped in Suspense for code splitting */}
      <Suspense fallback={null}>
        <AddSubscriptionModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onSubscriptionAdded={fetchSubscriptions}
        />
      </Suspense>

      {selectedSubscription && (
        <Suspense fallback={null}>
          <SubscriptionDetailModal
            open={showDetailModal}
            onOpenChange={setShowDetailModal}
            subscription={selectedSubscription}
            onUpdate={fetchSubscriptions}
          />

          <EditSubscriptionModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            subscription={selectedSubscription}
            onSubscriptionUpdated={fetchSubscriptions}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Subscriptions;
