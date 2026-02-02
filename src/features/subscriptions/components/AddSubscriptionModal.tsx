import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/shared/components/ui";
import { LoadingButton } from "@/shared/components/ui";
import { Input } from "@/shared/components/ui";
import { Textarea } from "@/shared/components/ui";
import { Label } from "@/shared/components/ui";
import { Badge } from "@/shared/components/ui";
import { Button } from "@/shared/components/ui";
import { Switch } from "@/shared/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui";
import { Calendar } from "@/shared/components/ui";
import { CalendarIcon, X, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/shared/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  SUBSCRIPTION_TABLES,
  DEFAULT_CATEGORIES,
  CURRENCY_OPTIONS,
  BILLING_CYCLES,
  POPULAR_SUBSCRIPTIONS
} from "@/features/subscriptions/constants";
import { calculateAnnualCost, formatCurrency } from "@/features/subscriptions/utils/currency-utils";
import type { SubscriptionBillingCycle } from "@/features/subscriptions/types";

const subscriptionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  provider: z.string().max(100).optional(),
  category: z.string().min(1, "Category is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().min(1),
  billing_cycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'one-time']),
  next_billing_date: z.date(),
  payment_method: z.string().optional(),
  auto_renew: z.boolean(),
  website_url: z.string().url().optional().or(z.literal('')),
  reminder_days_before: z.number().int().min(0).max(30),
  notes: z.string().max(1000).optional(),
});

interface AddSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscriptionAdded: () => void;
}

export const AddSubscriptionModal = ({
  open,
  onOpenChange,
  onSubscriptionAdded
}: AddSubscriptionModalProps) => {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>("monthly");
  const [nextBillingDate, setNextBillingDate] = useState<Date | undefined>(new Date());
  const [paymentMethod, setPaymentMethod] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [reminderDays, setReminderDays] = useState(3);
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const isMobile = useIsMobile();

  const resetForm = () => {
    setName("");
    setProvider("");
    setCategory("");
    setAmount("");
    setCurrency("SAR");
    setBillingCycle("monthly");
    setNextBillingDate(new Date());
    setPaymentMethod("");
    setAutoRenew(true);
    setWebsiteUrl("");
    setReminderDays(3);
    setNotes("");
    setTags([]);
    setTagInput("");
  };

  const handleQuickAdd = (sub: typeof POPULAR_SUBSCRIPTIONS[number]) => {
    setName(sub.name);
    setCategory(sub.category);
    setShowQuickAdd(false);
  };

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

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      toast.error("Invalid amount");
      return;
    }

    const result = subscriptionSchema.safeParse({
      name: name.trim(),
      provider: provider.trim() || undefined,
      category,
      amount: parsedAmount,
      currency,
      billing_cycle: billingCycle,
      next_billing_date: nextBillingDate,
      payment_method: paymentMethod.trim() || undefined,
      auto_renew: autoRenew,
      website_url: websiteUrl.trim() || undefined,
      reminder_days_before: reminderDays,
      notes: notes.trim() || undefined,
    });

    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from(SUBSCRIPTION_TABLES.SUBSCRIPTIONS).insert({
        user_id: user.id,
        name: result.data.name,
        provider: result.data.provider || null,
        category: result.data.category,
        amount: result.data.amount,
        currency: result.data.currency,
        billing_cycle: result.data.billing_cycle,
        next_billing_date: format(result.data.next_billing_date, 'yyyy-MM-dd'),
        payment_method: result.data.payment_method || null,
        auto_renew: result.data.auto_renew,
        website_url: result.data.website_url || null,
        reminder_days_before: result.data.reminder_days_before,
        notes: result.data.notes || null,
        tags,
        status: 'active',
      });

      if (error) throw error;

      toast.success("Subscription added! 🎉");
      resetForm();
      onOpenChange(false);
      onSubscriptionAdded();
    } catch (error) {
      console.error('Error adding subscription:', error);
      toast.error("Failed to add subscription");
    } finally {
      setLoading(false);
    }
  };

  const yearlyPreview = amount ? calculateAnnualCost(parseFloat(amount) || 0, billingCycle) : 0;

  const FormContent = () => (
    <>
      {/* Quick Add Templates */}
      <div className="mb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Quick Add
        </Button>
        {showQuickAdd && (
          <div className="flex flex-wrap gap-2 mt-3">
            {POPULAR_SUBSCRIPTIONS.map((sub) => (
              <Badge
                key={sub.name}
                variant="outline"
                className="cursor-pointer hover:bg-accent premium-transition"
                onClick={() => handleQuickAdd(sub)}
              >
                {sub.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
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
            <Label htmlFor="provider">Provider</Label>
            <Input
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="Company name"
              className="glass-input border-0"
              maxLength={100}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
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
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
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
              <Label htmlFor="currency">Currency</Label>
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

          {/* Yearly Preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              Yearly cost: <span className="font-semibold text-foreground">{formatCurrency(yearlyPreview, currency)}</span>
            </div>
          )}

          {/* Billing Cycle */}
          <div className="space-y-2">
            <Label htmlFor="billing-cycle">Billing Cycle *</Label>
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
            <Label htmlFor="payment-method">Payment Method</Label>
            <Input
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="Credit Card, Apple Pay, etc."
              className="glass-input border-0"
            />
          </div>

          {/* Auto Renew */}
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-renew">Auto-renew</Label>
            <Switch
              id="auto-renew"
              checked={autoRenew}
              onCheckedChange={setAutoRenew}
            />
          </div>

          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="website-url">Website URL</Label>
            <Input
              id="website-url"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://..."
              className="glass-input border-0"
            />
          </div>

          {/* Reminder Days */}
          <div className="space-y-2">
            <Label htmlFor="reminder-days">Reminder (days before)</Label>
            <Input
              id="reminder-days"
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
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="glass-input border-0 min-h-[80px] resize-none"
              maxLength={1000}
            />
          </div>

          <LoadingButton
            type="submit"
            loading={loading}
            loadingText="Adding..."
            size="lg"
            className="w-full"
          >
            Add Subscription
          </LoadingButton>
        </form>
      </>
    );

  return isMobile ? (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] pb-safe">
        <DrawerHeader>
          <DrawerTitle className="text-xl font-semibold text-foreground">
            Add Subscription
          </DrawerTitle>
          <DrawerDescription className="text-muted-foreground">
            Track a new recurring expense
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <FormContent />
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto !bg-background border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-foreground">
            Add Subscription
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Track a new recurring expense
          </DialogDescription>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
};
