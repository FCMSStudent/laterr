import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bookmark, CreditCard, Activity, LogOut, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthError } from "@/types/errors";
import { AUTH_ERRORS } from "@/lib/error-messages";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
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
} from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  hideNavigation?: boolean;
  breadcrumbs?: BreadcrumbItem[];
}

export const NavigationHeader = ({ 
  title, 
  subtitle,
  hideNavigation = false,
  breadcrumbs
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
      // Don't trigger if typing in an input
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
    <header className="flex items-center gap-2 flex-wrap">
      {/* Back button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="icon"
            disabled={!canGoBack}
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Go back</TooltipContent>
      </Tooltip>

      {/* Module navigation - inline */}
      {!hideNavigation && !isMobile && (
        <nav aria-label="Module navigation" className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === '/' && location.pathname === '/app');
            
            return (
              <Button
                key={item.path}
                onClick={() => navigate(item.path)}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2.5 gap-1.5 text-xs font-medium rounded-md",
                  isActive 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                )}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            );
          })}
        </nav>
      )}

      {/* Title - mobile only or when nav hidden */}
      {(isMobile || hideNavigation) && (
        <h1 className="text-lg font-semibold text-foreground">
          {title}
        </h1>
      )}

      <div className="flex-1" />

      {/* Sign Out */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
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
    </header>
  );
};
