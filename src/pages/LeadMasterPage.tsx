import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useProspects } from "@/hooks/useProspects";
import { useLeads } from "@/hooks/useLeads";
import { useSampleOrders } from "@/hooks/useSampleOrders";
import { useAgreements } from "@/hooks/useAgreements";
import { Search, ChevronDown, ChevronRight, Eye, Clock } from "lucide-react";
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

  useEffect(() => {
    supabase.from("activity_logs").select("*").order("timestamp", { ascending: false }).limit(500)
      .then(({ data }) => setActivityLogs(data || []));
  }, []);

  const masterData = useMemo(() => {
    return prospects.map(prospect => {
      const lead = leads.find(l => l.prospect_id === prospect.id);
      const order = lead ? orders.find(o => o.lead_id === lead.id) : null;
      const agreement = order ? agreements.find(a => a.sample_order_id === order.id) : null;

      // Determine current stage
      let currentStage: CurrentStage = "Prospect";
      if (agreement && ["signed", "agreement_sent"].includes(agreement.status)) {
        currentStage = agreement.status === "signed" ? "Customer" : "Agreement";
      } else if (order) {
        currentStage = "Sample Order";
      } else if (lead) {
        currentStage = "Lead";
      }

      // Stage 1: Prospect → Lead
      const prospectDate = new Date(prospect.created_at);
      const leadDate = lead ? new Date(lead.created_at) : null;
      const stage1Days = leadDate ? differenceInDays(leadDate, prospectDate) : null;

      // Stage 2: Lead → Sample Order
      const orderDate = order ? new Date(order.created_at) : null;
      const stage2Days = leadDate && orderDate ? differenceInDays(orderDate, leadDate) : null;

      // Stage 3: Sample Order → Agreement
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

  const filtered = useMemo(() => {
    if (!search) return masterData;
    const s = search.toLowerCase();
    return masterData.filter(d => d.prospect.restaurant_name.toLowerCase().includes(s));
  }, [masterData, search]);

  const getStageColor = (stage: CurrentStage) => {
    switch (stage) {
      case "Prospect": return "bg-muted text-muted-foreground";
      case "Lead": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "Sample Order": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "Agreement": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "Customer": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    }
  };

  const StageBlock = ({ title, data }: { title: string; data: { agent: string; calls?: number; visits: number; days: number } }) => (
    <div className="bg-muted/40 rounded-md p-2 text-[11px] space-y-0.5 min-w-[120px]">
      <p className="font-semibold text-foreground text-xs">{title}</p>
      <p><span className="text-muted-foreground">Agent:</span> {data.agent}</p>
      {data.calls !== undefined && <p><span className="text-muted-foreground">Calls:</span> {data.calls}</p>}
      <p><span className="text-muted-foreground">Visits:</span> {data.visits}</p>
      <p><span className="text-muted-foreground">Days:</span> {data.days}</p>
    </div>
  );

  const getLastVisits = (prospectId: string, leadId?: string) => {
    const entityIds = [prospectId];
    if (leadId) entityIds.push(leadId);
    return activityLogs
      .filter(l => entityIds.includes(l.entity_id))
      .slice(0, 3);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Lead Master</h1>
        <p className="text-sm text-muted-foreground">
          Prospect-level funnel tracking · {filtered.length} records
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search prospect..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8"></TableHead>
                  <TableHead className="text-xs">Prospect Name</TableHead>
                  <TableHead className="text-xs">Current Stage</TableHead>
                  <TableHead className="text-xs">Prospect → Lead</TableHead>
                  <TableHead className="text-xs">Lead → Sample Order</TableHead>
                  <TableHead className="text-xs">Sample Order → Agreement</TableHead>
                  <TableHead className="text-xs">Total Calls</TableHead>
                  <TableHead className="text-xs">Total Visits</TableHead>
                  <TableHead className="text-xs">Total Days</TableHead>
                  <TableHead className="text-xs">Customer ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground text-sm py-8">No data found.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(row => {
                    const isExpanded = expandedId === row.prospect.id;
                    return (
                      <Collapsible key={row.prospect.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : row.prospect.id)} asChild>
                        <>
                          <CollapsibleTrigger asChild>
                            <TableRow className="cursor-pointer hover:bg-muted/50 text-sm">
                              <TableCell className="p-2">
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                              </TableCell>
                              <TableCell className="font-medium max-w-[180px] truncate">{row.prospect.restaurant_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${getStageColor(row.currentStage)}`}>
                                  {row.currentStage}
                                </Badge>
                              </TableCell>
                              <TableCell><StageBlock title="Stage 1" data={row.stage1} /></TableCell>
                              <TableCell><StageBlock title="Stage 2" data={row.stage2} /></TableCell>
                              <TableCell><StageBlock title="Stage 3" data={row.stage3} /></TableCell>
                              <TableCell className="text-xs text-center font-medium">{row.totalCalls}</TableCell>
                              <TableCell className="text-xs text-center font-medium">{row.totalVisits}</TableCell>
                              <TableCell className="text-xs text-center font-medium">{row.totalDays}</TableCell>
                              <TableCell className="text-xs font-mono">{row.customerId}</TableCell>
                            </TableRow>
                          </CollapsibleTrigger>
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={10} className="bg-muted/20 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Timeline View */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5" /> Timeline
                                    </h4>
                                    <div className="space-y-2">
                                      <TimelineItem
                                        label="Prospect Created"
                                        date={row.prospect.created_at}
                                        active
                                      />
                                      <TimelineItem
                                        label="Lead Converted"
                                        date={row.lead?.created_at}
                                        active={!!row.lead}
                                      />
                                      <TimelineItem
                                        label="Sample Order"
                                        date={row.order?.created_at}
                                        active={!!row.order}
                                      />
                                      <TimelineItem
                                        label="Agreement Signed"
                                        date={row.agreement?.created_at}
                                        active={!!row.agreement && ["agreement_sent", "signed"].includes(row.agreement.status)}
                                      />
                                      <TimelineItem
                                        label="Customer ID Created"
                                        date={row.agreement?.status === "signed" ? row.agreement.updated_at : undefined}
                                        active={row.agreement?.status === "signed"}
                                      />
                                    </div>
                                  </div>

                                  {/* Last 3 Visits */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                                      <Eye className="w-3.5 h-3.5" /> Last 3 Visits
                                    </h4>
                                    {(() => {
                                      const visits = getLastVisits(row.prospect.id, row.lead?.id);
                                      if (visits.length === 0) {
                                        return <p className="text-xs text-muted-foreground">No activity logs found.</p>;
                                      }
                                      return (
                                        <div className="space-y-2">
                                          {visits.map(v => (
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
                                    })()}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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
