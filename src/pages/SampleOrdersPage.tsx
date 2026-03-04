import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { useSampleOrders } from "@/hooks/useSampleOrders";
import { useLeads } from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Search, CalendarIcon, Package, Clock, XCircle, RotateCcw, Plus, Trash2,
  UserCheck, RefreshCw, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import AvocadoBrochureCarousel from "@/components/AvocadoBrochureCarousel";
import PhotoCapture from "@/components/PhotoCapture";

const statusColors: Record<string, string> = {
  pending_visit: "bg-info/10 text-info border-info/20",
  visited: "bg-accent/10 text-accent border-accent/20",
  sample_ordered: "bg-success/10 text-success border-success/20",
  revisit_needed: "bg-warning/10 text-warning border-warning/20",
  dropped: "bg-destructive/10 text-destructive border-destructive/20",
};

interface SkuRow {
  quantity: string;
  ripeness_stage: string;
}

export default function SampleOrdersPage() {
  const { orders, loading, addOrder, updateOrder, refetch } = useSampleOrders();
  const { leads, updateLead } = useLeads();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch drop reasons, SKU options from DB
  const [dropReasons, setDropReasons] = useState<string[]>([]);
  const [skuOptions, setSkuOptions] = useState<{ id: string; sku_name: string }[]>([]);

  useEffect(() => {
    supabase.from("drop_reasons").select("reason_text").eq("step_number", 3).eq("is_active", true)
      .then(({ data }) => setDropReasons(data?.map(d => d.reason_text) || []));
    supabase.from("sku_mapping").select("id, sku_name").order("sku_name")
      .then(({ data }) => setSkuOptions(data || []));
  }, []);

  const ripenessStages = ["Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5"];

  const [tab, setTab] = useState<"scheduled" | "completed" | "revisit" | "dropped">("scheduled");
  const [search, setSearch] = useState("");
  const [filterLocality, setFilterLocality] = useState("");
  const [filterAgent, setFilterAgent] = useState("");

  // Reassign state (shared with step 1 logic)
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignLeadId, setReassignLeadId] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [reassignUserSearch, setReassignUserSearch] = useState("");
  const [allUsers, setAllUsers] = useState<{ email: string; full_name: string | null }[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("email, full_name").then(({ data }) => {
      if (data) setAllUsers(data.filter(u => u.email));
    });
  }, []);

  // Log Visit dialog
  const [logVisitOpen, setLogVisitOpen] = useState(false);
  const [logVisitLeadId, setLogVisitLeadId] = useState<string | null>(null);
  const [logVisitOrderId, setLogVisitOrderId] = useState<string | null>(null);

  // Drop dialog
  const [dropOpen, setDropOpen] = useState(false);
  const [dropLeadId, setDropLeadId] = useState<string | null>(null);
  const [dropOrderId, setDropOrderId] = useState<string | null>(null);
  const [dropReason, setDropReason] = useState("");
  const [dropRemarks, setDropRemarks] = useState("");

  // Revisit sub-dialog
  const [revisitSubOpen, setRevisitSubOpen] = useState(false);
  const [revisitDate, setRevisitDate] = useState<Date | undefined>();
  const [revisitTime, setRevisitTime] = useState("");
  const [revisitRemarks, setRevisitRemarks] = useState("");

  // Follow-up date filter for Completed tab
  const [followUpFrom, setFollowUpFrom] = useState<Date | undefined>();
  const [followUpTo, setFollowUpTo] = useState<Date | undefined>();

  // Form
  const [form, setForm] = useState({
    delivery_address: "", delivery_date: "", delivery_slot: "",
    demand_per_week_kg: "", remarks: "",
    visit_date: format(new Date(), "yyyy-MM-dd"),
    selected_sku: "", sku_spec_notes: "",
  });
  const [skuRows, setSkuRows] = useState<SkuRow[]>([{ quantity: "", ripeness_stage: "" }]);
  const [visitPhotoUrl, setVisitPhotoUrl] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();

  const resetForm = () => {
    setForm({ delivery_address: "", delivery_date: "", delivery_slot: "", demand_per_week_kg: "", remarks: "", visit_date: format(new Date(), "yyyy-MM-dd"), selected_sku: "", sku_spec_notes: "" });
    setSkuRows([{ quantity: "", ripeness_stage: "" }]);
    setDeliveryDate(undefined);
    setLogVisitLeadId(null);
    setLogVisitOrderId(null);
    setVisitPhotoUrl(null);
  };

  // Qualified leads for scheduled tab (no existing sample order)
  const leadsWithOrders = useMemo(() => new Set(orders.map(o => o.lead_id)), [orders]);
  const qualifiedLeads = useMemo(() =>
    leads.filter(l => (l.status === "qualified" || l.status === "in_progress") && !leadsWithOrders.has(l.id)),
    [leads, leadsWithOrders]
  );

  const ordersWithLeads = useMemo(() =>
    orders.map(o => ({ ...o, lead: leads.find(l => l.id === o.lead_id) })),
    [orders, leads]
  );

  const scheduledLeads = useMemo(() => {
    let list = qualifiedLeads;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(l => l.client_name.toLowerCase().includes(s) || l.pincode.includes(s));
    }
    if (filterLocality && filterLocality !== "all") list = list.filter(l => l.locality === filterLocality);
    return list;
  }, [qualifiedLeads, search, filterLocality]);

  const scheduledOrders = useMemo(() => {
    return ordersWithLeads.filter(o => {
      if (o.status !== "pending_visit") return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(o.lead?.client_name || "").toLowerCase().includes(s) && !(o.lead?.pincode || "").includes(s)) return false;
      }
      if (filterLocality && filterLocality !== "all" && o.lead?.locality !== filterLocality) return false;
      return true;
    });
  }, [ordersWithLeads, search, filterLocality]);

  const completedOrders = useMemo(() => {
    return ordersWithLeads.filter(o => {
      if (o.status !== "sample_ordered" && o.status !== "visited") return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(o.lead?.client_name || "").toLowerCase().includes(s)) return false;
      }
      if (filterLocality && filterLocality !== "all" && o.lead?.locality !== filterLocality) return false;
      if (followUpFrom || followUpTo) {
        const dd = o.delivery_date;
        if (!dd) return false;
        const dDate = new Date(dd);
        if (followUpFrom && dDate < followUpFrom) return false;
        if (followUpTo && dDate > followUpTo) return false;
      }
      return true;
    });
  }, [ordersWithLeads, search, filterLocality, followUpFrom, followUpTo]);

  const revisitOrders = useMemo(() => {
    return ordersWithLeads.filter(o => {
      if (o.status !== "revisit_needed") return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(o.lead?.client_name || "").toLowerCase().includes(s)) return false;
      }
      if (filterLocality && filterLocality !== "all" && o.lead?.locality !== filterLocality) return false;
      if (filterAgent && filterAgent !== "all" && o.lead?.created_by !== filterAgent) return false;
      return true;
    });
  }, [ordersWithLeads, search, filterLocality, filterAgent]);

  const droppedOrders = useMemo(() => {
    return ordersWithLeads.filter(o => {
      if (o.status !== "dropped") return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(o.lead?.client_name || "").toLowerCase().includes(s)) return false;
      }
      if (filterAgent && filterAgent !== "all" && o.lead?.created_by !== filterAgent) return false;
      return true;
    });
  }, [ordersWithLeads, search, filterAgent]);

  const agents = useMemo(() => {
    const set = new Set<string>();
    ordersWithLeads.forEach(o => { if (o.lead?.created_by) set.add(o.lead.created_by); });
    return [...set].sort();
  }, [ordersWithLeads]);

  const filteredReassignUsers = useMemo(() => {
    const s = reassignUserSearch.toLowerCase();
    return allUsers.filter(u => !s || (u.full_name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s));
  }, [allUsers, reassignUserSearch]);

  const openReassign = (leadId: string) => {
    setReassignLeadId(leadId);
    setReassignTo("");
    setReassignUserSearch("");
    setReassignOpen(true);
  };

  const handleConfirmReassign = async () => {
    if (!reassignLeadId || !reassignTo) return;
    await updateLead(reassignLeadId, { created_by: reassignTo });
    toast({ title: "Lead re-assigned" });
    setReassignOpen(false);
  };

  const counts = useMemo(() => ({
    scheduled: scheduledLeads.length + scheduledOrders.length,
    completed: completedOrders.length,
    revisit: revisitOrders.length,
    dropped: droppedOrders.length,
  }), [scheduledLeads, scheduledOrders, completedOrders, revisitOrders, droppedOrders]);

  const localities = useMemo(() => {
    const set = new Set([
      ...leads.map(l => l.locality).filter(Boolean) as string[],
      ...ordersWithLeads.map(o => o.lead?.locality).filter(Boolean) as string[],
    ]);
    return [...set].sort();
  }, [leads, ordersWithLeads]);

  const openLogVisit = (leadId: string, orderId?: string) => {
    resetForm();
    setLogVisitLeadId(leadId);
    setLogVisitOrderId(orderId || null);
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setForm(f => ({ ...f, delivery_address: lead.outlet_address || "" }));
    }
    setLogVisitOpen(true);
  };

  const handleBookSampleOrder = async () => {
    if (!logVisitLeadId || !form.remarks || !form.sku_spec_notes || !visitPhotoUrl) return;
    const skuName = skuOptions.find(s => s.id === form.selected_sku)?.sku_name || "";
    const skuRowsSummary = skuRows
      .filter(r => r.quantity || r.ripeness_stage)
      .map(r => `Qty: ${r.quantity || "—"}, Ripeness: ${r.ripeness_stage || "—"}`)
      .join(" | ");
    const specNotes = [
      skuName && `SKU: ${skuName}`,
      skuRowsSummary,
      deliveryDate && `Delivery: ${format(deliveryDate, "dd MMM yyyy")}`,
    ].filter(Boolean).join(" | ");
    const fullRemarks = `${form.remarks}\n[SKU Specs] ${specNotes}\n[SKU Notes] ${form.sku_spec_notes}`;

    const totalQty = skuRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

    if (logVisitOrderId) {
      await updateOrder(logVisitOrderId, {
        status: "sample_ordered",
        remarks: fullRemarks,
        delivery_address: form.delivery_address || null,
        delivery_date: deliveryDate ? format(deliveryDate, "yyyy-MM-dd") : null,
        delivery_slot: form.delivery_slot || null,
        sample_qty_units: totalQty || null,
        demand_per_week_kg: form.demand_per_week_kg ? Number(form.demand_per_week_kg) : null,
      });
    } else {
      await addOrder({
        lead_id: logVisitLeadId,
        status: "sample_ordered",
        remarks: fullRemarks,
        visit_date: form.visit_date || null,
        delivery_address: form.delivery_address || null,
        delivery_date: deliveryDate ? format(deliveryDate, "yyyy-MM-dd") : null,
        delivery_slot: form.delivery_slot || null,
        sample_qty_units: totalQty || null,
        demand_per_week_kg: form.demand_per_week_kg ? Number(form.demand_per_week_kg) : null,
      });
    }
    const lead = leads.find(l => l.id === logVisitLeadId);
    if (lead) {
      await updateLead(logVisitLeadId, { visit_count: (lead.visit_count || 0) + 1 });
    }
    toast({ title: "Sample order booked" });
    resetForm();
    setLogVisitOpen(false);
  };

  const handleRevisitRequired = async () => {
    if (!logVisitLeadId || !revisitDate) return;
    const remarks = `[Re-visit: ${format(revisitDate, "dd MMM yyyy")}${revisitTime ? " " + revisitTime : ""}] ${revisitRemarks || form.remarks}`;
    if (logVisitOrderId) {
      await updateOrder(logVisitOrderId, { status: "revisit_needed", remarks });
    } else {
      await addOrder({
        lead_id: logVisitLeadId,
        status: "revisit_needed",
        remarks,
        visit_date: form.visit_date || null,
        delivery_address: form.delivery_address || null,
      });
    }
    const lead = leads.find(l => l.id === logVisitLeadId);
    if (lead) {
      await updateLead(logVisitLeadId, { visit_count: (lead.visit_count || 0) + 1 });
    }
    toast({ title: "Re-visit scheduled" });
    resetForm();
    setLogVisitOpen(false);
    setRevisitSubOpen(false);
    setRevisitDate(undefined);
    setRevisitTime("");
    setRevisitRemarks("");
  };

  const handleNotInterested = async () => {
    if (!dropReason) return;
    const remarks = `[Dropped] ${dropReason}${dropRemarks ? `: ${dropRemarks}` : ""}`;
    if (dropOrderId) {
      await updateOrder(dropOrderId, { status: "dropped", remarks });
    } else if (dropLeadId) {
      await addOrder({
        lead_id: dropLeadId,
        status: "dropped",
        remarks,
        visit_date: format(new Date(), "yyyy-MM-dd"),
      });
    }
    const leadId = dropLeadId || (dropOrderId ? orders.find(o => o.id === dropOrderId)?.lead_id : null);
    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        await updateLead(leadId, { visit_count: (lead.visit_count || 0) + 1 });
      }
    }
    toast({ title: "Marked as not interested" });
    setDropOpen(false);
    setDropLeadId(null);
    setDropOrderId(null);
    setDropReason("");
    setDropRemarks("");
  };

  const extractDropInfo = (remarks: string | null) => {
    if (!remarks) return { reason: "—", info: "—" };
    const match = remarks.match(/\[Dropped\]\s*([^:]+?)(?::\s*(.*?))?(?:\.\s*Total|$)/s);
    if (match) return { reason: match[1].trim(), info: (match[2] || "").trim() || "—" };
    return { reason: "—", info: remarks };
  };

  const renderScheduledRow = (leadId: string, clientName: string, pmName: string | null, visitDate: string | null, assignedTo: string | null, orderId?: string) => {
    const lead = leads.find(l => l.id === leadId);
    const assignedToMe = lead ? (lead.created_by === user?.email) : (assignedTo === user?.email);
    return (
      <TableRow key={orderId || leadId} className="text-sm">
        <TableCell className="font-medium max-w-[180px] truncate">{clientName}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{pmName || "—"}</TableCell>
        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{visitDate ? format(new Date(visitDate), "dd MMM") : "—"}</TableCell>
        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{assignedTo || "—"}</TableCell>
        <TableCell>
          <div className="flex gap-1 flex-wrap">
            {assignedToMe ? (
              <>
                <Button size="sm" className="text-xs h-7 bg-success hover:bg-success/90 text-success-foreground" onClick={() => openLogVisit(leadId, orderId)}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Log Visit
                </Button>
                <Button size="sm" className="text-xs h-7 bg-warning hover:bg-warning/90 text-warning-foreground" onClick={() => openReassign(leadId)}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Re-assign
                </Button>
                <Button size="sm" className="text-xs h-7 bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => {
                  setDropLeadId(leadId);
                  setDropOrderId(orderId || null);
                  setDropReason("");
                  setDropRemarks("");
                  setDropOpen(true);
                }}>
                  <XCircle className="w-3 h-3 mr-1" /> Mark Dropout
                </Button>
              </>
            ) : (
              <Button size="sm" className="text-xs h-7 bg-warning hover:bg-warning/90 text-warning-foreground" onClick={() => openReassign(leadId)}>
                <RefreshCw className="w-3 h-3 mr-1" /> Re-assign
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const addSkuRow = () => setSkuRows(prev => [...prev, { quantity: "", ripeness_stage: "" }]);
  const removeSkuRow = (idx: number) => setSkuRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  const updateSkuRow = (idx: number, field: keyof SkuRow, value: string) =>
    setSkuRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Step 3: Visit to Sample Order</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total sample orders</p>
        </div>
      </div>

      <AvocadoBrochureCarousel />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="scheduled" className="text-xs">Scheduled ({counts.scheduled})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Completed ({counts.completed})</TabsTrigger>
          <TabsTrigger value="revisit" className="text-xs">Re-visits ({counts.revisit})</TabsTrigger>
          <TabsTrigger value="dropped" className="text-xs">Dropouts ({counts.dropped})</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search client name, pincode..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterLocality} onValueChange={setFilterLocality}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs"><SelectValue placeholder="All Localities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Localities</SelectItem>
              {localities.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs"><SelectValue placeholder="All Agents" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          {tab === "completed" && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("text-xs h-9", !followUpFrom && "text-muted-foreground")}>
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {followUpFrom ? format(followUpFrom, "dd MMM") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={followUpFrom} onSelect={setFollowUpFrom} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("text-xs h-9", !followUpTo && "text-muted-foreground")}>
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {followUpTo ? format(followUpTo, "dd MMM") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={followUpTo} onSelect={setFollowUpTo} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Client Name</TableHead>
                      <TableHead className="text-xs">PM Name</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Visit Date</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Assigned To</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">Loading...</TableCell></TableRow>
                    ) : (scheduledLeads.length === 0 && scheduledOrders.length === 0) ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">No scheduled visits. Qualify leads in Step 2 to see them here.</TableCell></TableRow>
                    ) : (
                      <>
                        {scheduledLeads.map(l =>
                          renderScheduledRow(l.id, l.client_name, l.purchase_manager_name, l.appointment_date, l.created_by)
                        )}
                        {scheduledOrders.map(o =>
                          renderScheduledRow(o.lead_id, o.lead?.client_name || "Unknown", o.lead?.purchase_manager_name || null, o.visit_date, o.lead?.created_by || null, o.id)
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Client Name</TableHead>
                      <TableHead className="text-xs">Visits</TableHead>
                      <TableHead className="text-xs">Assigned To</TableHead>
                      <TableHead className="text-xs">Delivery Date</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Qty</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">No completed orders yet.</TableCell></TableRow>
                    ) : (
                      completedOrders.map(o => (
                        <TableRow key={o.id} className="text-sm">
                          <TableCell className="font-medium">{o.lead?.client_name || "Unknown"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{o.lead?.visit_count || 0}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{o.lead?.created_by || "—"}</TableCell>
                          <TableCell>
                            {o.delivery_date ? (
                              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                                <CalendarIcon className="w-3 h-3 mr-1" /> {format(new Date(o.delivery_date), "dd MMM yyyy")}
                              </Badge>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs hidden sm:table-cell">{o.sample_qty_units || "—"} units</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className={`text-[10px] ${statusColors[o.status]}`}>{o.status.replace(/_/g, " ")}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Re-visits Tab */}
        <TabsContent value="revisit" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Client Name</TableHead>
                      <TableHead className="text-xs">Visits</TableHead>
                      <TableHead className="text-xs">Assigned To</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Visit Date</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revisitOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">No re-visits pending.</TableCell></TableRow>
                    ) : (
                      revisitOrders.map(o => (
                        <TableRow key={o.id} className="text-sm">
                          <TableCell className="font-medium max-w-[180px] truncate">{o.lead?.client_name || "Unknown"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{o.lead?.visit_count || 0}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{o.lead?.created_by || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{o.visit_date ? format(new Date(o.visit_date), "dd MMM") : "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {o.lead?.created_by === user?.email ? (
                                <>
                                  <Button size="sm" className="text-xs h-7 bg-success hover:bg-success/90 text-success-foreground" onClick={() => openLogVisit(o.lead_id, o.id)}>
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Log Visit
                                  </Button>
                                  <Button size="sm" className="text-xs h-7 bg-warning hover:bg-warning/90 text-warning-foreground" onClick={() => openReassign(o.lead_id)}>
                                    <RefreshCw className="w-3 h-3 mr-1" /> Re-assign
                                  </Button>
                                  <Button size="sm" className="text-xs h-7 bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => {
                                    setDropLeadId(o.lead_id);
                                    setDropOrderId(o.id);
                                    setDropReason("");
                                    setDropRemarks("");
                                    setDropOpen(true);
                                  }}>
                                    <XCircle className="w-3 h-3 mr-1" /> Mark Dropout
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" className="text-xs h-7 bg-warning hover:bg-warning/90 text-warning-foreground" onClick={() => openReassign(o.lead_id)}>
                                  <RefreshCw className="w-3 h-3 mr-1" /> Re-assign
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dropped Tab */}
        <TabsContent value="dropped" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Client Name</TableHead>
                      <TableHead className="text-xs">Visits</TableHead>
                      <TableHead className="text-xs">Assigned To</TableHead>
                      <TableHead className="text-xs">Reason</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Info</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {droppedOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">No dropped orders.</TableCell></TableRow>
                    ) : (
                      droppedOrders.map(o => {
                        const { reason, info } = extractDropInfo(o.remarks);
                        return (
                          <TableRow key={o.id} className="text-sm">
                            <TableCell className="font-medium">{o.lead?.client_name || "Unknown"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{o.lead?.visit_count || 0}</TableCell>
                            <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{o.lead?.created_by || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{reason}</TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden sm:table-cell max-w-[160px] truncate">{info}</TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{format(new Date(o.updated_at), "dd MMM")}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Log Visit Dialog */}
      <Dialog open={logVisitOpen} onOpenChange={open => { if (!open) { setLogVisitOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Sample Order</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            {/* Auto-filled client info */}
            {logVisitLeadId && (() => {
              const lead = leads.find(l => l.id === logVisitLeadId);
              if (!lead) return null;
              return (
                <div className="bg-muted/50 p-3 rounded-md space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Client Details</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div><span className="text-muted-foreground">Client:</span> {lead.client_name}</div>
                    <div><span className="text-muted-foreground">Pincode:</span> {lead.pincode}</div>
                    {lead.purchase_manager_name && <div><span className="text-muted-foreground">PM:</span> {lead.purchase_manager_name}</div>}
                    {lead.contact_number && <div><span className="text-muted-foreground">Phone:</span> {lead.contact_number}</div>}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1">
              <Label className="text-xs">Visit Date (auto-captured)</Label>
              <Input value={form.visit_date} readOnly className="bg-muted/50 text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Weekly Demand (kg)</Label>
              <Input type="number" placeholder="e.g. 10" value={form.demand_per_week_kg} onChange={e => setForm(f => ({ ...f, demand_per_week_kg: e.target.value }))} />
            </div>

            {/* KYC Section */}
            {logVisitLeadId && (() => {
              const lead = leads.find(l => l.id === logVisitLeadId);
              if (!lead) return null;
              const hasGst = !!(lead.gst_id || lead.gst_cert_url);
              const hasPan = !!(lead.pan_number || lead.pan_card_url);
              return (
                <div className="space-y-3 border rounded-md p-3 bg-muted/30">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">KYC / Identification</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">GST IN</Label>
                      {hasGst ? (
                        <div className="flex items-center gap-1.5">
                          <Input value={lead.gst_id || ""} readOnly className="bg-muted/50 text-xs h-9" />
                          {lead.gst_cert_url && <span className="text-[10px] text-success font-medium">✓ Doc</span>}
                        </div>
                      ) : (
                        <Input placeholder="22AAAAA0000A1Z5" className="text-xs h-9" id="s3-gst-id" defaultValue=""
                          onChange={e => (e.target as any)._kycGst = e.target.value} />
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">PAN Number</Label>
                      {hasPan ? (
                        <div className="flex items-center gap-1.5">
                          <Input value={lead.pan_number || ""} readOnly className="bg-muted/50 text-xs h-9" />
                          {lead.pan_card_url && <span className="text-[10px] text-success font-medium">✓ Doc</span>}
                        </div>
                      ) : (
                        <Input placeholder="ABCDE1234F" className="text-xs h-9" id="s3-pan-number" defaultValue=""
                          onChange={e => (e.target as any)._kycPan = e.target.value} />
                      )}
                    </div>
                  </div>
                  {lead.verification_status && (
                    <div className={`text-xs px-2 py-1 rounded-md font-medium ${lead.verification_status === "Verified" ? "bg-success/10 text-success" : lead.verification_status === "Duplicate" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                      {lead.verification_status === "Verified" ? "✓" : "!"} KYC {lead.verification_status} from Step 2
                    </div>
                  )}
                </div>
              );
            })()}

            <p className="text-xs font-semibold text-foreground uppercase tracking-wider border-b pb-1 mt-1">SKU Specifications</p>

            {/* SKU Dropdown */}
            <div className="space-y-1">
              <Label className="text-xs">Select SKU</Label>
              <Select value={form.selected_sku} onValueChange={v => setForm(f => ({ ...f, selected_sku: v }))}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select SKU" /></SelectTrigger>
                <SelectContent>
                  {skuOptions.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.sku_name} ({s.id.slice(0, 8)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SKU Rows: Quantity + Ripeness */}
            {skuRows.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Quantity (units)</Label>
                  <Input type="number" placeholder="e.g. 5" value={row.quantity} onChange={e => updateSkuRow(idx, "quantity", e.target.value)} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Ripeness Stage</Label>
                  <Select value={row.ripeness_stage} onValueChange={v => updateSkuRow(idx, "ripeness_stage", v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ripenessStages.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {skuRows.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeSkuRow(idx)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
                {idx === skuRows.length - 1 && (
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={addSkuRow}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}

            {/* SKU Specification Notes - mandatory */}
            <div className="space-y-1">
              <Label className="text-xs">SKU Specification Notes *</Label>
              <Textarea placeholder="Enter SKU specification details..." value={form.sku_spec_notes} onChange={e => setForm(f => ({ ...f, sku_spec_notes: e.target.value }))} rows={2} />
            </div>

            <p className="text-xs font-medium text-foreground mt-1">Sample Order Details</p>

            <div className="space-y-1">
              <Label className="text-xs">Delivery Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs h-9", !deliveryDate && "text-muted-foreground")}>
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {deliveryDate ? format(deliveryDate, "dd MMM yyyy") : "Pick delivery date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Delivery Address</Label>
              <Input placeholder="Defaults to outlet address" value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Delivery Slot</Label>
              <Select value={form.delivery_slot} onValueChange={v => setForm(f => ({ ...f, delivery_slot: v }))}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select slot" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (6AM-10AM)</SelectItem>
                  <SelectItem value="midday">Midday (10AM-2PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (2PM-6PM)</SelectItem>
                  <SelectItem value="evening">Evening (6PM-10PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">KAM Notes *</Label>
              <Textarea placeholder="Visit observations, client feedback..." value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={3} />
            </div>

            {/* Mandatory photo capture */}
            <PhotoCapture label="Visit Photo" required={true} value={visitPhotoUrl} onCapture={setVisitPhotoUrl} />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setRevisitSubOpen(true)} disabled={!logVisitLeadId}>
              <RotateCcw className="w-3 h-3 mr-1" /> Save as Incomplete
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
              <Button size="sm" onClick={handleBookSampleOrder} disabled={!logVisitLeadId || !form.remarks || !form.sku_spec_notes || !visitPhotoUrl}>
                <Package className="w-3 h-3 mr-1" /> Save and Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revisit Sub-dialog */}
      <Dialog open={revisitSubOpen} onOpenChange={open => { if (!open) { setRevisitSubOpen(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Save as Incomplete</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-center">
              <Calendar mode="single" selected={revisitDate} onSelect={setRevisitDate} initialFocus className="p-3 pointer-events-auto" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Time (optional)</Label>
              <Input type="time" value={revisitTime} onChange={e => setRevisitTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea placeholder="Re-visit reason..." value={revisitRemarks} onChange={e => setRevisitRemarks(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleRevisitRequired} disabled={!revisitDate}>Save and Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Not Interested / Drop Dialog */}
      <Dialog open={dropOpen} onOpenChange={open => { if (!open) { setDropOpen(false); setDropLeadId(null); setDropOrderId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Mark Dropout</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Reason *</Label>
              <Select value={dropReason} onValueChange={setDropReason}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>{dropReasons.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remarks</Label>
              <Textarea placeholder="Additional notes..." value={dropRemarks} onChange={e => setDropRemarks(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" variant="destructive" onClick={handleNotInterested} disabled={!dropReason}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-assign Dialog - direct agent list */}
      <Dialog open={reassignOpen} onOpenChange={open => { if (!open) setReassignOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Re-assign Lead</DialogTitle>
            <p className="text-xs text-muted-foreground">Select an agent to re-assign this lead to</p>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Search agents..." value={reassignUserSearch} onChange={e => setReassignUserSearch(e.target.value)} className="h-8 text-xs" />
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {filteredReassignUsers.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground text-center">No users found</p>
              ) : filteredReassignUsers.map(u => (
                <button key={u.email}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b last:border-b-0 ${reassignTo === u.email ? "bg-primary/10 text-primary" : ""}`}
                  onClick={() => setReassignTo(u.email!)}>
                  <span className="font-medium">{u.full_name || u.email}</span>
                  {u.full_name && <span className="text-muted-foreground ml-2">{u.email}</span>}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" className="bg-warning hover:bg-warning/90 text-warning-foreground" onClick={handleConfirmReassign} disabled={!reassignTo}>Re-assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
