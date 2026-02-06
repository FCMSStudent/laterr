import { Button } from "@/shared/components/ui";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bookmark, LogOut, ArrowLeft, Plus, Search, Settings, MoreVertical, Sun } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/shared/hooks/use-toast";
import { AuthError } from "@/shared/types/errors";
import { AUTH_ERRORS } from "@/shared/lib/error-messages";
import { useState, useEffect, ReactNode } from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Input } from "@/shared/components/ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui";
import { LoadingSpinner } from "./LoadingSpinner";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/shared/components/ui";
import { useTheme } from "next-themes";
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
  showOverflowMenu?: boolean;
  overflowExtra?: ReactNode;
}
export const NavigationHeader = ({
  title,
  hideNavigation = false,
  onAddClick,
  addLabel = "Add",
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
  filterButton,
  showOverflowMenu = true,
  overflowExtra
}: NavigationHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
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
  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
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
  return <header className="flex items-center gap-2 md:gap-3 w-full">
    {/* Left cluster */}
    <div className={cn("flex items-center gap-2 shrink-0", isMobile && canGoBack && "gap-1")}>
      {canGoBack && <Button onClick={() => navigate(-1)} variant="ghost" size="icon" className={cn("h-9 w-9 md:h-8 md:w-8 text-muted-foreground hover:text-foreground shrink-0 active:scale-95 transition-transform", isMobile && "-ml-1")} aria-label="Go back">
          <ArrowLeft className="w-[18px] h-[18px] md:w-4 md:h-4" aria-hidden="true" />
        </Button>}
      <h1 className="nav-title text-base md:text-lg font-semibold text-foreground leading-none truncate max-w-[160px] md:max-w-[280px]">
        {title}
      </h1>

      {/* Module navigation tabs - desktop only */}
      {!hideNavigation && !isMobile && <nav aria-label="Module navigation" className="flex items-center ml-2">
          <div className="flex items-center rounded-full glass-light border border-white/20 p-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || item.path === '/' && location.pathname === '/app' || item.path === '/bookmarks' && location.pathname === '/bookmarks';
              return <Button key={item.path} onClick={() => navigate(item.path)} variant="ghost" size="sm" className={cn("h-7 px-3 text-[11px] font-medium rounded-full transition-colors", isActive ? "bg-white/70 text-foreground shadow-sm" : "text-muted-foreground/80 hover:text-foreground hover:bg-transparent")}>
                {item.label}
              </Button>;
            })}
          </div>
        </nav>}
    </div>

    {/* Center cluster */}
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {showInlineSearch && <div className="flex-1 relative min-w-[140px] max-w-[520px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input type="search" value={searchValue || ""} onChange={e => onSearchChange?.(e.target.value)} placeholder={searchPlaceholder} className="h-9 md:h-10 pl-9 pr-3 rounded-full glass-input text-xs md:text-sm" data-search-input />
        </div>}
      {filterButton}
    </div>

    {/* Right cluster */}
    <div className="flex items-center gap-1 md:gap-2 shrink-0">
      {/* Add button - integrated */}
      {onAddClick && (isMobile ? <Button onClick={onAddClick} variant="ghost" size="icon" className="h-9 w-9 text-primary hover:text-primary/80 shrink-0" aria-label={`${addLabel} new item`}>
            <Plus className="w-[18px] h-[18px]" aria-hidden="true" />
          </Button> : <Button onClick={onAddClick} size="sm" className="h-8 gap-2 rounded-full text-primary-foreground bg-primary px-[12px] py-0" aria-label={`${addLabel} new item`}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            {addLabel}
          </Button>)}

      <AlertDialog>
        {!isMobile && <>
            <Button onClick={() => navigate("/settings")} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/80 hover:text-foreground shrink-0" aria-label="Settings">
              <Settings className="w-4 h-4" aria-hidden="true" />
            </Button>
            <div className="opacity-85 hover:opacity-100 transition-opacity">
              <ThemeToggle />
            </div>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/80 hover:text-foreground shrink-0" aria-label="Sign out">
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
          </>}

        {isMobile && showOverflowMenu && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0" aria-label="More options">
                <MoreVertical className="w-[18px] h-[18px]" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem onSelect={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleToggleTheme}>
                <Sun className="mr-2 h-4 w-4" aria-hidden="true" />
                Toggle theme
              </DropdownMenuItem>
              {overflowExtra}
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>}

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
    </div>
  </header>;
};
