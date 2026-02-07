import { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Input,
  EnhancedInput,
  Textarea,
  EnhancedTextarea,
  Label,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Switch,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Popover,
  PopoverContent,
  PopoverTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Separator,
  Toaster,
} from "@/shared/components/ui";
import { Toaster as SonnerToaster } from "@/shared/components/ui/feedback/sonner";
import { NavigationHeader } from "@/shared/components/NavigationHeader";
import { MobileBottomNav } from "@/shared/components/MobileBottomNav";
import { ModuleNavigationCard } from "@/shared/components/ModuleNavigationCard";
import { Breadcrumbs } from "@/shared/components/Breadcrumbs";
import { SearchBar } from "@/shared/components/SearchBar";
import { CollapsibleSummary } from "@/shared/components/CollapsibleSummary";
import { GradientBackground } from "@/shared/components/GradientBackground";
import { CompactListRow } from "@/shared/components/CompactListRow";
import { QuickStatsGrid } from "@/shared/components/QuickStatsGrid";
import { DashboardWidget } from "@/shared/components/DashboardWidget";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { PageLoading } from "@/shared/components/PageLoading";
import { Bookmark, CreditCard, Activity, User as UserIcon, Search, Bell, Settings, FileText } from "lucide-react";
import { useForm } from "react-hook-form";

const ComponentShowcasePage = () => {
  const [searchValue, setSearchValue] = useState("");
  const [collapsibleExpanded, setCollapsibleExpanded] = useState(false);
  const [showPageLoading, setShowPageLoading] = useState(false);

  // Simple form for FormComponents demo - no actual submission
  const form = useForm({
    defaultValues: {
      username: "",
      email: "",
    },
  });

  // Handle keyboard escape for PageLoading demo
  const handlePageLoadingKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowPageLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">UI Components Showcase</h1>
            <p className="text-muted-foreground">Visual reference for all available UI components</p>
          </div>

          {/* ====================================== */}
          {/* NAVIGATION & LAYOUT COMPONENTS */}
          {/* ====================================== */}
          <section id="navigation-layout" className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">Navigation & Layout Components</h2>
            
            {/* NavigationHeader */}
            <Card>
              <CardHeader>
                <CardTitle>NavigationHeader</CardTitle>
                <CardDescription>Main navigation header with search and actions</CardDescription>
              </CardHeader>
              <CardContent className="bg-muted/50 rounded-lg p-4">
                <NavigationHeader 
                  title="Dashboard"
                  searchValue={searchValue}
                  onSearchChange={setSearchValue}
                  searchPlaceholder="Search..."
                  onAddClick={() => {}}
                  addLabel="Add Item"
                />
              </CardContent>
            </Card>

            {/* MobileBottomNav */}
            <Card>
              <CardHeader>
                <CardTitle>MobileBottomNav</CardTitle>
                <CardDescription>Bottom navigation for mobile devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative h-[100px] bg-muted/50 rounded-lg overflow-hidden">
                  <div className="absolute bottom-0 left-0 right-0">
                    <MobileBottomNav />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ModuleNavigationCard */}
            <Card>
              <CardHeader>
                <CardTitle>ModuleNavigationCard</CardTitle>
                <CardDescription>Navigation cards for module access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModuleNavigationCard
                    icon={Bookmark}
                    title="Bookmarks"
                    description="Save and organize your content"
                    count={42}
                    onClick={() => {}}
                  />
                  <ModuleNavigationCard
                    icon={CreditCard}
                    title="Subscriptions"
                    description="Track your recurring payments"
                    count={8}
                    onClick={() => {}}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Breadcrumbs */}
            <Card>
              <CardHeader>
                <CardTitle>Breadcrumbs</CardTitle>
                <CardDescription>Navigation breadcrumb trail</CardDescription>
              </CardHeader>
              <CardContent>
                <Breadcrumbs 
                  items={[
                    { label: "Home", onClick: () => {} },
                    { label: "Documents", onClick: () => {} },
                    { label: "Current Page" },
                  ]} 
                />
              </CardContent>
            </Card>

            {/* SearchBar */}
            <Card>
              <CardHeader>
                <CardTitle>SearchBar</CardTitle>
                <CardDescription>Search input wrapping EnhancedInput</CardDescription>
              </CardHeader>
              <CardContent>
                <SearchBar value={searchValue} onChange={setSearchValue} />
              </CardContent>
            </Card>

            {/* CollapsibleSummary */}
            <Card>
              <CardHeader>
                <CardTitle>CollapsibleSummary</CardTitle>
                <CardDescription>Expandable summary section</CardDescription>
              </CardHeader>
              <CardContent>
                <CollapsibleSummary
                  summary="$245/mo • 8 active • 2 due soon"
                  expanded={collapsibleExpanded}
                  onToggle={() => setCollapsibleExpanded(!collapsibleExpanded)}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded">Monthly: $245</div>
                    <div className="p-3 bg-muted rounded">Active: 8</div>
                    <div className="p-3 bg-muted rounded">Due Soon: 2</div>
                    <div className="p-3 bg-muted rounded">Cancelled: 1</div>
                  </div>
                </CollapsibleSummary>
              </CardContent>
            </Card>

            {/* GradientBackground */}
            <Card>
              <CardHeader>
                <CardTitle>GradientBackground</CardTitle>
                <CardDescription>Decorative gradient background element</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative h-[150px] rounded-lg overflow-hidden border">
                  <GradientBackground />
                  <div className="relative z-10 flex items-center justify-center h-full">
                    <span className="text-foreground font-medium">Content with gradient background</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ====================================== */}
          {/* DATA DISPLAY COMPONENTS */}
          {/* ====================================== */}
          <section id="data-display" className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">Data Display Components</h2>

            {/* CompactListRow */}
            <Card>
              <CardHeader>
                <CardTitle>CompactListRow</CardTitle>
                <CardDescription>Compact list item rows</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <CompactListRow
                  icon={<CreditCard className="h-5 w-5" />}
                  title="Netflix"
                  subtitle="Next billing: Jan 15"
                  trailing={<span className="font-semibold">$15.99</span>}
                  onClick={() => {}}
                />
                <CompactListRow
                  icon={<CreditCard className="h-5 w-5" />}
                  title="Spotify"
                  subtitle="Next billing: Jan 20"
                  trailing={<span className="font-semibold">$9.99</span>}
                  onClick={() => {}}
                />
                <CompactListRow
                  icon={<CreditCard className="h-5 w-5" />}
                  title="Adobe Creative Cloud"
                  subtitle="Next billing: Feb 1"
                  trailing={<span className="font-semibold">$54.99</span>}
                  onClick={() => {}}
                  selected
                />
              </CardContent>
            </Card>

            {/* QuickStatsGrid */}
            <Card>
              <CardHeader>
                <CardTitle>QuickStatsGrid</CardTitle>
                <CardDescription>Grid of quick statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <QuickStatsGrid
                  totalBookmarks={156}
                  activeSubscriptions={8}
                  recentMeasurements={24}
                  goalsProgress={3}
                />
              </CardContent>
            </Card>

            {/* DashboardWidget */}
            <Card>
              <CardHeader>
                <CardTitle>DashboardWidget</CardTitle>
                <CardDescription>Individual dashboard statistic widget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DashboardWidget
                    icon={Bookmark}
                    label="Total Items"
                    value={156}
                    trend={{ value: 12, isPositive: true }}
                  />
                  <DashboardWidget
                    icon={Activity}
                    label="Activity Score"
                    value="87%"
                    trend={{ value: 5, isPositive: true }}
                  />
                  <DashboardWidget
                    icon={CreditCard}
                    label="Monthly Cost"
                    value="$245"
                    trend={{ value: 3, isPositive: false }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* RecommendationsPanel - Note: This wraps ItemCard but requires DB */}
            <Card>
              <CardHeader>
                <CardTitle>RecommendationsPanel</CardTitle>
                <CardDescription>Personalized recommendations panel (wraps ItemCard)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Note: RecommendationsPanel requires database connection and user context to display recommendations.
                  In production, it displays ItemCard components based on user's saved content and interests.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* ====================================== */}
          {/* FORM & INPUT COMPONENTS */}
          {/* ====================================== */}
          <section id="form-input" className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">Form & Input Components</h2>

            {/* EnhancedInput */}
            <Card>
              <CardHeader>
                <CardTitle>EnhancedInput</CardTitle>
                <CardDescription>Enhanced input with icons, validation states, and clear button</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email with auto-icon</Label>
                  <EnhancedInput type="email" placeholder="Enter your email" />
                </div>
                <div className="space-y-2">
                  <Label>Password with toggle</Label>
                  <EnhancedInput type="password" placeholder="Enter password" showPasswordToggle />
                </div>
                <div className="space-y-2">
                  <Label>Search with clear button</Label>
                  <EnhancedInput 
                    type="search" 
                    placeholder="Search..." 
                    prefixIcon="search"
                    showClearButton 
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onClear={() => setSearchValue("")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>With validation error</Label>
                  <EnhancedInput 
                    type="email" 
                    placeholder="Invalid email" 
                    value="invalid-email"
                    error="Please enter a valid email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>With success state</Label>
                  <EnhancedInput 
                    type="email" 
                    placeholder="Valid email" 
                    value="user@example.com"
                    success
                  />
                </div>
              </CardContent>
            </Card>

            {/* Input */}
            <Card>
              <CardHeader>
                <CardTitle>Input</CardTitle>
                <CardDescription>Basic input field</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="basic-input">Basic Input</Label>
                  <Input id="basic-input" placeholder="Enter text..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disabled-input">Disabled Input</Label>
                  <Input id="disabled-input" placeholder="Disabled" disabled />
                </div>
              </CardContent>
            </Card>

            {/* Textarea */}
            <Card>
              <CardHeader>
                <CardTitle>Textarea & EnhancedTextarea</CardTitle>
                <CardDescription>Multi-line text input with enhanced features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="textarea">Basic Textarea</Label>
                  <Textarea id="textarea" placeholder="Type your message here..." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enhanced-textarea">Enhanced Textarea with Character Count</Label>
                  <EnhancedTextarea
                    id="enhanced-textarea"
                    placeholder="Type here to see character count..."
                    maxLength={100}
                    showCharacterCount={true}
                    helperText="Try typing more than 90 characters to see the warning color."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enhanced-textarea-error">Enhanced Textarea with Error</Label>
                  <EnhancedTextarea
                    id="enhanced-textarea-error"
                    placeholder="Error state..."
                    error="This field is required"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Form Components */}
            <Card>
              <CardHeader>
                <CardTitle>Form Components</CardTitle>
                <CardDescription>FormLabel, FormItem, FormControl, FormDescription, FormMessage, FormField</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter username" {...field} />
                          </FormControl>
                          <FormDescription>This is your public display name.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email" {...field} />
                          </FormControl>
                          <FormDescription>We'll never share your email.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* RadioGroup */}
            <Card>
              <CardHeader>
                <CardTitle>RadioGroup & RadioGroupItem</CardTitle>
                <CardDescription>Radio button group selection</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup defaultValue="option1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option1" id="radio-1" />
                    <Label htmlFor="radio-1">Option 1</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option2" id="radio-2" />
                    <Label htmlFor="radio-2">Option 2</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option3" id="radio-3" />
                    <Label htmlFor="radio-3">Option 3</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Switch & Checkbox */}
            <Card>
              <CardHeader>
                <CardTitle>Switch & Checkbox</CardTitle>
                <CardDescription>Toggle controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="switch" />
                  <Label htmlFor="switch">Enable notifications</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="checkbox" />
                  <Label htmlFor="checkbox">Accept terms and conditions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="checkbox-checked" defaultChecked />
                  <Label htmlFor="checkbox-checked">Remember me</Label>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ====================================== */}
          {/* OVERLAYS & FEEDBACK COMPONENTS */}
          {/* ====================================== */}
          <section id="overlays-feedback" className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">Overlays & Feedback Components</h2>

            {/* Dialog */}
            <Card>
              <CardHeader>
                <CardTitle>Dialog</CardTitle>
                <CardDescription>Modal dialog with DialogContent, DialogHeader, etc.</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dialog Title</DialogTitle>
                      <DialogDescription>
                        This is a dialog description with more information about the action.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">Dialog content goes here</div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Drawer */}
            <Card>
              <CardHeader>
                <CardTitle>Drawer</CardTitle>
                <CardDescription>Bottom drawer with DrawerContent, DrawerHeader, etc.</CardDescription>
              </CardHeader>
              <CardContent>
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline">Open Drawer</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Drawer Title</DrawerTitle>
                      <DrawerDescription>This is a drawer description.</DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4">Drawer content goes here</div>
                    <DrawerFooter>
                      <Button>Submit</Button>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </CardContent>
            </Card>

            {/* AlertDialog */}
            <Card>
              <CardHeader>
                <CardTitle>AlertDialog</CardTitle>
                <CardDescription>Confirmation dialog for destructive actions</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Sheet */}
            <Card>
              <CardHeader>
                <CardTitle>Sheet</CardTitle>
                <CardDescription>Side panel with SheetTrigger, SheetOverlay, etc.</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">Open Sheet (Right)</Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Sheet Title</SheetTitle>
                      <SheetDescription>This is a sheet from the right side.</SheetDescription>
                    </SheetHeader>
                    <div className="py-4">Sheet content goes here</div>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </Card>

            {/* Popover */}
            <Card>
              <CardHeader>
                <CardTitle>Popover</CardTitle>
                <CardDescription>Floating popover content</CardDescription>
              </CardHeader>
              <CardContent>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">Open Popover</Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="space-y-2">
                      <h4 className="font-medium">Popover Title</h4>
                      <p className="text-sm text-muted-foreground">
                        Popover content with information.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            {/* HoverCard */}
            <Card>
              <CardHeader>
                <CardTitle>HoverCard</CardTitle>
                <CardDescription>Card that appears on hover</CardDescription>
              </CardHeader>
              <CardContent>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button variant="link">@username</Button>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <div className="space-y-2">
                      <Avatar>
                        <AvatarFallback>UN</AvatarFallback>
                      </Avatar>
                      <h4 className="text-sm font-semibold">@username</h4>
                      <p className="text-sm text-muted-foreground">User bio and information displayed on hover</p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </CardContent>
            </Card>

            {/* Tooltip */}
            <Card>
              <CardHeader>
                <CardTitle>Tooltip</CardTitle>
                <CardDescription>Tooltip with TooltipProvider</CardDescription>
              </CardHeader>
              <CardContent>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Hover for Tooltip</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This is tooltip content</p>
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>

            {/* Toaster (Radix Toast) */}
            <Card>
              <CardHeader>
                <CardTitle>Toaster (Radix Toast)</CardTitle>
                <CardDescription>Toast notification system</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  The Toaster component is rendered at the app root level and displays toast notifications.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <code className="text-sm">{"<Toaster />"}</code>
                </div>
                <Toaster />
              </CardContent>
            </Card>

            {/* Sonner Toaster */}
            <Card>
              <CardHeader>
                <CardTitle>Sonner Toaster</CardTitle>
                <CardDescription>Alternative toast system using Sonner</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  The Sonner Toaster provides another option for toast notifications with a different style.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <code className="text-sm">{"<Toaster /> // from sonner"}</code>
                </div>
                <SonnerToaster />
              </CardContent>
            </Card>

            {/* LoadingSpinner */}
            <Card>
              <CardHeader>
                <CardTitle>LoadingSpinner</CardTitle>
                <CardDescription>Loading indicator in various sizes</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-8">
                <div className="text-center">
                  <LoadingSpinner size="sm" />
                  <p className="text-xs mt-2">Small</p>
                </div>
                <div className="text-center">
                  <LoadingSpinner size="md" />
                  <p className="text-xs mt-2">Medium</p>
                </div>
                <div className="text-center">
                  <LoadingSpinner size="lg" />
                  <p className="text-xs mt-2">Large</p>
                </div>
                <div className="text-center">
                  <LoadingSpinner size="md" text="Loading..." />
                </div>
              </CardContent>
            </Card>

            {/* PageLoading */}
            <Card>
              <CardHeader>
                <CardTitle>PageLoading</CardTitle>
                <CardDescription>Full-page loading state</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowPageLoading(true)}>
                  Show PageLoading
                </Button>
                {showPageLoading && (
                  <div 
                    className="fixed inset-0 z-50 bg-background" 
                    onClick={() => setShowPageLoading(false)}
                    onKeyDown={handlePageLoadingKeyDown}
                    tabIndex={0}
                    role="button"
                    aria-label="Close loading overlay"
                  >
                    <PageLoading />
                    <p className="text-center text-sm text-muted-foreground mt-4">Click anywhere or press Escape to close</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ====================================== */}
          {/* MISCELLANEOUS COMPONENTS */}
          {/* ====================================== */}
          <section id="miscellaneous" className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">Miscellaneous Components</h2>

            {/* Avatar */}
            <Card>
              <CardHeader>
                <CardTitle>Avatar</CardTitle>
                <CardDescription>User avatar with fallback</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>AB</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                </Avatar>
              </CardContent>
            </Card>

            {/* Badge */}
            <Card>
              <CardHeader>
                <CardTitle>Badge</CardTitle>
                <CardDescription>Badge variants for status and labels</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Card>
              <CardHeader>
                <CardTitle>Tabs</CardTitle>
                <CardDescription>TabsList, TabsTrigger, TabsContent</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="account">
                  <TabsList>
                    <TabsTrigger value="account">Account</TabsTrigger>
                    <TabsTrigger value="password">Password</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="account" className="p-4 border rounded-b-lg">
                    <h4 className="font-medium">Account Settings</h4>
                    <p className="text-sm text-muted-foreground">Manage your account preferences here.</p>
                  </TabsContent>
                  <TabsContent value="password" className="p-4 border rounded-b-lg">
                    <h4 className="font-medium">Password Settings</h4>
                    <p className="text-sm text-muted-foreground">Update your password and security settings.</p>
                  </TabsContent>
                  <TabsContent value="settings" className="p-4 border rounded-b-lg">
                    <h4 className="font-medium">General Settings</h4>
                    <p className="text-sm text-muted-foreground">Configure general application settings.</p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Separator */}
            <Card>
              <CardHeader>
                <CardTitle>Separator</CardTitle>
                <CardDescription>Visual divider between content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>Content Above</div>
                <Separator />
                <div>Content Below</div>
                <div className="flex items-center h-8">
                  <span>Left</span>
                  <Separator orientation="vertical" className="mx-4" />
                  <span>Right</span>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ComponentShowcasePage;
