import { useState } from "react";
import {
  Button,
  IconButton,
  LoadingButton,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
  Textarea,
  Label,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Slider,
  Calendar,
  Progress,
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Separator,
  ScrollArea,
  Skeleton,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui";
import { Bell, Home, Settings, User, ChevronDown, Mail, MessageSquare } from "lucide-react";

const ComponentShowcasePage = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [progress, setProgress] = useState(50);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">UI Components Showcase</h1>
          <p className="text-muted-foreground">Visual reference for all available UI components</p>
        </div>

        {/* Buttons */}
        <section id="buttons" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Buttons</h2>
          <Card>
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
              <CardDescription>Different button styles and states</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <IconButton icon={<Bell />} />
              <LoadingButton loading>Loading</LoadingButton>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
            </CardContent>
          </Card>
        </section>

        {/* Cards */}
        <section id="cards" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Card content area with some example text.</p>
              </CardContent>
              <CardFooter>
                <Button>Action</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Another Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Simple card without footer.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Third Card</CardTitle>
                <CardDescription>With all sections</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Complete card example.</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button>Save</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Badges */}
        <section id="badges" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Badges</h2>
          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-4">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </CardContent>
          </Card>
        </section>

        {/* Form Inputs */}
        <section id="form-inputs" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Form Inputs</h2>
          <Card>
            <CardHeader>
              <CardTitle>Input Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Type your message here" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" />
                <Label htmlFor="terms">Accept terms and conditions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="notifications" />
                <Label htmlFor="notifications">Enable notifications</Label>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Select & Radio */}
        <section id="select-radio" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Select & Radio Groups</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Select Option</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                    <SelectItem value="option3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Radio Group</Label>
                <RadioGroup defaultValue="option1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option1" id="r1" />
                    <Label htmlFor="r1">Option 1</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option2" id="r2" />
                    <Label htmlFor="r2">Option 2</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option3" id="r3" />
                    <Label htmlFor="r3">Option 3</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Slider & Calendar */}
        <section id="slider-calendar" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Slider & Calendar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Slider</CardTitle>
              </CardHeader>
              <CardContent>
                <Slider defaultValue={[50]} max={100} step={1} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar mode="single" selected={date} onSelect={setDate} />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Progress & Alerts */}
        <section id="progress-alerts" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Progress & Alerts</h2>
          <Card>
            <CardHeader>
              <CardTitle>Progress Bar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} />
              <div className="flex gap-2">
                <Button onClick={() => setProgress(Math.max(0, progress - 10))}>Decrease</Button>
                <Button onClick={() => setProgress(Math.min(100, progress + 10))}>Increase</Button>
              </div>
            </CardContent>
          </Card>
          <Alert>
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
              This is a default alert with important information.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Error!</AlertTitle>
            <AlertDescription>
              This is a destructive alert indicating an error.
            </AlertDescription>
          </Alert>
        </section>

        {/* Avatar */}
        <section id="avatar" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Avatars</h2>
          <Card>
            <CardContent className="pt-6 flex gap-4">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>AB</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback><User /></AvatarFallback>
              </Avatar>
            </CardContent>
          </Card>
        </section>

        {/* Accordion & Tabs */}
        <section id="accordion-tabs" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Accordion & Tabs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Accordion</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Is it accessible?</AccordionTrigger>
                    <AccordionContent>
                      Yes. It adheres to the WAI-ARIA design pattern.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Is it styled?</AccordionTrigger>
                    <AccordionContent>
                      Yes. It comes with default styles that you can customize.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Tabs</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="account">
                  <TabsList>
                    <TabsTrigger value="account">Account</TabsTrigger>
                    <TabsTrigger value="password">Password</TabsTrigger>
                  </TabsList>
                  <TabsContent value="account">Account settings content</TabsContent>
                  <TabsContent value="password">Password settings content</TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Dialogs */}
        <section id="dialogs" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Dialogs & Modals</h2>
          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dialog Title</DialogTitle>
                    <DialogDescription>
                      This is a dialog description with more information.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">Dialog content goes here</div>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone.
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
        </section>

        {/* Dropdowns & Menus */}
        <section id="dropdowns" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Dropdowns & Menus</h2>
          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Open Menu <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover me</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tooltip content</p>
                </TooltipContent>
              </Tooltip>

              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="link">@username</Button>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">@username</h4>
                    <p className="text-sm">User bio and information</p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </CardContent>
          </Card>
        </section>

        {/* Table */}
        <section id="table" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Table</h2>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">John Doe</TableCell>
                    <TableCell><Badge>Active</Badge></TableCell>
                    <TableCell>john@example.com</TableCell>
                    <TableCell className="text-right">$250.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Jane Smith</TableCell>
                    <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                    <TableCell>jane@example.com</TableCell>
                    <TableCell className="text-right">$150.00</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Breadcrumb & Navigation */}
        <section id="navigation" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Navigation</h2>
          <Card>
            <CardHeader>
              <CardTitle>Breadcrumb</CardTitle>
            </CardHeader>
            <CardContent>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/docs">Docs</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Current Page</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Menubar</CardTitle>
            </CardHeader>
            <CardContent>
              <Menubar>
                <MenubarMenu>
                  <MenubarTrigger>File</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>New Tab</MenubarItem>
                    <MenubarItem>New Window</MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>Share</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>Edit</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Undo</MenubarItem>
                    <MenubarItem>Redo</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </CardContent>
          </Card>
        </section>

        {/* Toggles */}
        <section id="toggles" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Toggles</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <Toggle>Toggle</Toggle>
                <Toggle pressed>Pressed</Toggle>
                <Toggle disabled>Disabled</Toggle>
              </div>
              <ToggleGroup type="single">
                <ToggleGroupItem value="left">Left</ToggleGroupItem>
                <ToggleGroupItem value="center">Center</ToggleGroupItem>
                <ToggleGroupItem value="right">Right</ToggleGroupItem>
              </ToggleGroup>
            </CardContent>
          </Card>
        </section>

        {/* Separator & ScrollArea */}
        <section id="layout" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Layout Components</h2>
          <Card>
            <CardHeader>
              <CardTitle>Separator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>Content Above</div>
              <Separator />
              <div>Content Below</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scroll Area</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="text-sm py-2">
                    Scrollable item {i + 1}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        {/* Skeleton & Loading */}
        <section id="skeleton" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Loading States</h2>
          <Card>
            <CardHeader>
              <CardTitle>Skeleton Loader</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </section>

        {/* Collapsible */}
        <section id="collapsible" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Collapsible</h2>
          <Card>
            <CardContent className="pt-6">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost">Toggle Collapsible</Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-4 p-4 border rounded">
                    This content can be collapsed and expanded
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </section>

        {/* Command Palette */}
        <section id="command" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Command Palette</h2>
          <Card>
            <CardContent className="pt-6">
              <Command className="rounded-lg border shadow-md">
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    <CommandItem>
                      <Home className="mr-2 h-4 w-4" />
                      <span>Home</span>
                    </CommandItem>
                    <CommandItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </CommandItem>
                    <CommandItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </CardContent>
          </Card>
        </section>

        {/* Context Menu */}
        <section id="context-menu" className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Context Menu</h2>
          <Card>
            <CardContent className="pt-6">
              <ContextMenu>
                <ContextMenuTrigger className="flex h-[150px] w-full items-center justify-center rounded-md border border-dashed">
                  Right click here
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem>Edit</ContextMenuItem>
                  <ContextMenuItem>Duplicate</ContextMenuItem>
                  <ContextMenuItem>Delete</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default ComponentShowcasePage;
