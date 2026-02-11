import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useProspects, type ProspectFilters } from "@/hooks/useProspects";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Search, Upload, Filter, MapPin, ArrowUpDown, RefreshCw, RotateCcw, CheckSquare,
} from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  available: "bg-success/10 text-success border-success/20",
  assigned: "bg-info/10 text-info border-info/20",
  converted: "bg-accent/10 text-accent border-accent/20",
  dropped: "bg-destructive/10 text-destructive border-destructive/20",
};

const cuisineTypes = ["Indian", "Continental", "Pan-Asian", "Cafe", "Cloud Kitchen", "Multi-cuisine"];
const sourceTypes = ["Google Maps", "Swiggy", "Zomato", "Event", "Referral", "Field"];

export default function ProspectsPage() {
  const { prospects, loading, addProspect, updateProspectStatus, filterProspects } = useProspects();
  const { user } = useAuth();
  const [tab, setTab] = useState<"fresh" | "revisit" | "dropped">("fresh");
  const [search, setSearch] = useState("");
  const [filterPincode, setFilterPincode] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortField, setSortField] = useState<"restaurant_name" | "pincode" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  // Add form state
  const [form, setForm] = useState({
    pincode: "", locality: "", restaurant_name: "", location: "",
    mapped_to: "", source: "", cuisine_type: "",
  });

  const filters: ProspectFilters = { search, pincode: filterPincode, locality: "", status: filterStatus, tab };
  const filtered = useMemo(() => {
    const list = filterProspects(filters);
    return list.sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [prospects, filters, sortField, sortDir]);

  const pincodes = useMemo(() => [...new Set(prospects.map(p => p.pincode))].sort(), [prospects]);

  const counts = useMemo(() => ({
    fresh: prospects.filter(p => p.status === "available").length,
    revisit: prospects.filter(p => p.status === "assigned").length,
    dropped: prospects.filter(p => p.status === "dropped").length,
  }), [prospects]);

  const handleAdd = async () => {
    if (!form.pincode || !form.restaurant_name || !form.location || !form.locality) return;
    const ok = await addProspect({
      ...form,
      created_by: user?.email || null,
      status: "available",
    });
    if (ok) {
      setForm({ pincode: "", locality: "", restaurant_name: "", location: "", mapped_to: "", source: "", cuisine_type: "" });
      setAddOpen(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(p => p.id));
  };

  const handleBulkStatus = async (status: string) => {
    if (selected.length === 0) return;
    await updateProspectStatus(selected, status);
    setSelected([]);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Step 1: Prospect Building</h1>
          <p className="text-sm text-muted-foreground">{prospects.length} total prospects</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Prospect</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add New Prospect</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Pincode *</Label>
                    <Input placeholder="560034" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Locality *</Label>
                    <Input placeholder="Koramangala" value={form.locality} onChange={e => setForm(f => ({ ...f, locality: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Restaurant Name *</Label>
                  <Input placeholder="The Avocado Café" value={form.restaurant_name} onChange={e => setForm(f => ({ ...f, restaurant_name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Location *</Label>
                  <Input placeholder="Raj Villa, Koramangala, Bangalore" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Assigned KAM / Lead Generator *</Label>
                  <Input placeholder="kam@ninjacart.com" value={form.mapped_to} onChange={e => setForm(f => ({ ...f, mapped_to: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Source</Label>
                    <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{sourceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cuisine Type</Label>
                    <Select value={form.cuisine_type} onValueChange={v => setForm(f => ({ ...f, cuisine_type: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{cuisineTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
                <Button size="sm" onClick={handleAdd} disabled={!form.pincode || !form.restaurant_name || !form.location || !form.locality}>
                  Save Prospect
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-1" /> CSV Upload</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => { setTab(v as any); setSelected([]); }}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="fresh" className="text-xs">Fresh ({counts.fresh})</TabsTrigger>
          <TabsTrigger value="revisit" className="text-xs">Assigned ({counts.revisit})</TabsTrigger>
          <TabsTrigger value="dropped" className="text-xs">Dropped ({counts.dropped})</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name, locality, pincode..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterPincode} onValueChange={setFilterPincode}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs"><SelectValue placeholder="All Pincodes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pincodes</SelectItem>
              {pincodes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {selected.length > 0 && (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => handleBulkStatus("assigned")}>
                <CheckSquare className="w-3 h-3 mr-1" /> Assign ({selected.length})
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-9 text-destructive" onClick={() => handleBulkStatus("dropped")}>
                <RotateCcw className="w-3 h-3 mr-1" /> Drop
              </Button>
            </div>
          )}
        </div>

        {/* Table for all tabs */}
        <TabsContent value={tab} className="mt-3">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading prospects...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No prospects found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort("restaurant_name")}>
                          <span className="flex items-center gap-1 text-xs">Name <ArrowUpDown className="w-3 h-3" /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort("pincode")}>
                          <span className="flex items-center gap-1 text-xs">Pincode <ArrowUpDown className="w-3 h-3" /></span>
                        </TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Locality</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">Source</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">Cuisine</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs hidden md:table-cell cursor-pointer" onClick={() => toggleSort("created_at")}>
                          <span className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(p => (
                        <TableRow key={p.id} className="text-sm">
                          <TableCell><Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">{p.restaurant_name}</TableCell>
                          <TableCell className="font-mono text-xs">{p.pincode}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{p.locality}</TableCell>
                          <TableCell className="hidden lg:table-cell text-xs">{p.source || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell text-xs">{p.cuisine_type || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${statusColors[p.status] || ""}`}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {format(new Date(p.created_at), "dd MMM")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
