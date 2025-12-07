import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { LogOut, Settings, Filter, Tag } from "lucide-react";

interface MobileSidebarProps {
  onSignOut: () => void;
  onOpenFilters: () => void;
  userEmail?: string;
}

export const MobileSidebar = ({ onSignOut, onOpenFilters, userEmail }: MobileSidebarProps) => {
  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="px-4 py-3">
          <h2 className="text-xl font-bold text-foreground">Laterr</h2>
          <p className="text-sm text-muted-foreground">Knowledge space</p>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onOpenFilters} className="min-h-[44px]">
              <Filter className="w-5 h-5" aria-hidden="true" />
              <span className="text-base">Filters & Sort</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton className="min-h-[44px]" disabled>
              <Tag className="w-5 h-5" aria-hidden="true" />
              <span className="text-base">Tags</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton className="min-h-[44px]" disabled>
              <Settings className="w-5 h-5" aria-hidden="true" />
              <span className="text-base">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter className="border-t">
        <SidebarMenu>
          {userEmail && (
            <>
              <SidebarMenuItem>
                <div className="px-4 py-2 text-sm text-muted-foreground truncate">
                  {userEmail}
                </div>
              </SidebarMenuItem>
              <SidebarSeparator />
            </>
          )}
          
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSignOut} className="min-h-[44px] text-destructive hover:bg-destructive/10">
              <LogOut className="w-5 h-5" aria-hidden="true" />
              <span className="text-base">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
