import { Button } from "@/shared/components/ui";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bookmark, CreditCard, Activity, LogOut, ArrowLeft, Plus, Search, Settings } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/shared/hooks/use-toast";
import { AuthError } from "@/shared/types/errors";
import { AUTH_ERRORS } from "@/shared/lib/error-messages";
import { useState, useEffect, ReactNode } from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Input } from "@/shared/components/ui";
import { Badge } from "@/shared/components/ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui";
import { LoadingSpinner } from "./LoadingSpinner";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
interface NavigationHeaderProps {
  title: string;
  hideNavigation?: boolean;
  onAddClick?: () => void;
  addLabel?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  // Filter button for mobile inline display (combined filter & sort)
  filterButton?: ReactNode;
}
export const NavigationHeader = ({
  title,
  hideNavigation = false,
  onAddClick,
  addLabel = "Add",
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
  filterButton
}: NavigationHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useToast();
  const [canGoBack, setCanGoBack] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const isMobile = useIsMobile();
  useEffect(() => {
    setCanGoBack(window.history.state?.idx !== undefined && window.history.state.idx > 0);
  }, [location]);

  // Global "/" shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) {
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
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      const authError = new AuthError(AUTH_ERRORS.SIGN_OUT_FAILED.message, error instanceof Error ? error : undefined);
      toast({
        title: AUTH_ERRORS.SIGN_OUT_FAILED.title,
        description: authError.message,
        variant: "destructive"
      });
      setSigningOut(false);
    } else {
      navigate('/');
    }
  };
  const navItems = [{
    path: '/',
    label: 'Dashboard',
    icon: Home
  }, {
    path: '/bookmarks',
    label: 'Bookmarks',
    icon: Bookmark
  }];
  const showInlineSearch = onSearchChange !== undefined;
  return <header className="flex items-center gap-2 w-full">
    {/* Back button - larger touch target on mobile */}
    <Button onClick={() => navigate(-1)} variant="ghost" size="icon" disabled={!canGoBack} className="h-10 w-10 md:h-9 md:w-9 text-muted-foreground hover:text-foreground shrink-0 active:scale-95 transition-transform" aria-label="Go back">
      <ArrowLeft className="w-5 h-5 md:w-4 md:h-4" aria-hidden="true" />
    </Button>

    {/* Inline search bar on mobile */}
    {showInlineSearch && <div className="flex-1 relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input type="search" value={searchValue || ""} onChange={e => onSearchChange?.(e.target.value)} placeholder={searchPlaceholder} className="h-10 pl-9 pr-3 rounded-full glass-input text-sm" data-search-input />
    </div>}

    {/* Filter & Sort button */}
    {filterButton}

    {/* Module navigation tabs - desktop only */}
    {!hideNavigation && !isMobile && <nav aria-label="Module navigation" className="flex items-center">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || item.path === '/' && location.pathname === '/app' || item.path === '/bookmarks' && location.pathname === '/bookmarks';
        return <Button key={item.path} onClick={() => navigate(item.path)} variant="ghost" size="sm" className={cn("h-9 px-3 gap-2 text-sm font-medium rounded-full transition-colors", isActive ? "glass-light text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-transparent")}>
          <Icon className="w-4 h-4" aria-hidden="true" />
          {item.label}
        </Button>;
      })}
    </nav>}

    {/* Spacer - only when no inline search on mobile */}
    {!showInlineSearch && <div className="flex-1" />}

    {/* Settings button */}
    <Button onClick={() => navigate("/settings")} variant="ghost" size="icon" className="h-10 w-10 md:h-9 md:w-9 text-muted-foreground hover:text-foreground shrink-0 active:scale-95 transition-transform" aria-label="Settings">
      <Settings className="w-5 h-5 md:w-4 md:h-4" aria-hidden="true" />
    </Button>

    {/* Theme Toggle */}
    <ThemeToggle />

    {/* Sign Out - larger touch target on mobile */}
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 md:h-9 md:w-9 text-muted-foreground hover:text-foreground shrink-0 active:scale-95 transition-transform" aria-label="Sign out">
          <LogOut className="w-5 h-5 md:w-4 md:h-4" aria-hidden="true" />
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
          <AlertDialogAction onClick={handleSignOut} disabled={signingOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {signingOut ? <>
              <LoadingSpinner size="sm" className="mr-2" />
              Signing out...
            </> : "Sign Out"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Add button - integrated */}
    {onAddClick && (isMobile ? <Button onClick={onAddClick} variant="ghost" size="icon" className="h-10 w-10 text-primary hover:text-primary/80 shrink-0" aria-label={`${addLabel} new item`}>
        <Plus className="w-6 h-6" aria-hidden="true" />
      </Button> : <Button onClick={onAddClick} size="sm" className="h-9 gap-2 rounded-full text-primary-foreground bg-primary px-[12px] py-0" aria-label={`${addLabel} new item`}>
        <Plus className="w-4 h-4" aria-hidden="true" />
        {addLabel}
      </Button>)}
  </header>;
};
