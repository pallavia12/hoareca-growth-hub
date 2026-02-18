import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Database,
  Phone,
  ShoppingBag,
  FileSignature,
  Users,
  TrendingUp,
  Calendar as CalendarIcon,
  PhoneCall,
  MapPin,
  IndianRupee,
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const typeColors: Record<string, string> = {
  Call: "bg-blue-100 text-blue-700 border-blue-200",
  Visit: "bg-green-100 text-green-700 border-green-200",
  "Sample Delivery": "bg-orange-100 text-orange-700 border-orange-200",
  Agreement: "bg-purple-100 text-purple-700 border-purple-200",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDay, setSelectedDay] = useState(today);

  const defaultFrom = startOfWeek(new Date(), { weekStartsOn: 1 });
  const defaultTo = endOfWeek(new Date(), { weekStartsOn: 1 });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: defaultFrom, to: defaultTo });

  const [userPincodes, setUserPincodes] = useState<string[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's assigned pincodes
  useEffect(() => {
    if (!user) return;
    const fetchPincodes = async () => {
      const { data: profile } = await supabase.from("profiles").select("email").eq("user_id", user.id).maybeSingle();
      if (!profile?.email) return;

      if (userRole === "admin") {
        // Admin sees everything
        setUserPincodes([]);
      } else {
        const { data } = await supabase.from("pincode_persona_map").select("pincode").eq("user_email", profile.email);
        setUserPincodes(data?.map((d) => d.pincode) || []);
      }
    };
    fetchPincodes();
  }, [user, userRole]);

  // Fetch all pipeline data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const isAdmin = userRole === "admin";
      const pincodes = userPincodes;

      // Prospects
      let pQuery = supabase.from("prospects").select("*");
      if (!isAdmin && pincodes.length > 0) pQuery = pQuery.in("pincode", pincodes);
      const { data: pData } = await pQuery;
      setProspects(pData || []);

      // Leads
      let lQuery = supabase.from("leads").select("*");
      if (!isAdmin && pincodes.length > 0) lQuery = lQuery.in("pincode", pincodes);
      const { data: lData } = await lQuery;
      setLeads(lData || []);

      // Sample Orders (join via lead_id)
      const { data: oData } = await supabase.from("sample_orders").select("*, leads!inner(pincode)");
      let filteredOrders = oData || [];
      if (!isAdmin && pincodes.length > 0) {
        filteredOrders = filteredOrders.filter((o: any) => pincodes.includes(o.leads?.pincode));
      }
      setOrders(filteredOrders);

      // Agreements (join via sample_order -> lead)
      const { data: aData } = await supabase.from("agreements").select("*, sample_orders!inner(lead_id, leads!inner(pincode))");
      let filteredAgreements = aData || [];
      if (!isAdmin && pincodes.length > 0) {
        filteredAgreements = filteredAgreements.filter((a: any) => pincodes.includes(a.sample_orders?.leads?.pincode));
      }
      setAgreements(filteredAgreements);

      // Appointments for the user
      const { data: profile } = await supabase.from("profiles").select("email").eq("user_id", user?.id || "").maybeSingle();
      if (profile?.email) {
        const { data: apptData } = await supabase.from("appointments").select("*").eq("assigned_to", profile.email).order("scheduled_date");
        setAppointments(apptData || []);
      }

      setLoading(false);
    };

    if (userRole === "admin" || userPincodes.length > 0) {
      fetchData();
    } else if (userRole && userPincodes.length === 0) {
      // Non-admin with no pincodes assigned — show empty
      setLoading(false);
    }
  }, [user, userRole, userPincodes]);

  const metrics = useMemo(() => {
    const signedCount = agreements.filter((a) => a.status === "signed").length;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayCalls = leads.filter((l) => l.last_activity_date && format(new Date(l.last_activity_date), "yyyy-MM-dd") === todayStr).length;
    const todayVisits = orders.filter((o) => o.visit_date === todayStr).length;
    const conversionRate = prospects.length > 0 ? ((signedCount / prospects.length) * 100).toFixed(1) : "0";
    const weeklyVolume = agreements.reduce((sum, a) => sum + (a.expected_weekly_volume_kg || 0), 0);

    return [
      { label: "Total Prospects", value: String(prospects.length), icon: Database, color: "text-primary" },
      { label: "Leads Generated", value: String(leads.length), icon: Users, color: "text-secondary" },
      { label: "Sample Orders", value: String(orders.length), icon: ShoppingBag, color: "text-accent" },
      { label: "Agreements Signed", value: String(signedCount), icon: FileSignature, color: "text-primary" },
      { label: "Today's Calls", value: String(todayCalls), icon: PhoneCall, color: "text-info" },
      { label: "Today's Visits", value: String(todayVisits), icon: MapPin, color: "text-secondary" },
      { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-primary" },
      { label: "Pipeline Value", value: weeklyVolume > 0 ? `₹${(weeklyVolume * 140 / 1000).toFixed(1)}L/wk` : "₹0", icon: IndianRupee, color: "text-accent" },
    ];
  }, [prospects, leads, orders, agreements]);

  const steps = useMemo(() => {
    const availableProspects = prospects.filter((p) => p.status === "available").length;
    const recallLeads = leads.filter((l) => l.status === "recall").length;
    const todayVisits = orders.filter((o) => o.visit_date === format(new Date(), "yyyy-MM-dd")).length;
    const activeAgreements = agreements.filter((a) => ["agreement_sent", "signed"].includes(a.status)).length;

    const p2l = prospects.length > 0 ? Math.round((leads.length / prospects.length) * 100) : 0;
    const l2o = leads.length > 0 ? Math.round((orders.length / leads.length) * 100) : 0;
    const o2a = orders.length > 0 ? Math.round((agreements.filter((a) => a.status === "signed").length / orders.length) * 100) : 0;

    return [
      { title: "Prospect Building", subtitle: `${prospects.length} total · ${availableProspects} available`, icon: Database, progress: p2l, url: "/prospects" },
      { title: "Lead Generation", subtitle: `${leads.length} leads · ${recallLeads} re-calls pending`, icon: Phone, progress: l2o, url: "/leads" },
      { title: "Visit to Sample Order", subtitle: `${orders.length} in pipeline · ${todayVisits} visits today`, icon: ShoppingBag, progress: l2o, url: "/sample-orders" },
      { title: "Sample to Agreement", subtitle: `${activeAgreements} active · ${agreements.filter((a) => a.status === "revisit_needed").length} follow-ups due`, icon: FileSignature, progress: o2a, url: "/agreements" },
    ];
  }, [prospects, leads, orders, agreements]);

  const rangeStart = dateRange?.from || defaultFrom;
  const rangeEnd = dateRange?.to || dateRange?.from || defaultTo;
  const rangeDays: Date[] = [];
  let cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    rangeDays.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }

  const dayAppointments = appointments.filter((a) => a.scheduled_date === selectedDay);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back! Here's your pipeline overview.
          {userRole && <Badge variant="outline" className="ml-2 text-xs">{userRole.replace("_", " ").toUpperCase()}</Badge>}
        </p>
      </div>

      {/* Calendar Strip */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" /> Schedule
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5">
                  <CalendarIcon className="w-3 h-3" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
                    ) : format(dateRange.from, "MMM d")
                  ) : "Select dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.from) setSelectedDay(format(range.from, "yyyy-MM-dd"));
                  }}
                  numberOfMonths={1}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {rangeDays.map((date, i) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDay;
              const dayAppts = appointments.filter((a) => a.scheduled_date === dateStr);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(dateStr)}
                  className={`flex flex-col items-center min-w-[64px] p-2 rounded-lg border transition-all ${
                    isSelected ? "bg-primary text-primary-foreground border-primary" :
                    isToday ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase">{format(date, "EEE")}</span>
                  <span className="text-lg font-bold">{format(date, "d")}</span>
                  {dayAppts.length > 0 && (
                    <Badge variant="secondary" className={`text-[10px] h-4 px-1 mt-1 ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : ""}`}>
                      {dayAppts.length}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
          {dayAppointments.length > 0 ? (
            <div className="mt-3 space-y-2">
              {dayAppointments.map((a, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/50">
                  <span className="font-mono text-xs text-muted-foreground w-16">{a.scheduled_time || "—"}</span>
                  <span className="font-medium flex-1">{a.restaurant_name}</span>
                  <Badge variant="outline" className={`text-xs ${typeColors[a.appointment_type] || ""}`}>{a.appointment_type}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground text-center py-4">No appointments scheduled</p>
          )}
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <Card key={m.label} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <m.icon className={`w-5 h-5 ${m.color} opacity-70`} />
              </div>
              <p className="text-2xl font-bold mt-2">{loading ? "…" : m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Step Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Pipeline Steps</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, idx) => (
            <Card
              key={s.title}
              className="hover:shadow-lg transition-all cursor-pointer group border-l-4"
              style={{ borderLeftColor: idx === 0 ? "hsl(var(--primary))" : idx === 1 ? "hsl(var(--secondary))" : idx === 2 ? "hsl(var(--accent))" : "hsl(var(--info))" }}
              onClick={() => navigate(s.url)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Step {idx + 1}</p>
                    <p className="font-semibold text-sm">{s.title}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{s.subtitle}</p>
                <Progress value={s.progress} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">{s.progress}% conversion</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
