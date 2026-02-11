import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Database,
  Phone,
  ShoppingBag,
  FileSignature,
  Users,
  TrendingUp,
  Calendar,
  PhoneCall,
  MapPin,
  IndianRupee,
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { useState } from "react";

const metrics = [
  { label: "Total Prospects", value: "147", icon: Database, color: "text-primary" },
  { label: "Leads Generated", value: "68", icon: Users, color: "text-secondary" },
  { label: "Sample Orders", value: "24", icon: ShoppingBag, color: "text-accent" },
  { label: "Agreements Signed", value: "12", icon: FileSignature, color: "text-primary" },
  { label: "Today's Calls", value: "18", icon: PhoneCall, color: "text-info" },
  { label: "Today's Visits", value: "5", icon: MapPin, color: "text-secondary" },
  { label: "Conversion Rate", value: "17.6%", icon: TrendingUp, color: "text-primary" },
  { label: "Pipeline Value", value: "₹4.2L/wk", icon: IndianRupee, color: "text-accent" },
];

const steps = [
  { title: "Prospect Building", subtitle: "147 total · 32 available", icon: Database, progress: 22, url: "/prospects" },
  { title: "Lead Generation", subtitle: "68 leads · 8 re-calls pending", icon: Phone, progress: 46, url: "/leads" },
  { title: "Visit to Sample Order", subtitle: "24 in pipeline · 3 visits today", icon: ShoppingBag, progress: 35, url: "/sample-orders" },
  { title: "Sample to Agreement", subtitle: "12 active · 2 follow-ups due", icon: FileSignature, progress: 50, url: "/agreements" },
];

const dummyAppointments: Record<string, Array<{ time: string; name: string; type: string }>> = {};

// Generate appointments for current week
const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
for (let i = 0; i < 7; i++) {
  const day = format(addDays(weekStart, i), "yyyy-MM-dd");
  if (i === 0) dummyAppointments[day] = [
    { time: "10:00 AM", name: "The Avocado Café", type: "Call" },
    { time: "2:00 PM", name: "Green Bowl Kitchen", type: "Visit" },
  ];
  if (i === 1) dummyAppointments[day] = [
    { time: "11:00 AM", name: "Cloud9 Bakes", type: "Visit" },
    { time: "3:00 PM", name: "Café Azzure", type: "Sample Delivery" },
    { time: "4:30 PM", name: "The Pasta House", type: "Call" },
  ];
  if (i === 2) dummyAppointments[day] = [
    { time: "9:30 AM", name: "Mango Tree", type: "Agreement" },
    { time: "1:00 PM", name: "Urban Spice", type: "Visit" },
  ];
  if (i === 3) dummyAppointments[day] = [
    { time: "10:00 AM", name: "Fork & Spoon", type: "Call" },
  ];
  if (i === 4) dummyAppointments[day] = [
    { time: "11:30 AM", name: "Lime & Lemon", type: "Visit" },
    { time: "3:00 PM", name: "The Kitchen Story", type: "Sample Delivery" },
  ];
}

const typeColors: Record<string, string> = {
  Call: "bg-blue-100 text-blue-700 border-blue-200",
  Visit: "bg-green-100 text-green-700 border-green-200",
  "Sample Delivery": "bg-orange-100 text-orange-700 border-orange-200",
  Agreement: "bg-purple-100 text-purple-700 border-purple-200",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDay, setSelectedDay] = useState(today);
  const appointments = dummyAppointments[selectedDay] || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back! Here's your pipeline overview.</p>
      </div>

      {/* Calendar Strip */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" /> This Week's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: 7 }, (_, i) => {
              const date = addDays(weekStart, i);
              const dateStr = format(date, "yyyy-MM-dd");
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDay;
              const dayAppts = dummyAppointments[dateStr] || [];
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
          {appointments.length > 0 ? (
            <div className="mt-3 space-y-2">
              {appointments.map((a, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/50">
                  <span className="font-mono text-xs text-muted-foreground w-16">{a.time}</span>
                  <span className="font-medium flex-1">{a.name}</span>
                  <Badge variant="outline" className={`text-xs ${typeColors[a.type] || ""}`}>{a.type}</Badge>
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
              <p className="text-2xl font-bold mt-2">{m.value}</p>
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
