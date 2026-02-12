import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { useSampleOrders } from "@/hooks/useSampleOrders";
import { useLeads } from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, MapPin, CalendarIcon, ChevronDown, Package, Eye, Clock, Truck,
  XCircle, RotateCcw, Camera,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import AvocadoBrochureCarousel from "@/components/AvocadoBrochureCarousel";

const statusColors: Record<string, string> = {
  pending_visit: "bg-info/10 text-info border-info/20",
  visited: "bg-accent/10 text-accent border-accent/20",
  sample_ordered: "bg-success/10 text-success border-success/20",
  revisit_needed: "bg-warning/10 text-warning border-warning/20",
  dropped: "bg-destructive/10 text-destructive border-destructive/20",
};

const dropReasons = [
  "Price concerns", "Quality concerns", "No immediate need", "Competition preferred", "Other",
];

const countOptions = ["16", "18", "20", "22", "24"];
const ripenessOptions = ["Ready-to-eat", "Hard", "Custom"];

export default function SampleOrdersPage() {
  const { orders, loading, addOrder, updateOrder, refetch } = useSampleOrders();
  const { leads } = useLeads();
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<"scheduled" | "completed" | "revisit" | "dropped">("scheduled");
  const [search, setSearch] = useState("");
  const [filterPincode, setFilterPincode] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Create order dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");

  // Drop dialog
  const [dropOrderId, setDropOrderId] = useState<string | null>(null);
  const [dropReason, setDropReason] = useState("");
  const [dropRemarks, setDropRemarks] = useState("");

  // Re-visit dialog
  const [revisitOrderId, setRevisitOrderId] = useState<string | null>(null);
  const [revisitDate, setRevisitDate] = useState<Date | undefined>();
  const [revisitRemarks, setRevisitRemarks] = useState("");

  // Form
  const [form, setForm] = useState({
    delivery_address: "",
    delivery_date: "",
    delivery_slot: "",
    sample_qty_units: "",
    demand_per_week_kg: "",
    remarks: "",
    visit_date: format(new Date(), "yyyy-MM-dd"),
    // Extra fields stored in remarks
    count_per_box: "",
    ripeness_stage: "",
    follow_up_date: "",
  });

  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();

  // Qualified leads (have PM contact)
  const qualifiedLeads = useMemo(() => {
    return leads.filter(l =>
      (l.status === "qualified" || l.status === "in_progress") &&
      !leadSearch || l.client_name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.pincode.includes(leadSearch)
    );
  }, [leads, leadSearch]);

  const filteredQualifiedLeads = useMemo(() => {
    if (!leadSearch) return qualifiedLeads.slice(0, 10);
    const s = leadSearch.toLowerCase();
    return qualifiedLeads.filter(l =>
      l.client_name.toLowerCase().includes(s) || l.pincode.includes(s) || (l.locality || "").toLowerCase().includes(s)
    ).slice(0, 10);
  }, [qualifiedLeads, leadSearch]);

  const selectedLead = useMemo(() => leads.find(l => l.id === selectedLeadId), [leads, selectedLeadId]);

  // Map orders to leads for display
  const ordersWithLeads = useMemo(() => {
    return orders.map(o => ({
      ...o,
      lead: leads.find(l => l.id === o.lead_id),
    }));
  }, [orders, leads]);

  const pincodes = useMemo(() => {
    const set = new Set(ordersWithLeads.map(o => o.lead?.pincode).filter(Boolean) as string[]);
    return [...set].sort();
  }, [ordersWithLeads]);

  const filtered = useMemo(() => {
    return ordersWithLeads.filter(o => {
      // Search
      if (search) {
        const s = search.toLowerCase();
        const name = o.lead?.client_name?.toLowerCase() || "";
        const pin = o.lead?.pincode || "";
        if (!name.includes(s) && !pin.includes(s)) return false;
      }
      // Pincode
      if (filterPincode && filterPincode !== "all" && o.lead?.pincode !== filterPincode) return false;
      // Status filter
      if (filterStatus && filterStatus !== "all" && o.status !== filterStatus) return false;

      // Tab
      if (tab === "scheduled") return o.status === "pending_visit";
      if (tab === "completed") return o.status === "sample_ordered" || o.status === "visited";
      if (tab === "revisit") return o.status === "revisit_needed";
      if (tab === "dropped") return o.status === "dropped";
      return true;
    });
  }, [ordersWithLeads, search, filterPincode, filterStatus, tab]);

  const counts = useMemo(() => ({
    scheduled: ordersWithLeads.filter(o => o.status === "pending_visit").length,
    completed: ordersWithLeads.filter(o => o.status === "sample_ordered" || o.status === "visited").length,
    revisit: ordersWithLeads.filter(o => o.status === "revisit_needed").length,
    dropped: ordersWithLeads.filter(o => o.status === "dropped").length,
  }), [ordersWithLeads]);

  const resetForm = () => {
    setForm({ delivery_address: "", delivery_date: "", delivery_slot: "", sample_qty_units: "", demand_per_week_kg: "", remarks: "", visit_date: format(new Date(), "yyyy-MM-dd"), count_per_box: "", ripeness_stage: "", follow_up_date: "" });
    setSelectedLeadId("");
    setLeadSearch("");
    setFollowUpDate(undefined);
    setDeliveryDate(undefined);
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setForm(f => ({
        ...f,
        delivery_address: lead.outlet_address || "",
      }));
    }
  };

  const handleCreate = async () => {
    if (!selectedLeadId || !form.remarks) return;

    // Build avocado spec notes
    const specNotes = [
      form.count_per_box && `Count/box: ${form.count_per_box}`,
      form.ripeness_stage && `Ripeness: ${form.ripeness_stage}`,
      followUpDate && `Follow-up: ${format(followUpDate, "dd MMM yyyy")}`,
    ].filter(Boolean).join(" | ");

    const fullRemarks = specNotes ? `${form.remarks}\n[Specs] ${specNotes}` : form.remarks;

    const ok = await addOrder({
      lead_id: selectedLeadId,
      delivery_address: form.delivery_address || null,
      delivery_date: deliveryDate ? format(deliveryDate, "yyyy-MM-dd") : null,
      delivery_slot: form.delivery_slot || null,
      sample_qty_units: form.sample_qty_units ? Number(form.sample_qty_units) : null,
      demand_per_week_kg: form.demand_per_week_kg ? Number(form.demand_per_week_kg) : null,
      remarks: fullRemarks,
      visit_date: form.visit_date || null,
      status: "sample_ordered",
    });

    if (ok) {
      // Update lead status to reflect sample order
      const { error } = await (await import("@/integrations/supabase/client")).supabase
        .from("leads")
        .update({ status: "qualified", updated_at: new Date().toISOString() })
        .eq("id", selectedLeadId);

      resetForm();
      setCreateOpen(false);
    }
  };

  const handleDrop = async () => {
    if (!dropOrderId || !dropReason) return;
    await updateOrder(dropOrderId, {
      status: "dropped",
      remarks: `[Dropped] ${dropReason}${dropRemarks ? `: ${dropRemarks}` : ""}`,
    });
    setDropOrderId(null);
    setDropReason("");
    setDropRemarks("");
  };

  const handleRevisit = async () => {
    if (!revisitOrderId || !revisitDate) return;
    await updateOrder(revisitOrderId, {
      status: "revisit_needed",
      remarks: `[Re-visit scheduled: ${format(revisitDate, "dd MMM yyyy")}] ${revisitRemarks}`,
    });
    setRevisitOrderId(null);
    setRevisitDate(undefined);
    setRevisitRemarks("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Step 3: Visit to Sample Order</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total sample orders</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> New Sample Order
        </Button>
      </div>

      {/* Brochure Carousel */}
      <AvocadoBrochureCarousel />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="scheduled" className="text-xs">Scheduled ({counts.scheduled})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Completed ({counts.completed})</TabsTrigger>
          <TabsTrigger value="revisit" className="text-xs">Re-visits ({counts.revisit})</TabsTrigger>
          <TabsTrigger value="dropped" className="text-xs">Dropped ({counts.dropped})</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search client name, pincode..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterPincode} onValueChange={setFilterPincode}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs"><SelectValue placeholder="All Pincodes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pincodes</SelectItem>
              {pincodes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_visit">Scheduled</SelectItem>
              <SelectItem value="visited">Visited</SelectItem>
              <SelectItem value="sample_ordered">Sample Ordered</SelectItem>
              <SelectItem value="revisit_needed">Re-visit Needed</SelectItem>
              <SelectItem value="dropped">Dropped</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cards */}
        <TabsContent value={tab} className="mt-3">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading sample orders...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No sample orders found</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(o => (
                <Card key={o.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{o.lead?.client_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" /> {o.lead?.locality || o.lead?.pincode || "—"}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[o.status] || ""}`}>
                        {o.status.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {/* Sample order summary */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {o.sample_qty_units && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Package className="w-3 h-3" /> {o.sample_qty_units} units
                        </span>
                      )}
                      {o.delivery_date && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Truck className="w-3 h-3" /> {format(new Date(o.delivery_date), "dd MMM")}
                        </span>
                      )}
                      {o.demand_per_week_kg && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Package className="w-3 h-3" /> {o.demand_per_week_kg} kg/wk
                        </span>
                      )}
                      {o.visit_date && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="w-3 h-3" /> Visit: {format(new Date(o.visit_date), "dd MMM")}
                        </span>
                      )}
                    </div>

                    {o.delivery_address && (
                      <p className="text-xs text-muted-foreground truncate">📍 {o.delivery_address}</p>
                    )}

                    {o.remarks && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2">{o.remarks}</p>
                    )}

                    {/* Actions */}
                    {o.status !== "dropped" && o.status !== "sample_ordered" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs flex-1 h-8" onClick={() => { setRevisitOrderId(o.id); }}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Re-visit
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs flex-1 h-8 text-destructive" onClick={() => { setDropOrderId(o.id); }}>
                          <XCircle className="w-3 h-3 mr-1" /> Drop
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Sample Order Dialog */}
      <Dialog open={createOpen} onOpenChange={open => { if (!open) { setCreateOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Sample Order</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            {/* Lead selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Select Qualified Lead *</Label>
              <Input placeholder="Search leads by name, pincode..." value={leadSearch} onChange={e => setLeadSearch(e.target.value)} className="h-8 text-xs" />
              {!selectedLeadId && filteredQualifiedLeads.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded-md">
                  {filteredQualifiedLeads.map(l => (
                    <button key={l.id} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b last:border-b-0" onClick={() => handleSelectLead(l.id)}>
                      <span className="font-medium">{l.client_name}</span>
                      <span className="text-muted-foreground ml-2">{l.locality || ""} · {l.pincode}</span>
                      {l.purchase_manager_name && <span className="text-muted-foreground ml-2">PM: {l.purchase_manager_name}</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedLead && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-success/10 text-success text-xs">
                    Selected: {selectedLead.client_name}
                  </Badge>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => { setSelectedLeadId(""); setLeadSearch(""); }}>Change</Button>
                </div>
              )}
            </div>

            {/* Pre-filled read-only fields */}
            {selectedLead && (
              <div className="bg-muted/50 p-3 rounded-md space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Client Details (from Lead)</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Client:</span> {selectedLead.client_name}</div>
                  <div><span className="text-muted-foreground">Pincode:</span> {selectedLead.pincode}</div>
                  {selectedLead.purchase_manager_name && (
                    <div><span className="text-muted-foreground">PM:</span> {selectedLead.purchase_manager_name}</div>
                  )}
                  {selectedLead.pm_contact && (
                    <div><span className="text-muted-foreground">PM Contact:</span> {selectedLead.pm_contact}</div>
                  )}
                  {selectedLead.contact_number && (
                    <div><span className="text-muted-foreground">Phone:</span> {selectedLead.contact_number}</div>
                  )}
                </div>
              </div>
            )}

            {/* Visit date auto-captured */}
            <div className="space-y-1">
              <Label className="text-xs">Visit Date (auto-captured)</Label>
              <Input value={form.visit_date} readOnly className="bg-muted/50 text-xs" />
            </div>

            {/* Avocado specs */}
            <p className="text-xs font-medium text-foreground mt-1">Avocado Specifications</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Count per Box</Label>
                <Select value={form.count_per_box} onValueChange={v => setForm(f => ({ ...f, count_per_box: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {countOptions.map(c => <SelectItem key={c} value={c}>{c} count</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ripeness Stage</Label>
                <Select value={form.ripeness_stage} onValueChange={v => setForm(f => ({ ...f, ripeness_stage: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {ripenessOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sample order details */}
            <p className="text-xs font-medium text-foreground mt-1">Sample Order Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Quantity (units)</Label>
                <Input type="number" placeholder="e.g. 5" value={form.sample_qty_units} onChange={e => setForm(f => ({ ...f, sample_qty_units: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Weekly Demand (kg)</Label>
                <Input type="number" placeholder="e.g. 10" value={form.demand_per_week_kg} onChange={e => setForm(f => ({ ...f, demand_per_week_kg: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Delivery Date *</Label>
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

            {/* KAM Notes */}
            <div className="space-y-1">
              <Label className="text-xs">KAM Notes *</Label>
              <Textarea placeholder="Visit observations, client feedback..." value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={3} />
            </div>

            {/* Follow-up date */}
            <div className="space-y-1">
              <Label className="text-xs">Next Follow-up Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs h-9", !followUpDate && "text-muted-foreground")}>
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {followUpDate ? format(followUpDate, "dd MMM yyyy") : "Pick follow-up date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              if (!selectedLeadId) return;
              setRevisitOrderId("new");
              setRevisitRemarks(form.remarks);
            }} disabled={!selectedLeadId}>
              <RotateCcw className="w-3 h-3 mr-1" /> Re-visit Required
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => {
                if (!selectedLeadId) return;
                setDropOrderId("new");
              }} disabled={!selectedLeadId}>
                <XCircle className="w-3 h-3 mr-1" /> Not Interested
              </Button>
              <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
              <Button size="sm" onClick={handleCreate} disabled={!selectedLeadId || !form.remarks || !followUpDate}>
                <Package className="w-3 h-3 mr-1" /> Book Sample Order
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drop Dialog */}
      <Dialog open={!!dropOrderId} onOpenChange={open => { if (!open) { setDropOrderId(null); setDropReason(""); setDropRemarks(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Mark as Dropped</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Reason *</Label>
              <Select value={dropReason} onValueChange={setDropReason}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {dropReasons.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remarks</Label>
              <Textarea placeholder="Additional notes..." value={dropRemarks} onChange={e => setDropRemarks(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" variant="destructive" onClick={async () => {
              if (dropOrderId === "new") {
                // Create order as dropped
                if (!selectedLeadId || !dropReason) return;
                await addOrder({
                  lead_id: selectedLeadId,
                  status: "dropped",
                  remarks: `[Dropped] ${dropReason}${dropRemarks ? `: ${dropRemarks}` : ""}`,
                  visit_date: form.visit_date || null,
                });
                resetForm();
                setCreateOpen(false);
                setDropOrderId(null);
                setDropReason("");
                setDropRemarks("");
              } else {
                await handleDrop();
              }
            }} disabled={!dropReason}>
              Confirm Drop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-visit Dialog */}
      <Dialog open={!!revisitOrderId} onOpenChange={open => { if (!open) { setRevisitOrderId(null); setRevisitDate(undefined); setRevisitRemarks(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Schedule Re-visit</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="flex justify-center">
              <Calendar mode="single" selected={revisitDate} onSelect={setRevisitDate} initialFocus className="p-3 pointer-events-auto" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea placeholder="Re-visit reason..." value={revisitRemarks} onChange={e => setRevisitRemarks(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={async () => {
              if (revisitOrderId === "new") {
                if (!selectedLeadId || !revisitDate) return;
                await addOrder({
                  lead_id: selectedLeadId,
                  status: "revisit_needed",
                  remarks: `[Re-visit: ${format(revisitDate, "dd MMM yyyy")}] ${revisitRemarks || form.remarks}`,
                  visit_date: form.visit_date || null,
                  delivery_address: form.delivery_address || null,
                });
                resetForm();
                setCreateOpen(false);
                setRevisitOrderId(null);
                setRevisitDate(undefined);
                setRevisitRemarks("");
              } else {
                await handleRevisit();
              }
            }} disabled={!revisitDate}>
              Confirm Re-visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
