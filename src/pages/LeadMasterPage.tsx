import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProspects } from "@/hooks/useProspects";
import { useLeads } from "@/hooks/useLeads";
import { useSampleOrders } from "@/hooks/useSampleOrders";
import { useAgreements } from "@/hooks/useAgreements";
import { Search, ChevronDown, ChevronRight, Eye, Clock, MapPin } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface ActivityLog {
  id: string;
  timestamp: string;
  entity_id: string;
  entity_type: string;
  action: string;
  user_email: string | null;
  user_role: string | null;
  notes: string | null;
  before_state: string | null;
  after_state: string | null;
}

type CurrentStage = "Prospect" | "Lead" | "Sample Order" | "Agreement" | "Customer";


export default function LeadMasterPage() {
  const { prospects } = useProspects();
  const { leads } = useLeads();
  const { orders } = useSampleOrders();
  const { agreements } = useAgreements();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [filterAgent, setFilterAgent] = useState("");
  const [filterStage, setFilterStage] = useState("");

  useEffect(() => {
    supabase.from("activity_logs").select("*").order("timestamp", { ascending: false }).limit(500)
      .then(({ data }) => setActivityLogs(data || []));
  }, []);

  const masterData = useMemo(() => {
    return prospects.map((prospect, idx) => {
      const lead = leads.find(l => l.prospect_id === prospect.id);
      const order = lead ? orders.find(o => o.lead_id === lead.id) : null;
      const agreement = order ? agreements.find(a => a.sample_order_id === order.id) : null;

      let currentStage: CurrentStage = "Prospect";
      if (agreement?.status === "signed") {
        currentStage = "Customer";
      } else if (agreement && ["agreement_sent", "pending_feedback"].includes(agreement.status)) {
        currentStage = "Agreement";
      } else if (order) {
        currentStage = "Sample Order";
      } else if (lead) {
        currentStage = "Lead";
      }

      const prospectDate = new Date(prospect.created_at);
      const leadDate = lead ? new Date(lead.created_at) : null;
      const stage1Days = leadDate ? differenceInDays(leadDate, prospectDate) : null;

      const orderDate = order ? new Date(order.created_at) : null;
      const stage2Days = leadDate && orderDate ? differenceInDays(orderDate, leadDate) : null;

      const agreementDate = agreement ? new Date(agreement.created_at) : null;
      const stage3Days = orderDate && agreementDate ? differenceInDays(agreementDate, orderDate) : null;

      const totalCalls = lead?.call_count || 0;
      const totalVisits = lead?.visit_count || 0;
      const totalDays = stage1Days !== null ? (stage1Days + (stage2Days || 0) + (stage3Days || 0)) : 0;


      return {
        prospect,
        lead,
        order,
        agreement,
        currentStage,
        stage1: { agent: prospect.mapped_to || "—", calls: totalCalls, visits: 0, days: stage1Days ?? 0 },
        stage2: { agent: lead?.created_by || "—", visits: lead?.visit_count || 0, days: stage2Days ?? 0 },
        stage3: { agent: agreement ? "KAM" : "—", visits: 0, days: stage3Days ?? 0 },
        totalCalls,
        totalVisits,
        totalDays,
        customerId: agreement?.status === "signed" ? agreement.id.slice(0, 8).toUpperCase() : "—",
      };
    });
  }, [prospects, leads, orders, agreements]);

  const agents = useMemo(() => {
    const set = new Set<string>();
    masterData.forEach(d => {
      if (d.stage1.agent !== "—") set.add(d.stage1.agent);
      if (d.stage2.agent !== "—") set.add(d.stage2.agent);
    });
    return [...set].sort();
  }, [masterData]);

  const filtered = useMemo(() => {
    let list = masterData;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(d => d.prospect.restaurant_name.toLowerCase().includes(s));
    }
    if (filterAgent && filterAgent !== "all") {
      list = list.filter(d => d.stage1.agent === filterAgent || d.stage2.agent === filterAgent || d.stage3.agent === filterAgent);
    }
    if (filterStage && filterStage !== "all") {
      list = list.filter(d => d.currentStage === filterStage);
    }
    return list;
  }, [masterData, search, filterAgent, filterStage]);

  const getStageColor = (stage: CurrentStage) => {
    switch (stage) {
      case "Prospect": return "bg-muted text-muted-foreground";
      case "Lead": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "Sample Order": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "Agreement": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "Customer": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    }
  };

  const getLastVisits = (prospectId: string, leadId?: string) => {
    const entityIds = [prospectId];
    if (leadId) entityIds.push(leadId);
    const realLogs = activityLogs.filter(l => entityIds.includes(l.entity_id)).slice(0, 3);
    return { type: "real" as const, data: realLogs };
  };

  // Get pincode / locality info
  const localityInfo = useMemo(() => {
    const localities = [...new Set(prospects.map(p => p.locality))].filter(Boolean).sort();
    const pincodes = [...new Set(prospects.map(p => p.pincode))].filter(Boolean).sort();
    return { localities, pincodes };
  }, [prospects]);

  return (
    <div className="space-y-4">
      {/* Header with locality/pincode info */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Lead Master</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {localityInfo.localities.slice(0, 4).join(", ")}
            {localityInfo.localities.length > 4 && ` +${localityInfo.localities.length - 4} more`}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            Pincodes: {localityInfo.pincodes.slice(0, 3).join(", ")}
            {localityInfo.pincodes.length > 3 && ` +${localityInfo.pincodes.length - 3}`}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} records</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search prospect..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterAgent} onValueChange={setFilterAgent}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {(["Prospect", "Lead", "Sample Order", "Agreement", "Customer"] as CurrentStage[]).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile-friendly card list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No data found.</CardContent></Card>
        ) : (
          filtered.map(row => {
            const isExpanded = expandedId === row.prospect.id;
            return (
              <Card key={row.prospect.id} className="overflow-hidden">
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedId(isExpanded ? null : row.prospect.id)}
                >
                  <CardContent className="p-3">
                    {/* Row header */}
                    <div className="flex items-center gap-2 mb-2">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <span className="font-semibold text-sm flex-1 truncate">{row.prospect.restaurant_name}</span>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${getStageColor(row.currentStage)}`}>
                        {row.currentStage}
                      </Badge>
                    </div>

                    {/* Stage pipeline - visual dots */}
                    <div className="flex items-center gap-1 mb-3 ml-6">
                      {(["Prospect", "Lead", "Sample Order", "Agreement", "Customer"] as CurrentStage[]).map((stage, si) => {
                        const stageIdx = ["Prospect", "Lead", "Sample Order", "Agreement", "Customer"].indexOf(row.currentStage);
                        const isActive = si <= stageIdx;
                        return (
                          <div key={stage} className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${isActive ? "bg-primary" : "bg-muted-foreground/20"}`} />
                            {si < 4 && <div className={`w-4 h-0.5 ${isActive && si < stageIdx ? "bg-primary" : "bg-muted-foreground/20"}`} />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Stage blocks - stacked for mobile */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-6">
                      <StageBlockMobile title="S1: P→L" agent={row.stage1.agent} calls={row.stage1.calls} visits={row.stage1.visits} days={row.stage1.days} />
                      <StageBlockMobile title="S2: L→SO" agent={row.stage2.agent} visits={row.stage2.visits} days={row.stage2.days} />
                      <StageBlockMobile title="S3: SO→A" agent={row.stage3.agent} visits={row.stage3.visits} days={row.stage3.days} />
                      <StageBlockMobile title="S4: Customer" agent={row.currentStage === "Customer" ? "Created" : "—"} days={row.currentStage === "Customer" ? 0 : 0} visits={0} isCustomerStage customerId={row.customerId} />
                    </div>

                    {/* Summary row */}
                    <div className="flex gap-4 mt-2 ml-6 text-[11px] text-muted-foreground">
                      <span>Total Calls: <strong className="text-foreground">{row.totalCalls}</strong></span>
                      <span>Total Visits: <strong className="text-foreground">{row.totalVisits}</strong></span>
                      <span>Total Days: <strong className="text-foreground">{row.totalDays}</strong></span>
                      {row.customerId !== "—" && <span>Customer ID: <strong className="text-foreground font-mono">{row.customerId}</strong></span>}
                    </div>
                  </CardContent>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 p-3 space-y-4">
                    {/* Timeline */}
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Timeline
                      </h4>
                      <div className="space-y-1.5">
                        <TimelineItem label="Prospect Created" date={row.prospect.created_at} active />
                        <TimelineItem label="Lead Converted" date={row.lead?.created_at} active={!!row.lead} />
                        <TimelineItem label="Sample Order" date={row.order?.created_at} active={!!row.order} />
                        <TimelineItem label="Agreement Signed" date={row.agreement?.created_at} active={!!row.agreement && ["agreement_sent", "signed"].includes(row.agreement.status)} />
                        <TimelineItem label="Customer ID Created" date={row.agreement?.status === "signed" ? row.agreement.updated_at : undefined} active={row.agreement?.status === "signed"} />
                      </div>
                    </div>

                    {/* Last 3 Visits */}
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Last 3 Visits
                      </h4>
                      {(() => {
                        const visits = getLastVisits(row.prospect.id, row.lead?.id);
                        if (visits.type === "real") {
                          if (visits.data.length === 0) return <p className="text-xs text-muted-foreground">No activity logs found.</p>;
                          return (
                            <div className="space-y-2">
                              {(visits.data as ActivityLog[]).map(v => (
                                <div key={v.id} className="bg-background border rounded-md p-2 text-[11px] space-y-0.5">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{format(new Date(v.timestamp), "dd MMM yyyy")}</span>
                                    <Badge variant="outline" className="text-[9px]">{v.entity_type}</Badge>
                                  </div>
                                  <p><span className="text-muted-foreground">Agent:</span> {v.user_email || "—"}</p>
                                  <p><span className="text-muted-foreground">Action:</span> {v.action}</p>
                                  {v.notes && <p><span className="text-muted-foreground">Remarks:</span> {v.notes}</p>}
                                </div>
                              ))}
                            </div>
                          );
                        }
                        if (visits.data.length === 0) return <p className="text-xs text-muted-foreground">No visits recorded.</p>;
                        return null;
                      })()}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function StageBlockMobile({ title, agent, calls, visits, days, isCustomerStage, customerId }: { title: string; agent: string; calls?: number; visits: number; days: number; isCustomerStage?: boolean; customerId?: string }) {
  if (isCustomerStage) {
    return (
      <div className="bg-muted/40 rounded-md p-1.5 text-[10px] space-y-0.5">
        <p className="font-semibold text-foreground text-[11px]">{title}</p>
        <p className="truncate"><span className="text-muted-foreground">Status:</span> {customerId && customerId !== "—" ? "✅ Created" : "Pending"}</p>
        {customerId && customerId !== "—" && <p className="font-mono"><span className="text-muted-foreground">ID:</span> {customerId}</p>}
      </div>
    );
  }
  return (
    <div className="bg-muted/40 rounded-md p-1.5 text-[10px] space-y-0.5">
      <p className="font-semibold text-foreground text-[11px]">{title}</p>
      <p className="truncate"><span className="text-muted-foreground">Ag:</span> {agent}</p>
      {calls !== undefined && <p><span className="text-muted-foreground">C:</span> {calls}</p>}
      <p><span className="text-muted-foreground">V:</span> {visits}</p>
      <p><span className="text-muted-foreground">D:</span> {days}</p>
    </div>
  );
}

function TimelineItem({ label, date, active }: { label: string; date?: string | null; active: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <div className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${active ? "bg-primary" : "bg-muted-foreground/30"}`} />
      <div>
        <p className={`text-xs ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</p>
        <p className="text-[11px] text-muted-foreground">
          {date ? format(new Date(date), "dd MMM yyyy, hh:mm a") : "—"}
        </p>
      </div>
    </div>
  );
}
