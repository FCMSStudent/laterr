import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X, Ban } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUBSCRIPTION_TABLES, DEFAULT_CATEGORIES, CURRENCY_OPTIONS, BILLING_CYCLES } from "@/constants/subscriptions";
import type { Subscription, SubscriptionBillingCycle } from "@/types/subscription";

interface EditSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
  onSubscriptionUpdated: () => void;
}

export const EditSubscriptionModal = ({
  open,
  onOpenChange,
  subscription,
  onSubscriptionUpdated
}: EditSubscriptionModalProps) => {
  const [name, setName] = useState(subscription.name);
  const [provider, setProvider] = useState(subscription.provider || "");
  const [category, setCategory] = useState(subscription.category);
  const [amount, setAmount] = useState(subscription.amount.toString());
  const [currency, setCurrency] = useState(subscription.currency);
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>(subscription.billing_cycle as SubscriptionBillingCycle);
  const [nextBillingDate, setNextBillingDate] = useState<Date | undefined>(parseISO(subscription.next_billing_date));
  const [paymentMethod, setPaymentMethod] = useState(subscription.payment_method || "");
  const [autoRenew, setAutoRenew] = useState(subscription.auto_renew);
  const [websiteUrl, setWebsiteUrl] = useState(subscription.website_url || "");
  const [reminderDays, setReminderDays] = useState(subscription.reminder_days_before);
  const [notes, setNotes] = useState(subscription.notes || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(subscription.tags || []);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (open) {
      setName(subscription.name);
      setProvider(subscription.provider || "");
      setCategory(subscription.category);
      setAmount(subscription.amount.toString());
      setCurrency(subscription.currency);
      setBillingCycle(subscription.billing_cycle as SubscriptionBillingCycle);
      setNextBillingDate(parseISO(subscription.next_billing_date));
      setPaymentMethod(subscription.payment_method || "");
      setAutoRenew(subscription.auto_renew);
      setWebsiteUrl(subscription.website_url || "");
      setReminderDays(subscription.reminder_days_before);
      setNotes(subscription.notes || "");
      setTags(subscription.tags || []);
      setTagInput("");
    }
  }, [subscription, open]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from(SUBSCRIPTION_TABLES.SUBSCRIPTIONS)
        .update({
          name: name.trim(),
          provider: provider.trim() || null,
          category,
          amount: parsedAmount,
          currency,
          billing_cycle: billingCycle,
          next_billing_date: nextBillingDate ? format(nextBillingDate, 'yyyy-MM-dd') : subscription.next_billing_date,
          payment_method: paymentMethod.trim() || null,
          auto_renew: autoRenew,
          website_url: websiteUrl.trim() || null,
          reminder_days_before: reminderDays,
          notes: notes.trim() || null,
          tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success("Subscription updated! ✨");
      onOpenChange(false);
      onSubscriptionUpdated();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error("Failed to update subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from(SUBSCRIPTION_TABLES.SUBSCRIPTIONS)
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success("Subscription cancelled");
      onOpenChange(false);
      onSubscriptionUpdated();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error("Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto !bg-background border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-foreground">
            Edit Subscription
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update subscription details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Netflix, Spotify, etc."
              className="glass-input border-0"
              maxLength={100}
              required
            />
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="edit-provider">Provider</Label>
            <Input
              id="edit-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="Company name"
              className="glass-input border-0"
              maxLength={100}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="glass-input border-0">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="glass-input border-0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="glass-input border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((cur) => (
                    <SelectItem key={cur.code} value={cur.code}>
                      {cur.symbol} {cur.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Billing Cycle */}
          <div className="space-y-2">
            <Label htmlFor="edit-billing-cycle">Billing Cycle *</Label>
            <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as SubscriptionBillingCycle)}>
              <SelectTrigger className="glass-input border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_CYCLES.map((cycle) => (
                  <SelectItem key={cycle.value} value={cycle.value}>{cycle.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Next Billing Date */}
          <div className="space-y-2">
            <Label>Next Billing Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal glass-input border-0",
                    !nextBillingDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextBillingDate ? format(nextBillingDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={nextBillingDate}
                  onSelect={setNextBillingDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="edit-payment-method">Payment Method</Label>
            <Input
              id="edit-payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="Credit Card, Apple Pay, etc."
              className="glass-input border-0"
            />
          </div>

          {/* Auto Renew */}
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-auto-renew">Auto-renew</Label>
            <Switch
              id="edit-auto-renew"
              checked={autoRenew}
              onCheckedChange={setAutoRenew}
            />
          </div>

          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="edit-website-url">Website URL</Label>
            <Input
              id="edit-website-url"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://..."
              className="glass-input border-0"
            />
          </div>

          {/* Reminder Days */}
          <div className="space-y-2">
            <Label htmlFor="edit-reminder-days">Reminder (days before)</Label>
            <Input
              id="edit-reminder-days"
              type="number"
              min="0"
              max="30"
              value={reminderDays}
              onChange={(e) => setReminderDays(parseInt(e.target.value) || 0)}
              className="glass-input border-0"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags</Label>
            <Input
              id="edit-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type and press Enter..."
              className="glass-input border-0"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="glass-input border-0 min-h-[80px] resize-none"
              maxLength={1000}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText="Saving..."
              size="lg"
              className="flex-1"
            >
              Save Changes
            </LoadingButton>
            
            {subscription.status !== 'cancelled' && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="border-destructive/20 text-destructive hover:bg-destructive/10"
              >
                <Ban className="h-4 w-4 mr-2" />
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
