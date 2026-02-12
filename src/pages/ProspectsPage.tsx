import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useProspects } from "@/hooks/useProspects";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Search, Upload, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const tagColors: Record<string, string> = {
  New: "bg-info/10 text-info border-info/20",
  "In Progress": "bg-accent/10 text-accent border-accent/20",
  Qualified: "bg-success/10 text-success border-success/20",
  Rescheduled: "bg-warning/10 text-warning border-warning/20",
  Dropped: "bg-destructive/10 text-destructive border-destructive/20",
};

const tagOptions = ["New", "In Progress", "Qualified", "Rescheduled", "Dropped"];
const cuisineTypes = ["Indian", "Continental", "Pan-Asian", "Cafe", "Cloud Kitchen", "Multi-cuisine"];
const sourceTypes = ["Google Maps", "Swiggy", "Zomato", "Event", "Referral", "Field"];

export default function ProspectsPage() {
  const { prospects, loading, addProspect, updateProspect, filterProspects, refetch } = useProspects();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"fresh" | "converted">("fresh");
  const [search, setSearch] = useState("");
  const [filterLocality, setFilterLocality] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  // Assignment dialog state - 2 screens
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignStep, setAssignStep] = useState<1 | 2>(1);
  const [assignPurpose, setAssignPurpose] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [pendingAssignId, setPendingAssignId] = useState<string | null>(null);

  // Users list for assignment
  const [users, setUsers] = useState<{ email: string; full_name: string | null }[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("email, full_name").then(({ data }) => {
      if (data) setUsers(data.filter(u => u.email));
    });
  }, []);

  // Add form
  const [form, setForm] = useState({
    pincode: "", locality: "", restaurant_name: "", location: "",
    source: "", cuisine_type: "",
  });

  const localities = useMemo(() => [...new Set(prospects.map(p => p.locality))].filter(Boolean).sort(), [prospects]);

  // Fresh = not converted (status != converted)
  // Converted = status === converted
  const freshProspects = useMemo(() => {
    let list = prospects.filter(p => p.status !== "converted");
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.restaurant_name.toLowerCase().includes(s) || p.locality.toLowerCase().includes(s));
    }
    if (filterLocality && filterLocality !== "all") list = list.filter(p => p.locality === filterLocality);
    if (filterTag && filterTag !== "all") list = list.filter(p => (p.tag || "New") === filterTag);
    return list;
  }, [prospects, search, filterLocality, filterTag]);

  const convertedProspects = useMemo(() => {
    let list = prospects.filter(p => p.status === "converted");
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.restaurant_name.toLowerCase().includes(s) || p.locality.toLowerCase().includes(s));
    }
    if (filterLocality && filterLocality !== "all") list = list.filter(p => p.locality === filterLocality);
    return list;
  }, [prospects, search, filterLocality]);

  const counts = useMemo(() => ({
    fresh: prospects.filter(p => p.status !== "converted").length,
    converted: prospects.filter(p => p.status === "converted").length,
  }), [prospects]);

  const handleAdd = async () => {
    if (!form.pincode || !form.restaurant_name || !form.locality) return;
    const ok = await addProspect({
      pincode: form.pincode,
      locality: form.locality,
      restaurant_name: form.restaurant_name,
      location: form.location || null,
      source: form.source || null,
      cuisine_type: form.cuisine_type || null,
      tag: "New",
      created_by: user?.email || null,
      status: "available",
    });
    if (ok) {
      setForm({ pincode: "", locality: "", restaurant_name: "", location: "", source: "", cuisine_type: "" });
      setAddOpen(false);
    }
  };

  const openAssignDialog = (prospectId: string) => {
    setPendingAssignId(prospectId);
    setAssignPurpose("");
    setAssignTo("");
    setAssignStep(1);
    setUserSearch("");
    setAssignOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (!assignPurpose || !assignTo || !pendingAssignId) return;
    await updateProspect(pendingAssignId, {
      status: "assigned",
      mapped_to: assignTo,
      tag: assignPurpose === "Call" ? "New" : "New",
    });
    toast({ title: "Prospect assigned successfully" });
    setAssignOpen(false);
    setPendingAssignId(null);
  };

  const filteredUsers = useMemo(() => {
    const s = userSearch.toLowerCase();
    return users.filter(u =>
      !s || (u.full_name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s)
    );
  }, [users, userSearch]);

  const currentList = tab === "fresh" ? freshProspects : convertedProspects;

  const buildGoogleMapsLink = (location: string | null) => {
    if (!location) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
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
                  <Label className="text-xs">Location</Label>
                  <Input placeholder="Full address for Google Maps" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
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
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="fresh" className="text-xs">Fresh ({counts.fresh})</TabsTrigger>
          <TabsTrigger value="converted" className="text-xs">Converted ({counts.converted})</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name, locality..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterLocality} onValueChange={setFilterLocality}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs"><SelectValue placeholder="All Localities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Localities</SelectItem>
              {localities.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          {tab === "fresh" && (
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs"><SelectValue placeholder="All Tags" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tagOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        <TabsContent value={tab} className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Restaurant Name</TableHead>
                      <TableHead className="text-xs">Assigned To</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Location</TableHead>
                      <TableHead className="text-xs">Tag</TableHead>
                      {tab === "fresh" && <TableHead className="text-xs w-24">Assign</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">Loading prospects...</TableCell></TableRow>
                    ) : currentList.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                        {tab === "fresh" ? "No fresh prospects found. Add prospects to get started." : "No converted prospects yet."}
                      </TableCell></TableRow>
                    ) : (
                      currentList.map(p => (
                        <TableRow key={p.id} className="text-sm">
                          <TableCell className="font-medium max-w-[200px] truncate">{p.restaurant_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.mapped_to || "—"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {p.location ? (
                              <a href={buildGoogleMapsLink(p.location)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                <ExternalLink className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{p.location}</span>
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">{p.locality}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${tagColors[p.tag || "New"] || tagColors["New"]}`}>
                              {p.tag || "New"}
                            </Badge>
                          </TableCell>
                          {tab === "fresh" && (
                            <TableCell>
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openAssignDialog(p.id)}>
                                Assign
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assignment Dialog - 2 screens */}
      <Dialog open={assignOpen} onOpenChange={open => { if (!open) setAssignOpen(false); }}>
        <DialogContent className="max-w-sm">
          {assignStep === 1 ? (
            <>
              <DialogHeader><DialogTitle className="text-base">Select Purpose</DialogTitle></DialogHeader>
              <RadioGroup value={assignPurpose} onValueChange={setAssignPurpose} className="space-y-3 py-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Call" id="purpose-call" />
                  <Label htmlFor="purpose-call" className="text-sm cursor-pointer">Call</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Visit" id="purpose-visit" />
                  <Label htmlFor="purpose-visit" className="text-sm cursor-pointer">Visit</Label>
                </div>
              </RadioGroup>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
                <Button size="sm" onClick={() => setAssignStep(2)} disabled={!assignPurpose}>Next</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader><DialogTitle className="text-base">Assign To</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="h-8 text-xs" />
                <div className="max-h-48 overflow-y-auto border rounded-md">
                  {filteredUsers.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground text-center">No users found</p>
                  ) : (
                    filteredUsers.map(u => (
                      <button
                        key={u.email}
                        className={cn("w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b last:border-b-0",
                          assignTo === u.email && "bg-primary/10 text-primary"
                        )}
                        onClick={() => setAssignTo(u.email!)}
                      >
                        <span className="font-medium">{u.full_name || u.email}</span>
                        {u.full_name && <span className="text-muted-foreground ml-2">{u.email}</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setAssignStep(1)}>Back</Button>
                <Button size="sm" onClick={handleConfirmAssign} disabled={!assignTo}>Assign</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
