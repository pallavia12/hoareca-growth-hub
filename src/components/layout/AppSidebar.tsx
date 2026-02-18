import { useEffect, useState } from "react";
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
  TrendingUp,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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

const adminItems = [
  { title: "Admin Dashboard", url: "/admin", icon: BarChart3 },
  { title: "Analytics Dashboard", url: "/config", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, userRole } = useAuth();

  const [counts, setCounts] = useState({ prospects: 0, leads: 0, orders: 0, agreements: 0 });

  useEffect(() => {
    if (!user || !userRole) return;

    const fetchCounts = async () => {
      const isAdmin = userRole === "admin";
      let pincodes: string[] = [];

      if (!isAdmin) {
        const { data: profile } = await supabase.from("profiles").select("email").eq("user_id", user.id).maybeSingle();
        if (profile?.email) {
          const { data } = await supabase.from("pincode_persona_map").select("pincode").eq("user_email", profile.email);
          pincodes = data?.map(d => d.pincode) || [];
        }
      }

      // Prospects
      let pQ = supabase.from("prospects").select("id", { count: "exact", head: true });
      if (!isAdmin && pincodes.length > 0) pQ = pQ.in("pincode", pincodes);
      const { count: pCount } = await pQ;

      // Leads
      let lQ = supabase.from("leads").select("id", { count: "exact", head: true });
      if (!isAdmin && pincodes.length > 0) lQ = lQ.in("pincode", pincodes);
      const { count: lCount } = await lQ;

      // Sample Orders
      const { data: oData } = await supabase.from("sample_orders").select("id, leads!inner(pincode)");
      let oCount = oData?.length || 0;
      if (!isAdmin && pincodes.length > 0) {
        oCount = (oData || []).filter((o: any) => pincodes.includes(o.leads?.pincode)).length;
      }

      // Agreements
      const { data: aData } = await supabase.from("agreements").select("id, sample_orders!inner(leads!inner(pincode))");
      let aCount = aData?.length || 0;
      if (!isAdmin && pincodes.length > 0) {
        aCount = (aData || []).filter((a: any) => pincodes.includes(a.sample_orders?.leads?.pincode)).length;
      }

      setCounts({ prospects: pCount || 0, leads: lCount || 0, orders: oCount, agreements: aCount });
    };

    fetchCounts();
  }, [user, userRole]);

  const navItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Step 1: Prospects", url: "/prospects", icon: Database, badge: counts.prospects },
    { title: "Step 2: Lead Gen", url: "/leads", icon: Phone, badge: counts.leads },
    { title: "Step 3: Sample Orders", url: "/sample-orders", icon: ShoppingBag, badge: counts.orders },
    { title: "Step 4: Agreements", url: "/agreements", icon: FileSignature, badge: counts.agreements },
    { title: "Lead Master", url: "/lead-master", icon: BookOpen },
    { title: "Funnel View", url: "/admin/funnel", icon: TrendingUp },
  ];

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
                      {item.badge !== undefined && item.badge > 0 && !collapsed && (
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
