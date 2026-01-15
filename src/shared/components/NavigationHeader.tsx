import { Button } from "./ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bookmark, CreditCard, Activity, LogOut, ArrowLeft, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/shared/hooks/use-toast";
import { AuthError } from "@/shared/types/errors";
import { AUTH_ERRORS } from "@/shared/lib/error-messages";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useState, useEffect, ReactNode } from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { LoadingSpinner } from "./LoadingSpinner";

interface NavigationHeaderProps {
  title: string;
  hideNavigation?: boolean;
  onAddClick?: () => void;
  addLabel?: string;
}

export const NavigationHeader = ({ 
  title, 
  hideNavigation = false,
  onAddClick,
  addLabel = "Add",
}: NavigationHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [canGoBack, setCanGoBack] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setCanGoBack(window.history.state?.idx !== undefined && window.history.state.idx > 0);
  }, [location]);

  // Global "/" shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
        searchInput?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      const authError = new AuthError(
        AUTH_ERRORS.SIGN_OUT_FAILED.message,
        error instanceof Error ? error : undefined
      );
      toast({
        title: AUTH_ERRORS.SIGN_OUT_FAILED.title,
        description: authError.message,
        variant: "destructive",
      });
      setSigningOut(false);
    } else {
      navigate('/');
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
    { path: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { path: '/health', label: 'Health', icon: Activity },
  ];

  return (
    <header className="flex items-center gap-1 w-full">
      {/* Back button */}
      <Button
        onClick={() => navigate(-1)}
        variant="ghost"
        size="icon"
        disabled={!canGoBack}
        className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      </Button>

      {/* Module navigation tabs */}
      {!hideNavigation && !isMobile && (
        <nav aria-label="Module navigation" className="flex items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === '/' && location.pathname === '/app') ||
              (item.path === '/bookmarks' && location.pathname === '/bookmarks');
            
            return (
              <Button
                key={item.path}
                onClick={() => navigate(item.path)}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 px-3 gap-2 text-sm font-medium rounded-full transition-colors",
                  isActive 
                    ? "bg-secondary text-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                )}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      )}

      {/* Title - mobile only */}
      {isMobile && (
        <h1 className="text-lg font-semibold text-foreground ml-1">
          {title}
        </h1>
      )}

      {/* Sign Out */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to access your data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSignOut}
              disabled={signingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {signingOut ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Signing out...
                </>
              ) : (
                "Sign Out"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add button - integrated */}
      {onAddClick && !isMobile && (
        <Button 
          onClick={onAddClick}
          size="sm"
          className="h-9 gap-2 px-4 rounded-full bg-foreground text-background hover:bg-foreground/90"
          aria-label={`${addLabel} new item`}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {addLabel}
        </Button>
      )}
    </header>
  );
};
