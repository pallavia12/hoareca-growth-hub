import {
  LayoutDashboard,
  Database,
  Phone,
  ShoppingBag,
  FileSignature,
  BarChart3,
  Settings,
  User,
  Leaf,
  BookOpen,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Step 1: Prospects", url: "/prospects", icon: Database, badge: "32" },
  { title: "Step 2: Lead Gen", url: "/leads", icon: Phone, badge: "12" },
  { title: "Step 3: Sample Orders", url: "/sample-orders", icon: ShoppingBag, badge: "6" },
  { title: "Step 4: Agreements", url: "/agreements", icon: FileSignature, badge: "3" },
  { title: "Lead Master", url: "/lead-master", icon: BookOpen },
];

const adminItems = [
  { title: "Admin Dashboard", url: "/admin", icon: BarChart3 },
  { title: "Funnel View", url: "/admin/funnel", icon: BarChart3 },
  { title: "Analytics Dashboard", url: "/config", icon: Settings },
];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { userRole } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
            <Leaf className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-sidebar-foreground truncate">Ninjacart</h2>
              <p className="text-xs text-sidebar-foreground/60 truncate">HoReCa CRM</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                      {item.badge && !collapsed && (
                        <Badge variant="secondary" className="ml-auto text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                          {item.badge}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(userRole === "admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="My Profile">
                  <NavLink
                    to="/profile"
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  >
                    <User className="w-4 h-4 shrink-0" />
                    <span className="truncate">My Profile</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
