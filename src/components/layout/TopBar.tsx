import { Bell, Phone, MapPin, UserPlus, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const roleLabels: Record<string, string> = {
  calling_agent: "Calling Agent",
  lead_taker: "Lead Taker",
  kam: "KAM",
  admin: "Admin",
};

export function TopBar() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b bg-card flex items-center gap-2 px-4 shrink-0">
      <SidebarTrigger className="-ml-1" />

      <div className="hidden md:flex items-center gap-2 ml-2">
        <span className="font-semibold text-sm text-primary">Premium HoReCa CRM</span>
      </div>

      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search prospects, leads, orders..." className="pl-9 h-9 text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs gap-1" onClick={() => navigate("/leads")}>
          <Phone className="w-3.5 h-3.5" /> Log Call
        </Button>
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs gap-1" onClick={() => navigate("/sample-orders")}>
          <MapPin className="w-3.5 h-3.5" /> Start Visit
        </Button>
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs gap-1" onClick={() => navigate("/leads")}>
          <UserPlus className="w-3.5 h-3.5" /> Add Lead
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-bold">
            5
          </span>
        </Button>

        <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l">
          <div className="text-right">
            <p className="text-xs font-medium truncate max-w-[120px]">{user?.email}</p>
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {userRole ? roleLabels[userRole] : "User"}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign Out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
