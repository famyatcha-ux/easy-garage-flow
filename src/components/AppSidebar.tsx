import { useState } from "react";
import { CalendarCheck, Wrench, CreditCard, Receipt, LayoutDashboard, Shield, User, Truck, Lock } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useRole } from "@/contexts/RoleContext";
import fsLogo from "@/assets/fs-motors-logo.png";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const allItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, adminOnly: true },
  { title: "Bookings", url: "/bookings", icon: CalendarCheck, adminOnly: false },
  { title: "Jobs", url: "/jobs", icon: Wrench, adminOnly: false },
  { title: "Payments", url: "/payments", icon: CreditCard, adminOnly: false },
  { title: "Expenses", url: "/expenses", icon: Receipt, adminOnly: true },
  { title: "Suppliers", url: "/suppliers", icon: Truck, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin, requestAdmin, exitAdmin } = useRole();
  const { toast } = useToast();

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");

  const items = allItems.filter((item) => !item.adminOnly || isAdmin);

  const handleSwitchToAdmin = () => {
    setPw("");
    setPwOpen(true);
  };

  const handleSubmitPassword = (e?: React.FormEvent) => {
    e?.preventDefault();
    const ok = requestAdmin(pw);
    if (ok) {
      setPwOpen(false);
      setPw("");
      toast({ title: "Admin access granted" });
    } else {
      toast({
        title: "Incorrect password",
        description: "Access denied.",
        variant: "destructive",
      });
    }
  };

  const handleExitAdmin = () => {
    exitAdmin();
    toast({ title: "Switched to Assistant view" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex flex-col items-center gap-2">
          <img
            src={fsLogo}
            alt="FS Motors Mechanical Services"
            className={collapsed ? "h-8 w-8 object-contain" : "h-16 w-16 object-contain"}
          />
          {!collapsed && (
            <p className="text-xs font-medium text-center text-sidebar-foreground">
              FS Motors Mechanical Services
            </p>
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
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium">View as</label>
              {isAdmin ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Shield className="h-3 w-3" /> Admin
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={handleExitAdmin}
                  >
                    <User className="h-3 w-3" /> Switch to Assistant
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <User className="h-3 w-3" /> Assistant
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={handleSwitchToAdmin}
                  >
                    <Lock className="h-3 w-3" /> Admin Login
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={isAdmin ? handleExitAdmin : handleSwitchToAdmin}
              className="flex items-center justify-center w-full"
              title={isAdmin ? "Switch to Assistant" : "Admin Login"}
            >
              {isAdmin ? <Shield className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </button>
          )}
        </div>
      </SidebarContent>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Admin Access
            </DialogTitle>
            <DialogDescription>
              Enter the admin password to unlock full access.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitPassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-pw">Password</Label>
              <Input
                id="admin-pw"
                type="password"
                autoFocus
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPwOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Unlock</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
