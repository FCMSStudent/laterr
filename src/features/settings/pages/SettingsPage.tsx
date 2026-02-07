import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { ArrowLeft, Sun, Moon, Monitor, Sparkles, Eye, Trash2, LogOut, User } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui";
import { Label } from "@/shared/components/ui";
import { Separator } from "@/shared/components/ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui";
import { useGlassIntensity, GlassIntensity } from "@/shared/hooks/useGlassIntensity";
import { useRecentlyViewed } from "@/shared/hooks/useRecentlyViewed";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { intensity, setIntensity } = useGlassIntensity();
  const { clearRecentlyViewed } = useRecentlyViewed();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error) {
      toast.error("Failed to sign out");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleClearRecentItems = () => {
    clearRecentlyViewed();
    toast.success("Recently viewed items cleared");
  };

  const handleResetSettings = () => {
    setTheme("system");
    setIntensity("standard");
    clearRecentlyViewed();
    localStorage.removeItem("bookmarks-view-mode");
    toast.success("All settings reset to defaults");
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-light border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the app looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Theme</Label>
              <RadioGroup
                value={theme}
                onValueChange={setTheme}
                className="grid grid-cols-3 gap-3"
              >
                <Label
                  htmlFor="light"
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="light" id="light" className="sr-only" />
                  <Sun className="h-5 w-5" />
                  <span className="text-sm font-medium">Light</span>
                </Label>
                <Label
                  htmlFor="dark"
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="dark" id="dark" className="sr-only" />
                  <Moon className="h-5 w-5" />
                  <span className="text-sm font-medium">Dark</span>
                </Label>
                <Label
                  htmlFor="system"
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    theme === "system"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="system" id="system" className="sr-only" />
                  <Monitor className="h-5 w-5" />
                  <span className="text-sm font-medium">System</span>
                </Label>
              </RadioGroup>
            </div>

            <Separator />

            {/* Glass Intensity */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Glass Effect Intensity</Label>
              <RadioGroup
                value={intensity}
                onValueChange={(value) => setIntensity(value as GlassIntensity)}
                className="space-y-2"
              >
                <Label
                  htmlFor="standard"
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    intensity === "standard"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="standard" id="standard" />
                  <div className="flex-1">
                    <div className="font-medium">Standard</div>
                    <div className="text-sm text-muted-foreground">
                      Full blur and transparency effects
                    </div>
                  </div>
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </Label>
                <Label
                  htmlFor="reduced"
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    intensity === "reduced"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="reduced" id="reduced" />
                  <div className="flex-1">
                    <div className="font-medium">Reduced</div>
                    <div className="text-sm text-muted-foreground">
                      Less blur, better performance
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </Label>
                <Label
                  htmlFor="minimal"
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    intensity === "minimal"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="minimal" id="minimal" />
                  <div className="flex-1">
                    <div className="font-medium">Minimal</div>
                    <div className="text-sm text-muted-foreground">
                      Solid colors, maximum performance
                    </div>
                  </div>
                </Label>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Data Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Data & Storage
            </CardTitle>
            <CardDescription>
              Manage your local data and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border">
              <div>
                <div className="font-medium">Clear Recent Items</div>
                <div className="text-sm text-muted-foreground">
                  Remove your recently viewed history
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">Clear</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear recently viewed?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear your recently viewed items history. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearRecentItems}>
                      Clear
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border">
              <div>
                <div className="font-medium">Reset All Settings</div>
                <div className="text-sm text-muted-foreground">
                  Restore all settings to their defaults
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">Reset</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset theme, glass intensity, and clear all local preferences. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetSettings}>
                      Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>
              Manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {userEmail && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{userEmail}</div>
                  <div className="text-sm text-muted-foreground">Signed in</div>
                </div>
              </div>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isSigningOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
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
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSignOut}>
                    Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
