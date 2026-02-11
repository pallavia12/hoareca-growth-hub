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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { useProspects, type ProspectFilters } from "@/hooks/useProspects";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Search, Upload, ArrowUpDown, RotateCcw, CheckSquare, MoreHorizontal, Tag, CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  available: "bg-success/10 text-success border-success/20",
  assigned: "bg-info/10 text-info border-info/20",
  converted: "bg-accent/10 text-accent border-accent/20",
  dropped: "bg-destructive/10 text-destructive border-destructive/20",
};

const tagColors: Record<string, string> = {
  "Needs Re-call": "bg-warning/10 text-warning border-warning/20",
  "Partial Info": "bg-info/10 text-info border-info/20",
  "No Response": "bg-muted text-muted-foreground border-border",
  "Positive Response": "bg-success/10 text-success border-success/20",
  "Not Interested": "bg-destructive/10 text-destructive border-destructive/20",
};

const tagOptions = ["Needs Re-call", "Partial Info", "No Response", "Positive Response", "Not Interested"];
const cuisineTypes = ["Indian", "Continental", "Pan-Asian", "Cafe", "Cloud Kitchen", "Multi-cuisine"];
const sourceTypes = ["Google Maps", "Swiggy", "Zomato", "Event", "Referral", "Field"];

export default function ProspectsPage() {
  const { prospects, loading, addProspect, updateProspect, updateProspectStatus, filterProspects } = useProspects();
  const { user } = useAuth();
  const [tab, setTab] = useState<"fresh" | "revisit" | "dropped">("fresh");
  const [search, setSearch] = useState("");
  const [filterPincode, setFilterPincode] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [sortField, setSortField] = useState<"restaurant_name" | "pincode" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  // Inline action state
  const [actionRow, setActionRow] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"tag" | "recall" | null>(null);
  const [selectedTag, setSelectedTag] = useState("");
  const [recallDate, setRecallDate] = useState<Date | undefined>();

  // Add form state
  const [form, setForm] = useState({
    pincode: "", locality: "", restaurant_name: "", location: "",
    mapped_to: "", source: "", cuisine_type: "", tag: "", recall_date: "",
  });

  const filters: ProspectFilters = { search, pincode: filterPincode, locality: "", status: filterStatus, tab };
  const filtered = useMemo(() => {
    let list = filterProspects(filters);
    if (filterTag && filterTag !== "all") {
      list = list.filter(p => p.tag === filterTag);
    }
    return list.sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [prospects, filters, sortField, sortDir, filterTag]);

  const pincodes = useMemo(() => [...new Set(prospects.map(p => p.pincode))].sort(), [prospects]);

  const counts = useMemo(() => ({
    fresh: prospects.filter(p => p.status === "available").length,
    revisit: prospects.filter(p => p.status === "assigned").length,
    dropped: prospects.filter(p => p.status === "dropped").length,
  }), [prospects]);

  const handleAdd = async () => {
    if (!form.pincode || !form.restaurant_name || !form.locality) return;
    const ok = await addProspect({
      pincode: form.pincode,
      locality: form.locality,
      restaurant_name: form.restaurant_name,
      location: form.location || null,
      mapped_to: form.mapped_to || null,
      source: form.source || null,
      cuisine_type: form.cuisine_type || null,
      recall_date: form.recall_date || null,
      tag: form.tag || null,
      created_by: user?.email || null,
      status: "available",
    });
    if (ok) {
      setForm({ pincode: "", locality: "", restaurant_name: "", location: "", mapped_to: "", source: "", cuisine_type: "", tag: "", recall_date: "" });
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

  const openAction = (id: string, type: "tag" | "recall") => {
    setActionRow(id);
    setActionType(type);
    const p = prospects.find(pr => pr.id === id);
    if (type === "tag") setSelectedTag(p?.tag || "");
    if (type === "recall") setRecallDate(p?.recall_date ? new Date(p.recall_date) : undefined);
  };

  const handleSaveTag = async () => {
    if (!actionRow) return;
    await updateProspect(actionRow, { tag: selectedTag || null });
    setActionRow(null);
    setActionType(null);
  };

  const handleSaveRecall = async () => {
    if (!actionRow || !recallDate) return;
    await updateProspect(actionRow, { recall_date: format(recallDate, "yyyy-MM-dd") });
    setActionRow(null);
    setActionType(null);
  };

  const isAssignedTab = tab === "revisit";

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
                  <Label className="text-xs">Location</Label>
                  <Input placeholder="Raj Villa, Koramangala, Bangalore" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Assigned KAM / Lead Generator</Label>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tag</Label>
                    <Select value={form.tag} onValueChange={v => setForm(f => ({ ...f, tag: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select tag" /></SelectTrigger>
                      <SelectContent>{tagOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Re-call Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs h-9", !form.recall_date && "text-muted-foreground")}>
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          {form.recall_date ? format(new Date(form.recall_date), "dd MMM yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.recall_date ? new Date(form.recall_date) : undefined} onSelect={d => setForm(f => ({ ...f, recall_date: d ? format(d, "yyyy-MM-dd") : "" }))} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
                <Button size="sm" onClick={handleAdd} disabled={!form.pincode || !form.restaurant_name || !form.locality}>
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
          {isAssignedTab && (
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs"><SelectValue placeholder="All Tags" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tagOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
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

        {/* Table */}
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
                        {isAssignedTab && <TableHead className="text-xs">Assigned To</TableHead>}
                        {isAssignedTab && <TableHead className="text-xs">Tag</TableHead>}
                        {isAssignedTab && <TableHead className="text-xs hidden md:table-cell">Re-call Date</TableHead>}
                        <TableHead className="text-xs hidden lg:table-cell">Source</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs hidden md:table-cell cursor-pointer" onClick={() => toggleSort("created_at")}>
                          <span className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></span>
                        </TableHead>
                        {isAssignedTab && <TableHead className="text-xs w-10">Action</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(p => (
                        <TableRow key={p.id} className="text-sm">
                          <TableCell><Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">{p.restaurant_name}</TableCell>
                          <TableCell className="font-mono text-xs">{p.pincode}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{p.locality}</TableCell>
                          {isAssignedTab && <TableCell className="text-xs">{p.mapped_to || "—"}</TableCell>}
                          {isAssignedTab && (
                            <TableCell>
                              {p.tag ? (
                                <Badge variant="outline" className={`text-[10px] ${tagColors[p.tag] || ""}`}>{p.tag}</Badge>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                          )}
                          {isAssignedTab && (
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                              {p.recall_date ? format(new Date(p.recall_date), "dd MMM yyyy") : "—"}
                            </TableCell>
                          )}
                          <TableCell className="hidden lg:table-cell text-xs">{p.source || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${statusColors[p.status] || ""}`}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {format(new Date(p.created_at), "dd MMM")}
                          </TableCell>
                          {isAssignedTab && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openAction(p.id, "tag")}>
                                    <Tag className="w-3 h-3 mr-2" /> Tag Prospect
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openAction(p.id, "recall")}>
                                    <CalendarIcon className="w-3 h-3 mr-2" /> Schedule Re-call
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
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

      {/* Tag Modal */}
      <Dialog open={actionType === "tag"} onOpenChange={open => { if (!open) { setActionType(null); setActionRow(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Tag Prospect</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs">Select Tag</Label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map(t => (
                <Badge
                  key={t}
                  variant="outline"
                  className={cn("cursor-pointer text-xs px-3 py-1.5 transition-colors", selectedTag === t ? tagColors[t] : "hover:bg-muted")}
                  onClick={() => setSelectedTag(t)}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleSaveTag} disabled={!selectedTag}>Save Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-call Date Modal */}
      <Dialog open={actionType === "recall"} onOpenChange={open => { if (!open) { setActionType(null); setActionRow(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Schedule Re-call Date</DialogTitle></DialogHeader>
          <div className="flex justify-center">
            <Calendar mode="single" selected={recallDate} onSelect={setRecallDate} initialFocus className="p-3 pointer-events-auto" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleSaveRecall} disabled={!recallDate}>Save Date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
