import { Badge } from "@/shared/components/ui";
import { MoreVertical, Trash2, Edit, ExternalLink, Star } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui";
import { Button } from "@/shared/components/ui";
import { differenceInDays } from "date-fns";
import { formatCurrency, calculateMonthlyCost, formatBillingCycle } from "@/features/subscriptions/utils/currency-utils";
import { CATEGORY_COLORS } from "@/features/subscriptions/constants";
import type { Subscription, SubscriptionBillingCycle, SubscriptionStatus } from "@/features/subscriptions/types";
import { parseSubscriptionDate } from "@/features/subscriptions/utils/date-utils";

interface SubscriptionCardProps {
  subscription: Subscription;
  onClick: () => void;
  onCategoryClick: (category: string) => void;
  onTagClick?: (tag: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

export const SubscriptionCard = ({
  subscription,
  onClick,
  onCategoryClick,
  onTagClick,
  onDelete,
  onEdit,
  onToggleFavorite
}: SubscriptionCardProps) => {
  const {
    id,
    name,
    provider,
    amount,
    currency,
    billing_cycle,
    next_billing_date,
    status,
    category,
    tags,
    website_url,
    is_favorite
  } = subscription;

  const monthlyAmount = calculateMonthlyCost(amount, billing_cycle as SubscriptionBillingCycle);
  const nextBillingDate = parseSubscriptionDate(next_billing_date);
  const daysUntilRenewal = nextBillingDate ? differenceInDays(nextBillingDate, new Date()) : null;
  const categoryColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`${name} subscription, ${formatCurrency(amount, currency)} ${billing_cycle}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="glass-card rounded-2xl p-6 cursor-pointer hover:scale-[1.02] premium-transition hover:shadow-2xl group overflow-hidden relative focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:outline-none"
      style={{ borderLeft: `4px solid ${categoryColor}` }}
    >
      {/* Favorite star indicator */}
      {is_favorite && (
        <div className="absolute top-4 left-4 z-10">
          <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
        </div>
      )}
      
      {/* Actions menu */}
      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 premium-transition">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full glass-light hover:shadow-md"
              aria-label="Card actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onToggleFavorite && (
              <DropdownMenuItem onClick={e => handleMenuAction(e, () => onToggleFavorite(id))}>
                <Star className={`mr-2 h-4 w-4 ${is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                {is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </DropdownMenuItem>
            )}
            {website_url && (
              <DropdownMenuItem
                onClick={e => {
                  e.stopPropagation();
                  window.open(website_url, '_blank');
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit Website
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={e => handleMenuAction(e, () => onEdit(id))}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={e => handleMenuAction(e, () => onDelete(id))}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-4">
        {/* Provider + Category */}
        <div className="flex items-center justify-between gap-2">
          {provider && (
            <span className="text-xs text-muted-foreground font-medium truncate">{provider}</span>
          )}
          <Badge
            variant="secondary"
            className="text-xs cursor-pointer hover:bg-accent premium-transition shrink-0"
            onClick={e => {
              e.stopPropagation();
              onCategoryClick(category);
            }}
          >
            {category}
          </Badge>
        </div>

        {/* Subscription Name */}
        <h3 className="font-bold text-lg line-clamp-2 leading-snug tracking-tight">{name}</h3>

        {/* Cost Badge */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">
            {formatCurrency(amount, currency)}
          </span>
          <span className="text-sm text-muted-foreground">/{formatBillingCycle(billing_cycle as SubscriptionBillingCycle)}</span>
        </div>

        {/* Monthly equivalent if not monthly */}
        {billing_cycle !== 'monthly' && billing_cycle !== 'one-time' && (
          <p className="text-xs text-muted-foreground">
            ≈ {formatCurrency(monthlyAmount, currency)}/month
          </p>
        )}

        {/* Status Badge */}
        <Badge variant="outline" className={`${getStatusColor(status as SubscriptionStatus)} text-xs font-medium`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>

        {/* Next Billing */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-xs text-muted-foreground">
            Next: {nextBillingDate ? nextBillingDate.toLocaleDateString() : "Date unavailable"}
          </span>
          {status === 'active' && daysUntilRenewal !== null && daysUntilRenewal >= 0 && daysUntilRenewal <= 7 && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
              Renews in {daysUntilRenewal} {daysUntilRenewal === 1 ? 'day' : 'days'}
            </Badge>
          )}
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs font-medium cursor-pointer hover:bg-accent transition-colors"
                onClick={e => {
                  e.stopPropagation();
                  if (onTagClick) onTagClick(tag);
                }}
              >
                #{tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs font-medium">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
