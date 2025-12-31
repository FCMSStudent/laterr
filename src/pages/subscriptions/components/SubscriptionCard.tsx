import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  Edit, 
  Pause, 
  Play, 
  XCircle, 
  Trash2,
  CreditCard,
  Calendar,
  Globe,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Subscription } from "../types";
import { SUBSCRIPTION_CATEGORIES, CURRENCIES } from "../types";

interface SubscriptionCardProps {
  subscription: Subscription;
  onClick: () => void;
  onEdit: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export const SubscriptionCard = ({
  subscription,
  onClick,
  onEdit,
  onPause,
  onResume,
  onCancel,
  onDelete,
}: SubscriptionCardProps) => {
  const {
    name,
    category,
    amount,
    currency,
    billing_cycle,
    next_billing_date,
    status,
    logo_url,
    tags,
  } = subscription;

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
      case 'weekly': return '/week';
      case 'monthly': return '/month';
      case 'quarterly': return '/quarter';
      case 'yearly': return '/year';
      default: return '';
    }
  };

  const getDaysUntilRenewal = () => {
    const nextDate = new Date(next_billing_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilRenewal();
  
  const getRenewalUrgency = () => {
    if (status !== 'active') return '';
    if (daysUntil <= 0) return 'text-red-600 font-semibold';
    if (daysUntil <= 2) return 'text-red-500';
    if (daysUntil <= 5) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  const getRenewalText = () => {
    if (status !== 'active') return `Status: ${status}`;
    if (daysUntil <= 0) return 'Renews today';
    if (daysUntil === 1) return 'Renews tomorrow';
    return `Renews in ${daysUntil} days`;
  };

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`${name} subscription, ${getCurrencySymbol(currency)}${amount}${getBillingCycleLabel(billing_cycle)}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="glass-card rounded-2xl p-6 cursor-pointer hover:scale-[1.02] premium-transition hover:shadow-2xl group overflow-hidden relative focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:outline-none"
    >
      {/* Status badge */}
      <Badge
        variant="outline"
        className={`absolute top-4 right-4 text-xs font-medium capitalize ${getStatusColor(status)}`}
      >
        {status}
      </Badge>

      {/* Actions menu */}
      <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 premium-transition">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-background/80 hover:bg-background h-8 w-8"
              aria-label="Subscription actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={e => handleMenuAction(e, onEdit)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {status === 'active' && (
              <DropdownMenuItem onClick={e => handleMenuAction(e, onPause)}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </DropdownMenuItem>
            )}
            {status === 'paused' && (
              <DropdownMenuItem onClick={e => handleMenuAction(e, onResume)}>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </DropdownMenuItem>
            )}
            {status !== 'cancelled' && (
              <DropdownMenuItem onClick={e => handleMenuAction(e, onCancel)}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={e => handleMenuAction(e, onDelete)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Logo/Icon */}
      <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-muted/50 mb-4 mx-auto overflow-hidden">
        {logo_url ? (
          <img
            src={logo_url}
            alt={`${name} logo`}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <CreditCard className="h-8 w-8 text-muted-foreground/60" />
        )}
      </div>

      {/* Content */}
      <div className="space-y-3 text-center">
        {/* Name */}
        <h3 className="font-bold text-base line-clamp-1 tracking-tight">
          {name}
        </h3>

        {/* Amount */}
        <div className="text-2xl font-bold text-primary">
          {getCurrencySymbol(currency)}{amount.toFixed(2)}
          <span className="text-sm font-normal text-muted-foreground">
            {getBillingCycleLabel(billing_cycle)}
          </span>
        </div>

        {/* Category */}
        <p className="text-sm text-muted-foreground">
          {getCategoryLabel(category)}
        </p>

        {/* Next billing date */}
        <div className={`flex items-center justify-center gap-1 text-xs ${getRenewalUrgency()}`}>
          <Calendar className="h-3 w-3" />
          <span>{getRenewalText()}</span>
        </div>

        {/* Website indicator */}
        {subscription.website_url && (
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/70">
            <Globe className="h-3 w-3" />
            <span className="truncate max-w-[150px]">
              {new URL(subscription.website_url).hostname.replace('www.', '')}
            </span>
          </div>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center pt-2">
            {tags.slice(0, 2).map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs font-medium"
              >
                #{tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
