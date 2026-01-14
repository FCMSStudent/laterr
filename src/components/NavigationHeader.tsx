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
    <header className="mb-8">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm mb-3 text-muted-foreground">
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-muted-foreground/50" aria-hidden="true">/</span>
              )}
              {item.path ? (
                <button
                  onClick={() => navigate(item.path!)}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-foreground font-medium" aria-current="page">
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Back and Home Buttons */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => navigate(-1)}
                  variant="ghost"
                  size="sm"
                  disabled={!canGoBack}
                  className="text-muted-foreground hover:text-foreground smooth-transition"
                  aria-label="Go back to previous page"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  <span className="ml-2 hidden sm:inline">Back</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go back to previous page</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground smooth-transition"
                  aria-label="Go to home page"
                >
                  <Home className="w-4 h-4" aria-hidden="true" />
                  <span className="ml-2 hidden sm:inline">Home</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go to home page</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="border-l border-border h-6 hidden sm:block" aria-hidden="true"></div>

          <div>
            <h1 className="text-2xl md:text-4xl text-foreground mb-1 tracking-tight font-sans font-semibold">
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground text-xs md:text-sm font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Shortcut Indicator - Desktop only */}
          {!isMobile && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border text-[10px] font-mono">/</kbd>
              <span>to search</span>
            </div>
          )}

          {/* Sign Out with Confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size={isMobile ? "icon" : "sm"}
                className="text-muted-foreground hover:text-foreground smooth-transition min-h-[44px] min-w-[44px]"
                aria-label="Sign out of your account"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                {!isMobile && <span className="ml-2">Sign Out</span>}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out of your account?</AlertDialogTitle>
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
        </div>
      </div>
      
      {!hideNavigation && !isMobile && (
        <nav aria-label="Module navigation" className="flex gap-2 border-b border-border pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === '/' && location.pathname === '/app');
            
            return (
              <Button
                key={item.path}
                onClick={() => navigate(item.path)}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2",
                  !isActive && "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      )}
    </header>
  );
};
