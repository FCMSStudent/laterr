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
import { X, CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/shared/lib/utils";
import { useSubscriptions } from "../hooks/useSubscriptions";
import {
  SUBSCRIPTION_CATEGORIES,
  BILLING_CYCLES,
  CURRENCIES,
  REMINDER_OPTIONS,
} from "../types";
import type { SubscriptionFormData, BillingCycle } from "../types";

interface AddSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddSubscriptionModal = ({
  open,
  onOpenChange,
}: AddSubscriptionModalProps) => {
  const { createSubscriptionAsync, isCreating } = useSubscriptions();
  
  const [formData, setFormData] = useState<SubscriptionFormData>({
    name: "",
    category: "other",
    amount: 0,
    currency: "USD",
    billing_cycle: "monthly",
    next_billing_date: format(new Date(), "yyyy-MM-dd"),
    status: "active",
    payment_method: "",
    website_url: "",
    logo_url: "",
    notes: "",
    tags: [],
    reminder_days_before: 3,
    auto_renew: true,
  });

  const [tagInput, setTagInput] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [fetchingLogo, setFetchingLogo] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: "",
        category: "other",
        amount: 0,
        currency: "USD",
        billing_cycle: "monthly",
        next_billing_date: format(new Date(), "yyyy-MM-dd"),
        status: "active",
        payment_method: "",
        website_url: "",
        logo_url: "",
        notes: "",
        tags: [],
        reminder_days_before: 3,
        auto_renew: true,
      });
      setTagInput("");
      setDate(new Date());
    }
  }, [open]);

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

  const handleWebsiteBlur = async () => {
    // Auto-fetch logo when website URL is provided
    if (formData.website_url && !formData.logo_url) {
      try {
        setFetchingLogo(true);
        // Use Google's favicon service as a simple fallback
        const url = new URL(formData.website_url);
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
        setFormData(prev => ({
          ...prev,
          logo_url: faviconUrl,
        }));
      } catch (error) {
        console.error("Error fetching logo:", error);
      } finally {
        setFetchingLogo(false);
      }
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
      await createSubscriptionAsync(formData);
      onOpenChange(false);
    } catch (error) {
      // Error is handled in the hook
      console.error("Error creating subscription:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto !bg-background border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground">
            Add Subscription
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Track a new recurring subscription or payment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Subscription Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
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
            <Label htmlFor="category" className="text-sm font-medium">
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
              <Label htmlFor="amount" className="text-sm font-medium">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
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
              <Label htmlFor="currency" className="text-sm font-medium">
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
            <Label htmlFor="billing_cycle" className="text-sm font-medium">
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
            <Label htmlFor="payment_method" className="text-sm font-medium">
              Payment Method (optional)
            </Label>
            <Input
              id="payment_method"
              value={formData.payment_method || ""}
              onChange={e => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
              placeholder="e.g., Visa •••• 4242"
              className="glass-input border-0"
              maxLength={100}
            />
          </div>

          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="website_url" className="text-sm font-medium">
              Website URL (optional)
            </Label>
            <div className="relative">
              <Input
                id="website_url"
                type="url"
                value={formData.website_url || ""}
                onChange={e => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                onBlur={handleWebsiteBlur}
                placeholder="https://..."
                className="glass-input border-0"
              />
              {fetchingLogo && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Logo Preview */}
          {formData.logo_url && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden">
                <img
                  src={formData.logo_url}
                  alt="Logo preview"
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, logo_url: "" }))}
              >
                Remove logo
              </Button>
            </div>
          )}

          {/* Reminder */}
          <div className="space-y-2">
            <Label htmlFor="reminder" className="text-sm font-medium">
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
              <Label htmlFor="auto_renew" className="text-sm font-medium">
                Auto-renew
              </Label>
              <p className="text-xs text-muted-foreground">
                Does this subscription renew automatically?
              </p>
            </div>
            <Switch
              id="auto_renew"
              checked={formData.auto_renew}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, auto_renew: checked }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any notes..."
              className="glass-input border-0 min-h-[80px] resize-none"
              maxLength={500}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-sm font-medium">
              Tags (optional)
            </Label>
            <Input
              id="tags"
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
            loading={isCreating}
            loadingText="Adding..."
            size="lg"
            className="w-full"
          >
            Add Subscription
          </LoadingButton>
        </form>
      </DialogContent>
    </Dialog>
  );
};
