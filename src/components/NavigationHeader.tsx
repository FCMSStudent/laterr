import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bookmark, CreditCard, Activity, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthError } from "@/types/errors";
import { AUTH_ERRORS } from "@/lib/error-messages";

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  hideNavigation?: boolean;
}

export const NavigationHeader = ({ 
  title, 
  subtitle,
  hideNavigation = false 
}: NavigationHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleSignOut = async () => {
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-4xl text-foreground mb-1 tracking-tight font-sans font-semibold">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm font-medium">
              {subtitle}
            </p>
          )}
        </div>
        <Button
          onClick={handleSignOut}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground smooth-transition"
          aria-label="Sign out of your account"
        >
          <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
          Sign Out
        </Button>
      </div>
      
      {!hideNavigation && (
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
