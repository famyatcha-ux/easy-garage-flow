import { CalendarCheck, Wrench, CreditCard, Receipt, LayoutDashboard, Shield, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useRole, type Role } from "@/contexts/RoleContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const allItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, adminOnly: true },
  { title: "Bookings", url: "/bookings", icon: CalendarCheck, adminOnly: false },
  { title: "Jobs", url: "/jobs", icon: Wrench, adminOnly: false },
  { title: "Payments", url: "/payments", icon: CreditCard, adminOnly: false },
  { title: "Expenses", url: "/expenses", icon: Receipt, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role, setRole, isAdmin } = useRole();

  const items = allItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {!collapsed && (
            <h1 className="text-lg font-bold text-sidebar-primary-foreground">
              🔧 Workshop
            </h1>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Role switcher at bottom */}
        <div className="mt-auto p-4">
          {!collapsed ? (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">View as</label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assistant">
                    <span className="flex items-center gap-1.5"><User className="h-3 w-3" /> Assistant</span>
                  </SelectItem>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> Admin</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <button
              onClick={() => setRole(isAdmin ? "assistant" : "admin")}
              className="flex items-center justify-center w-full"
              title={`Switch to ${isAdmin ? "Assistant" : "Admin"}`}
            >
              {isAdmin ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </button>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
