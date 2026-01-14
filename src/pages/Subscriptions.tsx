import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { SUBSCRIPTION_TABLES } from "@/constants/subscriptions";
import { formatCurrency, calculateMonthlyCost, calculateAnnualCost } from "@/lib/currency-utils";
import type { Subscription, SubscriptionStatus, SubscriptionBillingCycle } from "@/types/subscription";
import { toTypedError } from "@/types/errors";
import { differenceInDays, parseISO } from "date-fns";

// Lazy load modal components
const AddSubscriptionModal = lazy(() => import("@/components/AddSubscriptionModal").then(({ AddSubscriptionModal }) => ({ default: AddSubscriptionModal })));
const SubscriptionDetailModal = lazy(() => import("@/components/SubscriptionDetailModal").then(({ SubscriptionDetailModal }) => ({ default: SubscriptionDetailModal })));
const EditSubscriptionModal = lazy(() => import("@/components/EditSubscriptionModal").then(({ EditSubscriptionModal }) => ({ default: EditSubscriptionModal })));

type User = { id: string; email?: string };

const Subscriptions = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | null>(null);
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
    const daysUntil = differenceInDays(parseISO(s.next_billing_date), new Date());
    return daysUntil >= 0 && daysUntil <= 7;
  }).length;

  const fetchSubscriptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(SUBSCRIPTION_TABLES.SUBSCRIPTIONS)
        .select('*')
        .order('next_billing_date', { ascending: true });

      if (error) throw error;

      const normalizedSubscriptions: Subscription[] = (data ?? []).map(item => ({
        ...item,
        tags: item.tags ?? [],
        billing_cycle: item.billing_cycle as SubscriptionBillingCycle,
        status: item.status as SubscriptionStatus,
      }));

      setSubscriptions(normalizedSubscriptions);
      setFilteredSubscriptions(normalizedSubscriptions);
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
        description: "Subscription deleted successfully"
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

  useEffect(() => {
    let filtered = subscriptions;

    if (debouncedSearchQuery) {
      const sanitizedQuery = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(sub =>
        sub.name.toLowerCase().includes(sanitizedQuery) ||
        sub.provider?.toLowerCase().includes(sanitizedQuery) ||
        sub.category.toLowerCase().includes(sanitizedQuery) ||
        sub.notes?.toLowerCase().includes(sanitizedQuery)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(sub => sub.category === selectedCategory);
    }

    if (statusFilter) {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    setFilteredSubscriptions(filtered);
  }, [debouncedSearchQuery, selectedCategory, statusFilter, subscriptions]);

  const handleSubscriptionClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowDetailModal(true);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md">
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <NavigationHeader 
            title="Subscriptions" 
            subtitle="Track your recurring expenses"
            breadcrumbs={[
              { label: "Dashboard", path: "/" },
              { label: "Subscriptions" }
            ]}
          />
          
          {/* Desktop Add Button */}
          {!isMobile && (
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl premium-transition hover:scale-[1.03] font-semibold"
              aria-label="Add new subscription"
            >
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Add Subscription
            </Button>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Monthly</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalMonthly, 'SAR')}</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Yearly</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalYearly, 'SAR')}</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/50">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active</p>
              <p className="text-lg font-bold text-foreground">{activeSubscriptions.length}</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Calendar className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Due in 7 days</p>
              <p className="text-lg font-bold text-foreground">{upcomingRenewals}</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-4">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge
            variant={statusFilter === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStatusFilter(null)}
          >
            All
          </Badge>
          <Badge
            variant={statusFilter === 'active' ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStatusFilter('active')}
          >
            Active
          </Badge>
          <Badge
            variant={statusFilter === 'paused' ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStatusFilter('paused')}
          >
            Paused
          </Badge>
          <Badge
            variant={statusFilter === 'cancelled' ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStatusFilter('cancelled')}
          >
            Cancelled
          </Badge>
        </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {filteredSubscriptions.map(subscription => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onDelete={handleDeleteSubscription}
                    onEdit={handleEditSubscription}
                    onClick={() => handleSubscriptionClick(subscription)}
                    onCategoryClick={setSelectedCategory}
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
          className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-2xl hover:shadow-xl premium-transition hover:scale-110 p-0"
          aria-label="Add new subscription"
        >
          <Plus className="w-6 h-6" aria-hidden="true" />
        </Button>
      )}

      <Suspense fallback={null}>
        <AddSubscriptionModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onSubscriptionAdded={fetchSubscriptions}
        />

        {selectedSubscription && (
          <>
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
          </>
        )}
      </Suspense>
    </div>
  );
};

export default Subscriptions;
