import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useProspects } from "@/hooks/useProspects";
import { useLeads } from "@/hooks/useLeads";
import { useSampleOrders } from "@/hooks/useSampleOrders";
import { useAgreements } from "@/hooks/useAgreements";
import {
  TrendingUp, Filter, Download, ChevronDown, ArrowLeft,
} from "lucide-react";
import { format, subDays, differenceInDays, isWithinInterval } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";

export default function FunnelViewPage() {
  const navigate = useNavigate();
  const { prospects } = useProspects();
  const { leads } = useLeads();
  const { orders } = useSampleOrders();
  const { agreements } = useAgreements();
  const [dropReasons, setDropReasons] = useState<Array<{ reason_text: string; step_number: number; count: number }>>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [pincodeFilter, setPincodeFilter] = useState("all");

  useEffect(() => {
    // Fetch drop reasons and count occurrences from activity logs
    Promise.all([
      supabase.from("drop_reasons").select("reason_text, step_number").eq("is_active", true),
      supabase.from("activity_logs").select("notes, action").ilike("action", "%drop%").limit(500),
    ]).then(([{ data: reasons }, { data: logs }]) => {
      const reasonList = (reasons || []).map(r => {
        // Count how many activity logs mention this reason
        const count = (logs || []).filter(l =>
          l.notes?.toLowerCase().includes(r.reason_text.toLowerCase())
        ).length;
        // If no matches found, assign a simulated count based on step
        return { ...r, count: count || 0 };
      });
      setDropReasons(reasonList);
    });
  }, []);

  const pincodes = useMemo(() => {
    const set = new Set<string>();
    prospects.forEach(p => set.add(p.pincode));
    return [...set].sort();
  }, [prospects]);

  const stats = useMemo(() => {
    const from = dateRange?.from || subDays(new Date(), 30);
    const to = dateRange?.to || new Date();

    const inRange = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        return isWithinInterval(d, { start: from, end: to });
      } catch { return false; }
    };

    let filteredProspects = prospects.filter(p => inRange(p.created_at));
    if (pincodeFilter && pincodeFilter !== "all") {
      filteredProspects = filteredProspects.filter(p => p.pincode === pincodeFilter);
    }

    const prospectIds = new Set(filteredProspects.map(p => p.id));
    const filteredLeads = leads.filter(l => l.prospect_id && prospectIds.has(l.prospect_id) && inRange(l.created_at));
    const leadIds = new Set(filteredLeads.map(l => l.id));
    const filteredOrders = orders.filter(o => leadIds.has(o.lead_id) && inRange(o.created_at));
    const orderIds = new Set(filteredOrders.map(o => o.id));
    const filteredAgreements = agreements.filter(a => orderIds.has(a.sample_order_id) && inRange(a.created_at));
    const signedAgreements = filteredAgreements.filter(a => a.status === "signed");

    const totalP = filteredProspects.length;
    const totalL = filteredLeads.length;
    const totalO = filteredOrders.length;
    const totalA = signedAgreements.length;

    // Cap at 100% and ensure funnel logic
    const cap = (num: number, den: number) => {
      if (den === 0) return "0.0";
      const pct = Math.min((num / den) * 100, 100);
      return pct.toFixed(1);
    };

    const prospectToLead = cap(Math.min(totalL, totalP), totalP);
    const leadToSample = cap(Math.min(totalO, totalL), totalL);
    const sampleToAgreement = cap(Math.min(totalA, totalO), totalO);
    const endToEnd = cap(Math.min(totalA, totalP), totalP);

    // Avg days per stage
    let stage1Days: number[] = [];
    let stage2Days: number[] = [];
    let stage3Days: number[] = [];

    filteredLeads.forEach(lead => {
      const prospect = prospects.find(p => p.id === lead.prospect_id);
      if (prospect) {
        const d = differenceInDays(new Date(lead.created_at), new Date(prospect.created_at));
        if (d >= 0) stage1Days.push(d);
      }
    });

    filteredOrders.forEach(order => {
      const lead = leads.find(l => l.id === order.lead_id);
      if (lead) {
        const d = differenceInDays(new Date(order.created_at), new Date(lead.created_at));
        if (d >= 0) stage2Days.push(d);
      }
    });

    filteredAgreements.forEach(agr => {
      const order = orders.find(o => o.id === agr.sample_order_id);
      if (order) {
        const d = differenceInDays(new Date(agr.created_at), new Date(order.created_at));
        if (d >= 0) stage3Days.push(d);
      }
    });

    const avg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "—";

    // Drop-off per stage (removed prospect, added agreement)
    const droppedLeads = filteredLeads.filter(l => l.status === "dropped").length;
    const droppedOrders = filteredOrders.filter(o => o.status === "cancelled").length;
    const droppedAgreements = filteredAgreements.filter(a => a.status === "dropped" || a.status === "rejected").length;

    return {
      prospectToLead,
      leadToSample,
      sampleToAgreement,
      endToEnd,
      avgStage1: avg(stage1Days),
      avgStage2: avg(stage2Days),
      avgStage3: avg(stage3Days),
      totalProspects: totalP,
      totalLeads: totalL,
      totalOrders: totalO,
      totalAgreements: totalA,
      droppedLeads,
      droppedOrders,
      droppedAgreements,
    };
  }, [prospects, leads, orders, agreements, dateRange, pincodeFilter]);

  const downloadCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Prospects", String(stats.totalProspects)],
      ["Total Leads", String(stats.totalLeads)],
      ["Total Sample Orders", String(stats.totalOrders)],
      ["Total Agreements Signed", String(stats.totalAgreements)],
      [""],
      ["Prospect → Lead Conversion %", `${stats.prospectToLead}%`],
      ["Lead → Sample Order Conversion %", `${stats.leadToSample}%`],
      ["Sample Order → Agreement Conversion %", `${stats.sampleToAgreement}%`],
      ["End-to-End Conversion %", `${stats.endToEnd}%`],
      [""],
      ["Avg Days: Prospect → Lead", stats.avgStage1],
      ["Avg Days: Lead → Sample Order", stats.avgStage2],
      ["Avg Days: Sample Order → Agreement", stats.avgStage3],
      [""],
      ["Dropped at Lead Stage", String(stats.droppedLeads)],
      ["Dropped at Sample Order Stage", String(stats.droppedOrders)],
      ["Dropped at Agreement Stage", String(stats.droppedAgreements)],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `funnel-view-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const funnelMetrics = [
    { metric: "Prospect → Lead Conversion %", value: `${stats.prospectToLead}%` },
    { metric: "Lead → Sample Order Conversion %", value: `${stats.leadToSample}%` },
    { metric: "Sample Order → Agreement Conversion %", value: `${stats.sampleToAgreement}%` },
    { metric: "End-to-End Conversion %", value: `${stats.endToEnd}%` },
  ];

  const avgDaysMetrics = [
    { stage: "Prospect → Lead", days: stats.avgStage1 },
    { stage: "Lead → Sample Order", days: stats.avgStage2 },
    { stage: "Sample Order → Agreement", days: stats.avgStage3 },
  ];

  const dropOffStages = [
    { stage: "Lead stage", count: stats.droppedLeads, stepNumber: 2 },
    { stage: "Sample Order stage", count: stats.droppedOrders, stepNumber: 3 },
    { stage: "Agreement Signing stage", count: stats.droppedAgreements, stepNumber: 4 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Funnel View</h1>
          <p className="text-sm text-muted-foreground">Conversion analytics & drop-off analysis</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={pincodeFilter} onValueChange={setPincodeFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="All Pincodes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pincodes</SelectItem>
            {pincodes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
              <Filter className="w-3 h-3" />
              {dateRange?.from ? (
                dateRange.to ? (
                  `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`
                ) : format(dateRange.from, "MMM d, yyyy")
              ) : "Select dates"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={1}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 ml-auto" onClick={downloadCSV}>
          <Download className="w-3 h-3" /> Export CSV
        </Button>
      </div>

      {/* Funnel bar */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-end gap-1 h-24">
            {[
              { label: "Prospects", count: stats.totalProspects, color: "bg-primary" },
              { label: "Leads", count: stats.totalLeads, color: "bg-secondary" },
              { label: "Orders", count: stats.totalOrders, color: "bg-accent" },
              { label: "Signed", count: stats.totalAgreements, color: "bg-info" },
            ].map((item, i) => {
              const maxCount = Math.max(stats.totalProspects, 1);
              const heightPct = Math.max((item.count / maxCount) * 100, 8);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold">{item.count}</span>
                  <div className={`w-full rounded-t ${item.color}`} style={{ height: `${heightPct}%` }} />
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* Conversion metrics table - no definition column */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Metric</TableHead>
                <TableHead className="text-xs text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnelMetrics.map(m => (
                <TableRow key={m.metric}>
                  <TableCell className="text-xs font-medium">{m.metric}</TableCell>
                  <TableCell className="text-xs text-right font-bold">{m.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Average Days + Drop-offs */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">Average Days per Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {avgDaysMetrics.map(m => (
              <div key={m.stage} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                <span className="text-xs">{m.stage}</span>
                <span className="text-xs font-bold">{m.days === "—" ? "—" : `${m.days} days`}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">Drop-off Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dropOffStages.map(d => {
              const reasons = dropReasons.filter(r => r.step_number === d.stepNumber);
              return (
                <Collapsible key={d.stage}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2 hover:bg-muted/70 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs">{d.stage}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                        {d.count} dropped
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-5 mt-1 mb-2 space-y-1">
                      {reasons.length > 0 ? reasons.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] text-muted-foreground bg-background border rounded px-2 py-1">
                          <span>• {r.reason_text}</span>
                          <Badge variant="outline" className="text-[9px] ml-2 shrink-0">{r.count}</Badge>
                        </div>
                      )) : (
                        <p className="text-[11px] text-muted-foreground italic px-2">No common reasons configured</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
