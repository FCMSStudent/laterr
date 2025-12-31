import { useState } from "react";
import { Dialog, DialogContent, DialogDescription } from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
import {
  CreditCard,
  Calendar,
  Globe,
  Edit,
  Pause,
  Play,
  XCircle,
  Trash2,
  ExternalLink,
  Clock,
  Bell,
  RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { Subscription } from "../types";
import { SUBSCRIPTION_CATEGORIES, CURRENCIES } from "../types";
import { useSubscriptions } from "../hooks/useSubscriptions";

interface DetailViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
  onEdit: () => void;
}

export const DetailViewModal = ({
  open,
  onOpenChange,
  subscription,
  onEdit,
}: DetailViewModalProps) => {
  const {
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    deleteSubscriptionAsync,
    isUpdating,
    isDeleting,
  } = useSubscriptions();

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  const getCategoryLabel = (cat: string) => {
    const found = SUBSCRIPTION_CATEGORIES.find(c => c.value === cat);
    return found?.label ?? cat;
  };

  const getCurrencySymbol = (curr: string) => {
    const found = CURRENCIES.find(c => c.value === curr);
    return found?.symbol ?? curr;
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'active':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getBillingCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'yearly': return 'Yearly';
      default: return cycle;
    }
  };

  const getMonthlyEquivalent = () => {
    const { amount, billing_cycle } = subscription;
    switch (billing_cycle) {
      case 'weekly': return amount * 4.33;
      case 'monthly': return amount;
      case 'quarterly': return amount / 3;
      case 'yearly': return amount / 12;
      default: return amount;
    }
  };

  const getYearlyEquivalent = () => {
    const { amount, billing_cycle } = subscription;
    switch (billing_cycle) {
      case 'weekly': return amount * 52;
      case 'monthly': return amount * 12;
      case 'quarterly': return amount * 4;
      case 'yearly': return amount;
      default: return amount * 12;
    }
  };

  const handlePause = async () => {
    await pauseSubscription(subscription.id);
  };

  const handleResume = async () => {
    await resumeSubscription(subscription.id);
  };

  const handleCancel = async () => {
    await cancelSubscription(subscription.id);
    setShowCancelAlert(false);
  };

  const handleDelete = async () => {
    await deleteSubscriptionAsync(subscription.id);
    setShowDeleteAlert(false);
    onOpenChange(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP");
    } catch {
      return dateString;
    }
  };

  const formatRelativeDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl h-[100vh] sm:h-auto sm:max-h-[85vh] p-0 overflow-hidden border-0 glass-card">
          <DialogDescription className="sr-only">
            Subscription details for {subscription.name}
          </DialogDescription>

          <div className="h-full overflow-y-auto">
            {/* Header with logo and name */}
            <div className="bg-muted/30 p-6 text-center border-b border-border/50">
              {/* Logo */}
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-background shadow-lg mb-4 mx-auto overflow-hidden">
                {subscription.logo_url ? (
                  <img
                    src={subscription.logo_url}
                    alt={`${subscription.name} logo`}
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                ) : (
                  <CreditCard className="h-10 w-10 text-muted-foreground/60" />
                )}
              </div>

              {/* Name and Status */}
              <h2 className="text-xl font-bold mb-2">{subscription.name}</h2>
              <Badge
                variant="outline"
                className={`text-xs font-medium capitalize ${getStatusColor(subscription.status)}`}
              >
                {subscription.status}
              </Badge>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Amount */}
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-1">
                  {getCurrencySymbol(subscription.currency)}
                  {subscription.amount.toFixed(2)}
                  <span className="text-lg font-normal text-muted-foreground">
                    /{subscription.billing_cycle}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  ≈ {getCurrencySymbol(subscription.currency)}
                  {getMonthlyEquivalent().toFixed(2)}/month • {getCurrencySymbol(subscription.currency)}
                  {getYearlyEquivalent().toFixed(2)}/year
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Category</p>
                  <p className="text-sm font-medium">{getCategoryLabel(subscription.category)}</p>
                </div>

                {/* Billing Cycle */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Billing Cycle</p>
                  <p className="text-sm font-medium">{getBillingCycleLabel(subscription.billing_cycle)}</p>
                </div>

                {/* Next Billing Date */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Next Billing</p>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{formatDate(subscription.next_billing_date)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeDate(subscription.next_billing_date)}
                  </p>
                </div>

                {/* Reminder */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Reminder</p>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{subscription.reminder_days_before} days before</span>
                  </div>
                </div>

                {/* Auto Renew */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Auto Renew</p>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{subscription.auto_renew ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {/* Payment Method */}
                {subscription.payment_method && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Method</p>
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{subscription.payment_method}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Website */}
              {subscription.website_url && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Website</p>
                  <a
                    href={subscription.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span className="truncate">{new URL(subscription.website_url).hostname}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Notes */}
              {subscription.notes && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Notes</p>
                  <p className="text-sm text-foreground/90 bg-muted/30 rounded-lg p-3">
                    {subscription.notes}
                  </p>
                </div>
              )}

              {/* Tags */}
              {subscription.tags && subscription.tags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {subscription.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex justify-between text-xs text-muted-foreground pt-4 border-t border-border/50">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Created {formatRelativeDate(subscription.created_at)}</span>
                </div>
                {subscription.updated_at !== subscription.created_at && (
                  <span>Updated {formatRelativeDate(subscription.updated_at)}</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  onClick={onEdit}
                  variant="outline"
                  className="flex-1"
                  disabled={isUpdating}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>

                {subscription.status === 'active' && (
                  <Button
                    onClick={handlePause}
                    variant="outline"
                    className="flex-1"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    )}
                  </Button>
                )}

                {subscription.status === 'paused' && (
                  <Button
                    onClick={handleResume}
                    variant="outline"
                    className="flex-1"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </>
                    )}
                  </Button>
                )}

                {subscription.status !== 'cancelled' && (
                  <Button
                    onClick={() => setShowCancelAlert(true)}
                    variant="outline"
                    className="flex-1 border-yellow-500/20 text-yellow-600 hover:bg-yellow-500/10"
                    disabled={isUpdating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}

                <Button
                  onClick={() => setShowDeleteAlert(true)}
                  variant="outline"
                  className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AlertDialogContent className="glass-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark "{subscription.name}" as cancelled. You can still see it in your list
              but it won't count towards your spending analytics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-input">Keep Active</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-yellow-600 text-white hover:bg-yellow-600/90"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="glass-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{subscription.name}" and all its payment history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-input">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
