import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLeads, type LeadFilters } from "@/hooks/useLeads";
import { useProspects } from "@/hooks/useProspects";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Search, Phone, MapPin, Calendar, ArrowUpDown, PhoneCall, Eye, Clock, User, Building,
} from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  new: "bg-info/10 text-info border-info/20",
  in_progress: "bg-accent/10 text-accent border-accent/20",
  qualified: "bg-success/10 text-success border-success/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  rescheduled: "bg-warning/10 text-warning border-warning/20",
};

const callOutcomes = [
  "Connected-Interested", "Connected-Not Interested", "Connected-Call Later",
  "Not Reachable", "Wrong Number", "Switched Off",
];

export default function LeadsPage() {
  const { leads, loading, addLead, updateLead, filterLeads } = useLeads();
  const { prospects } = useProspects();
  const { user } = useAuth();
  const [tab, setTab] = useState<"fresh" | "revisit" | "dropped">("fresh");
  const [search, setSearch] = useState("");
  const [filterPincode, setFilterPincode] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "call_count" | "visit_count">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [addOpen, setAddOpen] = useState(false);
  const [callLogOpen, setCallLogOpen] = useState<string | null>(null);
  const [visitLogOpen, setVisitLogOpen] = useState<string | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<string>("");

  // Add form
  const [form, setForm] = useState({
    client_name: "", outlet_address: "", pincode: "", locality: "",
    contact_number: "", gst_id: "", avocado_consumption: "",
    avocado_variety: "", purchase_manager_name: "", pm_contact: "",
    franchised: false, current_supplier: "", estimated_monthly_spend: "",
    remarks: "", appointment_date: "", appointment_time: "",
  });

  // Call log form
  const [callForm, setCallForm] = useState({ outcome: "", remarks: "" });
  // Visit log form
  const [visitForm, setVisitForm] = useState({ remarks: "" });

  const filters: LeadFilters = { search, pincode: filterPincode, status: filterStatus, tab };
  const filtered = useMemo(() => {
    const list = filterLeads(filters);
    return list.sort((a, b) => {
      const aVal = sortBy === "created_at" ? a.created_at : (a[sortBy] || 0);
      const bVal = sortBy === "created_at" ? b.created_at : (b[sortBy] || 0);
      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [leads, filters, sortBy, sortDir]);

  const pincodes = useMemo(() => [...new Set(leads.map(l => l.pincode))].sort(), [leads]);

  const counts = useMemo(() => ({
    fresh: leads.filter(l => (l.call_count || 0) === 0 && (l.visit_count || 0) === 0).length,
    revisit: leads.filter(l => (l.call_count || 0) > 0 || (l.visit_count || 0) > 0).length,
    dropped: leads.filter(l => l.status === "failed").length,
  }), [leads]);

  // Auto-fill from prospect
  const handleProspectSelect = (prospectId: string) => {
    setSelectedProspect(prospectId);
    const p = prospects.find(pr => pr.id === prospectId);
    if (p) {
      setForm(f => ({
        ...f,
        client_name: p.restaurant_name,
        pincode: p.pincode,
        locality: p.locality,
        outlet_address: p.location || "",
      }));
    }
  };

  const handleAddLead = async () => {
    if (!form.client_name || !form.pincode || !form.outlet_address || !form.contact_number || !form.remarks) return;
    const ok = await addLead({
      client_name: form.client_name,
      pincode: form.pincode,
      locality: form.locality || null,
      outlet_address: form.outlet_address,
      contact_number: form.contact_number,
      gst_id: form.gst_id || null,
      avocado_consumption: form.avocado_consumption || null,
      avocado_variety: form.avocado_variety || null,
      purchase_manager_name: form.purchase_manager_name || null,
      pm_contact: form.pm_contact || null,
      franchised: form.franchised,
      current_supplier: form.current_supplier || null,
      estimated_monthly_spend: form.estimated_monthly_spend ? Number(form.estimated_monthly_spend) : null,
      remarks: form.remarks,
      appointment_date: form.appointment_date || null,
      appointment_time: form.appointment_time || null,
      prospect_id: selectedProspect || null,
      created_by: user?.email || null,
      status: "new",
    });
    if (ok) {
      setForm({ client_name: "", outlet_address: "", pincode: "", locality: "", contact_number: "", gst_id: "", avocado_consumption: "", avocado_variety: "", purchase_manager_name: "", pm_contact: "", franchised: false, current_supplier: "", estimated_monthly_spend: "", remarks: "", appointment_date: "", appointment_time: "" });
      setSelectedProspect("");
      setAddOpen(false);
    }
  };

  const handleLogCall = async () => {
    if (!callLogOpen || !callForm.outcome) return;
    const lead = leads.find(l => l.id === callLogOpen);
    if (!lead) return;
    await updateLead(callLogOpen, {
      call_count: (lead.call_count || 0) + 1,
      last_activity_date: new Date().toISOString(),
      remarks: callForm.remarks ? `${lead.remarks || ""}\n[Call ${format(new Date(), "dd/MM HH:mm")}] ${callForm.outcome}: ${callForm.remarks}` : lead.remarks,
      status: callForm.outcome.includes("Interested") ? "in_progress" : callForm.outcome.includes("Not Interested") ? "failed" : lead.status,
    });
    setCallForm({ outcome: "", remarks: "" });
    setCallLogOpen(null);
  };

  const handleLogVisit = async () => {
    if (!visitLogOpen) return;
    const lead = leads.find(l => l.id === visitLogOpen);
    if (!lead) return;
    await updateLead(visitLogOpen, {
      visit_count: (lead.visit_count || 0) + 1,
      last_activity_date: new Date().toISOString(),
      remarks: visitForm.remarks ? `${lead.remarks || ""}\n[Visit ${format(new Date(), "dd/MM HH:mm")}] ${visitForm.remarks}` : lead.remarks,
      status: "in_progress",
    });
    setVisitForm({ remarks: "" });
    setVisitLogOpen(null);
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Step 2: Lead Generation</h1>
          <p className="text-sm text-muted-foreground">{leads.length} total leads</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Lead</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              {/* Auto-fill from prospect */}
              {prospects.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Auto-fill from Prospect</Label>
                  <Select value={selectedProspect} onValueChange={handleProspectSelect}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select a prospect (optional)" /></SelectTrigger>
                    <SelectContent>
                      {prospects.filter(p => p.status === "available" || p.status === "assigned").map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.restaurant_name} — {p.pincode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Client Name *</Label>
                <Input placeholder="Restaurant name" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Outlet Address *</Label>
                <Input placeholder="Full address with pincode" value={form.outlet_address} onChange={e => setForm(f => ({ ...f, outlet_address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Pincode *</Label>
                  <Input placeholder="560034" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contact Number *</Label>
                  <Input placeholder="+91..." value={form.contact_number} onChange={e => setForm(f => ({ ...f, contact_number: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">GST ID</Label>
                  <Input placeholder="Optional" value={form.gst_id} onChange={e => setForm(f => ({ ...f, gst_id: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Avocado Consumption</Label>
                  <Select value={form.avocado_consumption} onValueChange={v => setForm(f => ({ ...f, avocado_consumption: v }))}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes_imported">Yes - Imported</SelectItem>
                      <SelectItem value="yes_indian">Yes - Indian</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Purchase Manager</Label>
                  <Input placeholder="Name" value={form.purchase_manager_name} onChange={e => setForm(f => ({ ...f, purchase_manager_name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">PM Contact</Label>
                  <Input placeholder="Phone" value={form.pm_contact} onChange={e => setForm(f => ({ ...f, pm_contact: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Current Supplier</Label>
                  <Select value={form.current_supplier} onValueChange={v => setForm(f => ({ ...f, current_supplier: v }))}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Westfalia">Westfalia</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Monthly Spend (₹)</Label>
                  <Input type="number" placeholder="₹" value={form.estimated_monthly_spend} onChange={e => setForm(f => ({ ...f, estimated_monthly_spend: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.franchised} onCheckedChange={v => setForm(f => ({ ...f, franchised: !!v }))} />
                <Label className="text-xs">Franchised outlet</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Appointment Date</Label>
                  <Input type="date" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Appointment Time</Label>
                  <Input type="time" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Remarks *</Label>
                <Textarea placeholder="Notes about this lead..." value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
              <Button size="sm" onClick={handleAddLead} disabled={!form.client_name || !form.pincode || !form.outlet_address || !form.contact_number || !form.remarks}>
                Save Lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="fresh" className="text-xs">First Call/Visit ({counts.fresh})</TabsTrigger>
          <TabsTrigger value="revisit" className="text-xs">Re-visits ({counts.revisit})</TabsTrigger>
          <TabsTrigger value="dropped" className="text-xs">Drop-outs ({counts.dropped})</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name, pincode..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterPincode} onValueChange={setFilterPincode}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs"><SelectValue placeholder="All Pincodes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pincodes</SelectItem>
              {pincodes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button size="sm" variant={sortBy === "call_count" ? "secondary" : "outline"} className="text-xs h-9" onClick={() => toggleSort("call_count")}>
              <PhoneCall className="w-3 h-3 mr-1" /> Calls <ArrowUpDown className="w-3 h-3 ml-1" />
            </Button>
            <Button size="sm" variant={sortBy === "visit_count" ? "secondary" : "outline"} className="text-xs h-9" onClick={() => toggleSort("visit_count")}>
              <Eye className="w-3 h-3 mr-1" /> Visits <ArrowUpDown className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Lead Cards */}
        <TabsContent value={tab} className="mt-3">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading leads...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No leads found</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(l => (
                <Card key={l.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{l.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" /> {l.locality || l.pincode}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[l.status] || ""}`}>
                        {l.status.replace("_", " ")}
                      </Badge>
                    </div>

                    {l.contact_number && (
                      <p className="text-xs flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-3 h-3" /> {l.contact_number}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><PhoneCall className="w-3 h-3" /> {l.call_count || 0} calls</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {l.visit_count || 0} visits</span>
                      {l.last_activity_date && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(l.last_activity_date), "dd MMM")}</span>
                      )}
                    </div>

                    {l.remarks && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2">{l.remarks}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs flex-1 h-8" onClick={() => setCallLogOpen(l.id)}>
                        <PhoneCall className="w-3 h-3 mr-1" /> Log Call
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs flex-1 h-8" onClick={() => setVisitLogOpen(l.id)}>
                        <MapPin className="w-3 h-3 mr-1" /> Log Visit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Log Call Dialog */}
      <Dialog open={!!callLogOpen} onOpenChange={open => { if (!open) setCallLogOpen(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Log Call</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Outcome *</Label>
              <Select value={callForm.outcome} onValueChange={v => setCallForm(f => ({ ...f, outcome: v }))}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>{callOutcomes.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remarks</Label>
              <Textarea placeholder="Call notes..." value={callForm.remarks} onChange={e => setCallForm(f => ({ ...f, remarks: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleLogCall} disabled={!callForm.outcome}>Save Call Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Visit Dialog */}
      <Dialog open={!!visitLogOpen} onOpenChange={open => { if (!open) setVisitLogOpen(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Log Visit</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <p className="text-xs text-muted-foreground">Visit timestamp: {format(new Date(), "dd MMM yyyy, HH:mm")}</p>
            <div className="space-y-1">
              <Label className="text-xs">Remarks</Label>
              <Textarea placeholder="Visit notes..." value={visitForm.remarks} onChange={e => setVisitForm(f => ({ ...f, remarks: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleLogVisit}>Save Visit Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
