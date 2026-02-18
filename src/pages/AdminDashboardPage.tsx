import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Users, Package, Layers, Plus, Pencil, Trash2, Search,
  Database, Phone, ShoppingBag, FileSignature, TrendingUp, PhoneCall, IndianRupee,
  CalendarIcon, ChevronRight,
} from "lucide-react";
import type { Tables as TablesType } from "@/integrations/supabase/types";

const METRIC_CONFIG = [
  { label: "Total Prospects", key: "prospects", icon: Database, color: "text-primary" },
  { label: "Leads Generated", key: "leads", icon: Users, color: "text-secondary" },
  { label: "Sample Orders", key: "orders", icon: ShoppingBag, color: "text-accent" },
  { label: "Agreements Signed", key: "agreements", icon: FileSignature, color: "text-primary" },
  { label: "Today's Calls", key: "todayCalls", icon: PhoneCall, color: "text-info" },
  { label: "Today's Visits", key: "todayVisits", icon: MapPin, color: "text-secondary" },
  { label: "Conversion Rate", key: "conversionRate", icon: TrendingUp, color: "text-primary" },
  { label: "Pipeline Value", key: "pipelineValue", icon: IndianRupee, color: "text-accent" },
];

// Default coords for localities; extended dynamically from pincode_persona_map localities
const DEFAULT_LOCALITY_COORDS: Record<string, { x: number; y: number; w: number; h: number; color: string }> = {
  "Koramangala": { x: 40, y: 48, w: 18, h: 14, color: "#4F46E5" },
  "Indiranagar": { x: 48, y: 30, w: 16, h: 12, color: "#059669" },
  "Whitefield": { x: 68, y: 26, w: 20, h: 14, color: "#D97706" },
  "Jayanagar": { x: 28, y: 58, w: 18, h: 14, color: "#DC2626" },
  "MG Road": { x: 42, y: 34, w: 14, h: 10, color: "#7C3AED" },
  "HSR Layout": { x: 44, y: 62, w: 18, h: 14, color: "#0891B2" },
  "Marathahalli": { x: 60, y: 34, w: 16, h: 14, color: "#EA580C" },
  "Basavanagudi": { x: 24, y: 48, w: 16, h: 14, color: "#BE185D" },
};
const FALLBACK_COLORS = ["#4F46E5", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#EA580C", "#BE185D"];

type PincodeMap = TablesType<"pincode_persona_map">;
type SkuMapping = TablesType<"sku_mapping">;
type StageMapping = TablesType<"stage_mapping">;

const roleBadgeColors: Record<string, string> = {
  calling_agent: "bg-blue-100 text-blue-700 border-blue-200",
  lead_taker: "bg-green-100 text-green-700 border-green-200",
  kam: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-orange-100 text-orange-700 border-orange-200",
};

const roleLabels: Record<string, string> = {
  calling_agent: "Calling Agent",
  lead_taker: "Lead Taker",
  kam: "KAM",
  admin: "Admin",
};


export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pincode");
  const [metrics, setMetrics] = useState<Record<string, string>>({
    prospects: "—", leads: "—", orders: "—", agreements: "—",
    todayCalls: "—", todayVisits: "—", conversionRate: "—", pipelineValue: "—",
  });

  // --- Pincode Mapping State ---
  const [pincodeData, setPincodeData] = useState<PincodeMap[]>([]);
  const [pincodeLoading, setPincodeLoading] = useState(true);
  const [pincodeSearch, setPincodeSearch] = useState("");
  const [selectedPincode, setSelectedPincode] = useState<string | null>(null);
  const [pincodeDialogOpen, setPincodeDialogOpen] = useState(false);
  const [addMappingOpen, setAddMappingOpen] = useState(false);
  const [newPincode, setNewPincode] = useState("");
  const [newLocality, setNewLocality] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // --- SKU Mapping State ---
  const [skuData, setSkuData] = useState<SkuMapping[]>([]);
  const [skuLoading, setSkuLoading] = useState(true);
  const [addSkuOpen, setAddSkuOpen] = useState(false);
  const [newGrammage, setNewGrammage] = useState("");
  const [newSkuName, setNewSkuName] = useState("");
  const [newLotSize, setNewLotSize] = useState("");
  const [newBoxCount, setNewBoxCount] = useState("");

  // --- Stage Mapping State ---
  const [stageData, setStageData] = useState<StageMapping[]>([]);
  const [stageLoading, setStageLoading] = useState(true);
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [editStage, setEditStage] = useState<StageMapping | null>(null);
  const [newStageNumber, setNewStageNumber] = useState("");
  const [newStageDesc, setNewStageDesc] = useState("");
  const [newDaysMin, setNewDaysMin] = useState("");
  const [newDaysMax, setNewDaysMax] = useState("");

  useEffect(() => {
    fetchPincodeData();
    fetchSkuData();
    fetchStageData();
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [pRes, lRes, oData, aData, logsRes] = await Promise.all([
        supabase.from("prospects").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("sample_orders").select("id"),
        supabase.from("agreements").select("id, status"),
        supabase.from("activity_logs").select("action, timestamp, notes").gte("timestamp", `${today}T00:00:00`),
      ]);
      const pCount = pRes.count ?? 0;
      const lCount = lRes.count ?? 0;
      const oCount = oData?.length ?? 0;
      const signedCount = (aData || []).filter((a: { status: string }) => a.status === "signed").length;
      const logs = logsRes.data || [];
      const todayCalls = logs.filter((l: { action: string }) => /call|dial|contact/i.test(l.action || "")).length;
      const todayVisits = logs.filter((l: { action: string }) => /visit|meet|sample/i.test(l.action || "")).length;
      const convRate = lCount > 0 ? ((signedCount / lCount) * 100).toFixed(1) : "0";
      const pipelineValue = "—";
      setMetrics({
        prospects: String(pCount),
        leads: String(lCount),
        orders: String(oCount),
        agreements: String(signedCount),
        todayCalls: String(todayCalls),
        todayVisits: String(todayVisits),
        conversionRate: `${convRate}%`,
        pipelineValue,
      });
    };
    fetchMetrics();
  }, []);

  const fetchPincodeData = async () => {
    setPincodeLoading(true);
    const { data } = await supabase.from("pincode_persona_map").select("*").order("pincode");
    setPincodeData(data || []);
    setPincodeLoading(false);
  };

  const fetchSkuData = async () => {
    setSkuLoading(true);
    const { data } = await supabase.from("sku_mapping").select("*").order("grammage");
    setSkuData(data || []);
    setSkuLoading(false);
  };

  const fetchStageData = async () => {
    setStageLoading(true);
    const { data } = await supabase.from("stage_mapping").select("*").order("stage_number");
    setStageData(data || []);
    setStageLoading(false);
  };

  // Pincode grouped data
  const pincodeGroups = useMemo(() => {
    const groups: Record<string, { locality: string; mappings: PincodeMap[] }> = {};
    pincodeData.forEach(p => {
      if (!groups[p.pincode]) groups[p.pincode] = { locality: p.locality, mappings: [] };
      groups[p.pincode].mappings.push(p);
    });
    return groups;
  }, [pincodeData]);

  const filteredPincodes = useMemo(() => {
    const entries = Object.entries(pincodeGroups);
    if (!pincodeSearch) return entries;
    const s = pincodeSearch.toLowerCase();
    return entries.filter(([pin, g]) => pin.includes(s) || g.locality.toLowerCase().includes(s));
  }, [pincodeGroups, pincodeSearch]);

  const selectedPincodeData = selectedPincode ? pincodeGroups[selectedPincode] : null;

  const localityCoords = useMemo(() => {
    const localities = [...new Set(Object.values(pincodeGroups).map(g => g.locality))];
    const coords: Record<string, { x: number; y: number; w: number; h: number; color: string }> = {};
    localities.forEach((loc, i) => {
      if (DEFAULT_LOCALITY_COORDS[loc]) {
        coords[loc] = DEFAULT_LOCALITY_COORDS[loc];
      } else {
        const row = Math.floor(i / 4);
        const col = i % 4;
        coords[loc] = {
          x: 10 + col * 22, y: 15 + row * 25, w: 18, h: 12,
          color: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        };
      }
    });
    return coords;
  }, [pincodeGroups]);

  const openPincodeDialog = (pincode: string) => {
    setSelectedPincode(pincode);
    setPincodeDialogOpen(true);
  };

  // Add pincode mapping
  const handleAddMapping = async () => {
    if (!newPincode || !newLocality || !newRole || !newEmail) return;
    const { error } = await supabase.from("pincode_persona_map").insert({
      pincode: newPincode,
      locality: newLocality,
      role: newRole as any,
      user_email: newEmail,
    });
    if (error) {
      toast({ title: "Error adding mapping", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mapping added" });
      setAddMappingOpen(false);
      setNewPincode(""); setNewLocality(""); setNewRole(""); setNewEmail("");
      fetchPincodeData();
    }
  };

  const handleDeleteMapping = async (id: string) => {
    const { error } = await supabase.from("pincode_persona_map").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
    } else {
      fetchPincodeData();
    }
  };

  // Add SKU
  const handleAddSku = async () => {
    if (!newGrammage || !newSkuName) return;
    const { error } = await supabase.from("sku_mapping").insert({
      grammage: Number(newGrammage),
      sku_name: newSkuName,
      lot_size: newLotSize ? Number(newLotSize) : null,
      box_count: newBoxCount ? Number(newBoxCount) : null,
    });
    if (error) {
      toast({ title: "Error adding SKU", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "SKU mapping added" });
      setAddSkuOpen(false);
      setNewGrammage(""); setNewSkuName(""); setNewLotSize(""); setNewBoxCount("");
      fetchSkuData();
    }
  };

  const handleDeleteSku = async (id: string) => {
    const { error } = await supabase.from("sku_mapping").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
    } else {
      fetchSkuData();
    }
  };

  // Add Stage
  const handleAddStage = async () => {
    if (!newStageNumber || !newStageDesc || !newDaysMin || !newDaysMax) return;
    const { error } = await supabase.from("stage_mapping").insert({
      stage_number: Number(newStageNumber),
      stage_description: newStageDesc,
      consumption_days_min: Number(newDaysMin),
      consumption_days_max: Number(newDaysMax),
    });
    if (error) {
      toast({ title: "Error adding stage", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Stage mapping added" });
      setAddStageOpen(false);
      setNewStageNumber(""); setNewStageDesc(""); setNewDaysMin(""); setNewDaysMax("");
      fetchStageData();
    }
  };

  // Edit Stage
  const openEditStage = (stage: StageMapping) => {
    setEditStage(stage);
    setNewStageNumber(String(stage.stage_number));
    setNewStageDesc(stage.stage_description);
    setNewDaysMin(String(stage.consumption_days_min));
    setNewDaysMax(String(stage.consumption_days_max));
  };

  const handleEditStage = async () => {
    if (!editStage || !newStageNumber || !newStageDesc || !newDaysMin || !newDaysMax) return;
    const { error } = await supabase.from("stage_mapping").update({
      stage_number: Number(newStageNumber),
      stage_description: newStageDesc,
      consumption_days_min: Number(newDaysMin),
      consumption_days_max: Number(newDaysMax),
    }).eq("id", editStage.id);
    if (error) {
      toast({ title: "Error updating stage", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Stage updated" });
      setEditStage(null);
      setNewStageNumber(""); setNewStageDesc(""); setNewDaysMin(""); setNewDaysMax("");
      fetchStageData();
    }
  };

  const handleDeleteStage = async (id: string) => {
    const { error } = await supabase.from("stage_mapping").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
    } else {
      fetchStageData();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage pincode mappings, SKU specs, and stage configurations</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {METRIC_CONFIG.map((m) => (
          <Card key={m.label} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <m.icon className={`w-5 h-5 ${m.color} opacity-70`} />
              </div>
              <p className="text-2xl font-bold mt-2">{metrics[m.key] ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Link to Funnel View */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = "/admin/funnel"}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-sm">Funnel View</p>
              <p className="text-xs text-muted-foreground">Conversion analytics & drop-off analysis</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pincode" className="text-xs gap-1">
            <MapPin className="w-3 h-3" /> Pincode Mapping
          </TabsTrigger>
          <TabsTrigger value="sku" className="text-xs gap-1">
            <Package className="w-3 h-3" /> SKU Specs
          </TabsTrigger>
          <TabsTrigger value="stage" className="text-xs gap-1">
            <Layers className="w-3 h-3" /> Stage Mapping
          </TabsTrigger>
        </TabsList>

        {/* ===== PINCODE MAPPING TAB ===== */}
        <TabsContent value="pincode" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search pincode or locality..." className="pl-8 h-9 text-sm" value={pincodeSearch} onChange={e => setPincodeSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => setAddMappingOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Mapping
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Map View with rectangular boundaries */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Bangalore Locality Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full aspect-square bg-muted/30 rounded-lg border overflow-hidden">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {/* Grid lines */}
                    {[20, 40, 60, 80].map(v => (
                      <g key={v}>
                        <line x1={v} y1="10" x2={v} y2="90" stroke="hsl(var(--border))" strokeWidth="0.2" strokeDasharray="1,1" />
                        <line x1="10" y1={v} x2="90" y2={v} stroke="hsl(var(--border))" strokeWidth="0.2" strokeDasharray="1,1" />
                      </g>
                    ))}

                    {/* Locality rectangular markers */}
                    {Object.entries(localityCoords).map(([name, { x, y, w, h, color }]) => {
                      const pincode = Object.keys(pincodeGroups).find(p => pincodeGroups[p].locality === name);
                      const isSelected = selectedPincode === pincode;
                      const count = pincode ? pincodeGroups[pincode].mappings.length : 0;
                      return (
                        <g
                          key={name}
                          className="cursor-pointer"
                          onClick={() => pincode && openPincodeDialog(pincode)}
                        >
                          {/* Rectangular boundary */}
                          <rect
                            x={x} y={y}
                            width={w} height={h}
                            rx={1.5}
                            fill={color}
                            opacity={isSelected ? 0.35 : 0.15}
                            stroke={color}
                            strokeWidth={isSelected ? 1 : 0.5}
                          />
                          {/* Label */}
                          <text
                            x={x + w / 2} y={y + h / 2 - 1}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={isSelected ? 3 : 2.5}
                            fontWeight={isSelected ? "bold" : "500"}
                            fill={color}
                          >
                            {name}
                          </text>
                          {pincode && (
                            <text
                              x={x + w / 2} y={y + h / 2 + 3}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={2}
                              fill="hsl(var(--muted-foreground))"
                            >
                              {pincode} · {count} roles
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Pincode List */}
            <div className="space-y-3">
              {pincodeLoading ? (
                <p className="text-sm text-muted-foreground p-4">Loading...</p>
              ) : filteredPincodes.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No pincodes found</p>
              ) : (
                filteredPincodes.map(([pin, group]) => (
                  <Card
                    key={pin}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openPincodeDialog(pin)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{pin} — {group.locality}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {(["calling_agent", "lead_taker", "kam", "admin"] as const).map(role => {
                              const count = group.mappings.filter(m => m.role === role).length;
                              if (count === 0) return null;
                              return (
                                <Badge key={role} variant="outline" className={`text-[10px] ${roleBadgeColors[role]}`}>
                                  {roleLabels[role]}: {count}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                        <Users className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== SKU SPECS TAB ===== */}
        <TabsContent value="sku" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Per-unit grammage mapped to SKU name and lot size</p>
            <Button size="sm" onClick={() => setAddSkuOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add SKU
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">SKU ID</TableHead>
                    <TableHead className="text-xs">Grammage (g)</TableHead>
                    <TableHead className="text-xs">SKU Name</TableHead>
                    <TableHead className="text-xs">Lot Size (kg)</TableHead>
                    <TableHead className="text-xs">Box Count</TableHead>
                    <TableHead className="text-xs w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skuLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : skuData.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No SKU mappings</TableCell></TableRow>
                  ) : (
                    skuData.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs font-mono text-muted-foreground">{s.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm font-medium">{s.grammage}g</TableCell>
                        <TableCell className="text-sm">{s.sku_name}</TableCell>
                        <TableCell className="text-sm">{s.lot_size ?? <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning">Custom needed</Badge>}</TableCell>
                        <TableCell className="text-sm">{s.box_count ?? "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteSku(s.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== STAGE MAPPING TAB ===== */}
        <TabsContent value="stage" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Customer consumption days → Avocado ripening stage</p>
            <Button size="sm" onClick={() => { setEditStage(null); setNewStageNumber(""); setNewStageDesc(""); setNewDaysMin(""); setNewDaysMax(""); setAddStageOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Stage
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stageLoading ? (
              <p className="text-sm text-muted-foreground col-span-full text-center p-4">Loading...</p>
            ) : stageData.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full text-center p-4">No stage mappings</p>
            ) : (
              stageData.map(s => {
                const stageColors = ["", "bg-green-100 border-green-300", "bg-yellow-100 border-yellow-300", "bg-orange-100 border-orange-300", "bg-red-100 border-red-300"];
                return (
                  <Card key={s.id} className={`border-2 ${stageColors[s.stage_number] || ""}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs font-bold">
                          Stage {s.stage_number}
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEditStage(s)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteStage(s.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{s.stage_description}</p>
                      <p className="text-xs text-muted-foreground">
                        Consumption: {s.consumption_days_min}–{s.consumption_days_max >= 99 ? "∞" : s.consumption_days_max} days
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Stage visual timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ripening Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1">
                {stageData.map(s => {
                  const colors = ["", "bg-green-500", "bg-yellow-500", "bg-orange-500", "bg-red-500"];
                  const width = s.stage_number === 1 ? "flex-[2]" : "flex-1";
                  return (
                    <div key={s.id} className={`${width} space-y-1`}>
                      <div className={`h-3 rounded-full ${colors[s.stage_number]}`} />
                      <p className="text-[10px] text-center font-medium">Stage {s.stage_number}</p>
                      <p className="text-[9px] text-center text-muted-foreground">{s.consumption_days_min}-{s.consumption_days_max >= 99 ? "∞" : s.consumption_days_max}d</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pincode Detail Dialog */}
      <Dialog open={pincodeDialogOpen} onOpenChange={setPincodeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {selectedPincode} — {selectedPincodeData?.locality}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(["calling_agent", "lead_taker", "kam", "admin"] as const).map(role => {
              const mappings = selectedPincodeData?.mappings.filter(m => m.role === role) || [];
              return (
                <div key={role} className="space-y-1.5">
                  <p className="text-xs font-medium flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${roleBadgeColors[role]}`}>
                      {roleLabels[role]}
                    </Badge>
                    <span className="text-muted-foreground">({mappings.length})</span>
                  </p>
                  {mappings.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-2">No assignments</p>
                  ) : (
                    <div className="space-y-1 pl-2">
                      {mappings.map(m => (
                        <div key={m.id} className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1.5 rounded">
                          <span>{m.user_email}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteMapping(m.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { setPincodeDialogOpen(false); setAddMappingOpen(true); if (selectedPincode) { setNewPincode(selectedPincode); setNewLocality(selectedPincodeData?.locality || ""); } }}>
              <Plus className="w-3 h-3 mr-1" /> Add Role to this Pincode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Pincode Mapping Dialog */}
      <Dialog open={addMappingOpen} onOpenChange={setAddMappingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Pincode Mapping</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Pincode *</Label>
                <Input value={newPincode} onChange={e => setNewPincode(e.target.value)} className="h-8 text-xs" placeholder="560034" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Locality *</Label>
                <Input value={newLocality} onChange={e => setNewLocality(e.target.value)} className="h-8 text-xs" placeholder="Koramangala" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role *</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="calling_agent">Calling Agent</SelectItem>
                  <SelectItem value="lead_taker">Lead Taker</SelectItem>
                  <SelectItem value="kam">KAM</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">User Email *</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-8 text-xs" placeholder="user@ninjacart.com" />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={handleAddMapping} disabled={!newPincode || !newLocality || !newRole || !newEmail}>
              Add Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add SKU Dialog */}
      <Dialog open={addSkuOpen} onOpenChange={setAddSkuOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add SKU Mapping</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Grammage (g) *</Label>
                <Input type="number" value={newGrammage} onChange={e => setNewGrammage(e.target.value)} className="h-8 text-xs" placeholder="150" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">SKU Name *</Label>
                <Input value={newSkuName} onChange={e => setNewSkuName(e.target.value)} className="h-8 text-xs" placeholder="Hass Avocado 150g" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Lot Size (kg)</Label>
                <Input type="number" value={newLotSize} onChange={e => setNewLotSize(e.target.value)} className="h-8 text-xs" placeholder="4" />
                <p className="text-[10px] text-muted-foreground">Leave empty for custom lot size (needs category team review)</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Box Count</Label>
                <Input type="number" value={newBoxCount} onChange={e => setNewBoxCount(e.target.value)} className="h-8 text-xs" placeholder="20" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={handleAddSku} disabled={!newGrammage || !newSkuName}>
              Add SKU
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Stage Dialog */}
      <Dialog open={addStageOpen || !!editStage} onOpenChange={(open) => { if (!open) { setAddStageOpen(false); setEditStage(null); setNewStageNumber(""); setNewStageDesc(""); setNewDaysMin(""); setNewDaysMax(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editStage ? "Edit Stage Mapping" : "Add Stage Mapping"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Stage Number *</Label>
                <Input type="number" value={newStageNumber} onChange={e => setNewStageNumber(e.target.value)} className="h-8 text-xs" placeholder="1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stage Description *</Label>
                <Input value={newStageDesc} onChange={e => setNewStageDesc(e.target.value)} className="h-8 text-xs" placeholder="Hard Green (Fresh Import)" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Consumption Days Min *</Label>
                <Input type="number" value={newDaysMin} onChange={e => setNewDaysMin(e.target.value)} className="h-8 text-xs" placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Consumption Days Max *</Label>
                <Input type="number" value={newDaysMax} onChange={e => setNewDaysMax(e.target.value)} className="h-8 text-xs" placeholder="1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={editStage ? handleEditStage : handleAddStage} disabled={!newStageNumber || !newStageDesc || !newDaysMin || !newDaysMax}>
              {editStage ? "Save Changes" : "Add Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// FunnelView moved to FunnelViewPage.tsx