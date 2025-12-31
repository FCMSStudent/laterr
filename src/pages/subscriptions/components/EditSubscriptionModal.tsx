import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { LoadingButton } from "@/shared/components/ui/loading-button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/shared/lib/utils";
import { useSubscriptions } from "../hooks/useSubscriptions";
import {
  SUBSCRIPTION_CATEGORIES,
  BILLING_CYCLES,
  CURRENCIES,
  SUBSCRIPTION_STATUSES,
  REMINDER_OPTIONS,
} from "../types";
import type { Subscription, SubscriptionFormData, BillingCycle, SubscriptionStatus } from "../types";

interface EditSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
}

export const EditSubscriptionModal = ({
  open,
  onOpenChange,
  subscription,
}: EditSubscriptionModalProps) => {
  const { updateSubscriptionAsync, isUpdating } = useSubscriptions();
  
  const [formData, setFormData] = useState<SubscriptionFormData>({
    name: subscription.name,
    category: subscription.category,
    amount: subscription.amount,
    currency: subscription.currency,
    billing_cycle: subscription.billing_cycle,
    next_billing_date: subscription.next_billing_date,
    status: subscription.status,
    payment_method: subscription.payment_method || "",
    website_url: subscription.website_url || "",
    logo_url: subscription.logo_url || "",
    notes: subscription.notes || "",
    tags: subscription.tags || [],
    reminder_days_before: subscription.reminder_days_before,
    auto_renew: subscription.auto_renew,
  });

  const [tagInput, setTagInput] = useState("");
  const [date, setDate] = useState<Date | undefined>(
    new Date(subscription.next_billing_date)
  );

  // Reset form when subscription changes
  useEffect(() => {
    if (open) {
      setFormData({
        name: subscription.name,
        category: subscription.category,
        amount: subscription.amount,
        currency: subscription.currency,
        billing_cycle: subscription.billing_cycle,
        next_billing_date: subscription.next_billing_date,
        status: subscription.status,
        payment_method: subscription.payment_method || "",
        website_url: subscription.website_url || "",
        logo_url: subscription.logo_url || "",
        notes: subscription.notes || "",
        tags: subscription.tags || [],
        reminder_days_before: subscription.reminder_days_before,
        auto_renew: subscription.auto_renew,
      });
      setDate(new Date(subscription.next_billing_date));
      setTagInput("");
    }
  }, [subscription, open]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag],
        }));
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      setFormData(prev => ({
        ...prev,
        next_billing_date: format(selectedDate, "yyyy-MM-dd"),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    if (formData.amount <= 0) {
      return;
    }

    try {
      await updateSubscriptionAsync({
        id: subscription.id,
        data: formData,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating subscription:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto !bg-background border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground">
            Edit Subscription
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update subscription details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-sm font-medium">
              Subscription Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Netflix, Spotify, Gym..."
              className="glass-input border-0"
              maxLength={100}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="edit-category" className="text-sm font-medium">
              Category
            </Label>
            <Select
              value={formData.category}
              onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="glass-input border-0">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount" className="text-sm font-medium">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount || ""}
                onChange={e => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="9.99"
                className="glass-input border-0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-currency" className="text-sm font-medium">
                Currency
              </Label>
              <Select
                value={formData.currency}
                onValueChange={value => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger className="glass-input border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(curr => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Billing Cycle */}
          <div className="space-y-2">
            <Label htmlFor="edit-billing_cycle" className="text-sm font-medium">
              Billing Cycle
            </Label>
            <Select
              value={formData.billing_cycle}
              onValueChange={value => setFormData(prev => ({ ...prev, billing_cycle: value as BillingCycle }))}
            >
              <SelectTrigger className="glass-input border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_CYCLES.map(cycle => (
                  <SelectItem key={cycle.value} value={cycle.value}>
                    {cycle.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="edit-status" className="text-sm font-medium">
              Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={value => setFormData(prev => ({ ...prev, status: value as SubscriptionStatus }))}
            >
              <SelectTrigger className="glass-input border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Next Billing Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Next Billing Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal glass-input border-0",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="edit-payment_method" className="text-sm font-medium">
              Payment Method (optional)
            </Label>
            <Input
              id="edit-payment_method"
              value={formData.payment_method || ""}
              onChange={e => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
              placeholder="e.g., Visa •••• 4242"
              className="glass-input border-0"
              maxLength={100}
            />
          </div>

          {/* Reminder */}
          <div className="space-y-2">
            <Label htmlFor="edit-reminder" className="text-sm font-medium">
              Renewal Reminder
            </Label>
            <Select
              value={formData.reminder_days_before.toString()}
              onValueChange={value => setFormData(prev => ({ ...prev, reminder_days_before: parseInt(value) }))}
            >
              <SelectTrigger className="glass-input border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-renew Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="edit-auto_renew" className="text-sm font-medium">
                Auto-renew
              </Label>
              <p className="text-xs text-muted-foreground">
                Does this subscription renew automatically?
              </p>
            </div>
            <Switch
              id="edit-auto_renew"
              checked={formData.auto_renew}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, auto_renew: checked }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes" className="text-sm font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="edit-notes"
              value={formData.notes || ""}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any notes..."
              className="glass-input border-0 min-h-[80px] resize-none"
              maxLength={500}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="edit-tags" className="text-sm font-medium">
              Tags (optional)
            </Label>
            <Input
              id="edit-tags"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type and press Enter to add tags..."
              className="glass-input border-0"
            />
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {formData.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs font-semibold shadow-sm flex items-center gap-1 pr-1"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 premium-transition"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <LoadingButton
            type="submit"
            loading={isUpdating}
            loadingText="Saving..."
            size="lg"
            className="w-full"
          >
            Save Changes
          </LoadingButton>
        </form>
      </DialogContent>
    </Dialog>
  );
};
