import { useState, useMemo, useEffect } from "react";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLeads } from "@/hooks/useLeads";
import { useProspects } from "@/hooks/useProspects";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, CalendarIcon, ShieldCheck, ShieldAlert, ShieldX, Upload, CheckCircle2, RefreshCw, XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import MapPinPicker from "@/components/MapPinPicker";
import PhotoCapture from "@/components/PhotoCapture";

const tagColors: Record<string, string> = {
  New: "bg-info/10 text-info border-info/20",
  "In Progress": "bg-accent/10 text-accent border-accent/20",
  Qualified: "bg-success/10 text-success border-success/20",
  Rescheduled: "bg-warning/10 text-warning border-warning/20",
  Dropped: "bg-destructive/10 text-destructive border-destructive/20",
};

const verificationColors: Record<string, string> = {
  Verified: "bg-success/10 text-success border-success/20",
  Unverified: "bg-warning/10 text-warning border-warning/20",
  Duplicate: "bg-destructive/10 text-destructive border-destructive/20",
};

async function uploadDoc(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from("photos").getPublicUrl(path);
  return data.publicUrl;
}

export default function LeadsPage() {
  const { leads, loading: leadsLoading, addLead, updateLead, refetch: refetchLeads } = useLeads();
  const { prospects, loading: prospectsLoading, updateProspect } = useProspects();
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<"available" | "revisit" | "dropouts" | "leads">("available");
  const [search, setSearch] = useState("");
  const [filterLocality, setFilterLocality] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [userPincodes, setUserPincodes] = useState<string[]>([]);

  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createLeadProspectId, setCreateLeadProspectId] = useState<string | null>(null);

  const [markDropoutOpen, setMarkDropoutOpen] = useState(false);
  const [markDropoutProspectId, setMarkDropoutProspectId] = useState<string | null>(null);
  const [dropoutReason, setDropoutReason] = useState("");
  const [dropoutInfo, setDropoutInfo] = useState("");
  const [dropoutReasons, setDropoutReasons] = useState<string[]>([]);

  // Re-assign state for step 2
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignProspectId, setReassignProspectId] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [reassignUserSearch, setReassignUserSearch] = useState("");
  const [allUsers, setAllUsers] = useState<{ email: string; full_name: string | null }[]>([]);

  useEffect(() => {
    supabase.from("drop_reasons").select("reason_text").in("step_number", [1, 2]).eq("is_active", true)
      .then(({ data }) => setDropoutReasons(data?.map(d => d.reason_text) || []));
    supabase.from("profiles").select("email, full_name").then(({ data }) => {
      if (data) setAllUsers(data.filter(u => u.email));
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchPincodes = async () => {
      const { data: profile } = await supabase.from("profiles").select("email").eq("user_id", user.id).maybeSingle();
      if (!profile?.email) return;
      if (userRole === "admin") {
        setUserPincodes([]);
      } else {
        const { data } = await supabase.from("pincode_persona_map").select("pincode").eq("user_email", profile.email);
        setUserPincodes(data?.map((d) => d.pincode) || []);
      }
    };
    fetchPincodes();
  }, [user, userRole]);

  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [revisitDate, setRevisitDate] = useState<Date | undefined>();
  const [revisitTime, setRevisitTime] = useState("");

  const [addNewLeadOpen, setAddNewLeadOpen] = useState(false);

  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [gstCertUrl, setGstCertUrl] = useState<string | null>(null);
  const [panCardUrl, setPanCardUrl] = useState<string | null>(null);
  const [gstCertUploading, setGstCertUploading] = useState(false);
  const [panCardUploading, setPanCardUploading] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyResult, setVerifyResult] = useState<"Verified" | "Unverified" | "Duplicate" | null>(null);
  const [selectedVerify, setSelectedVerify] = useState<"Verified" | "Unverified" | "Duplicate">("Verified");

  const [form, setForm] = useState({
    client_name: "", outlet_address: "", pincode: "", locality: "",
    contact_number: "", gst_id: "", pan_number: "",
    purchase_manager_name: "", pm_contact: "", email: "", instagram_url: "", linkedin_url: "", swiggy_zomato_url: "", others_info: "",
    avocado_consumption: "", avocado_variety: "", current_supplier: "", estimated_monthly_spend: "",
    franchised: false,
    appointment_date: "", appointment_time: "",
    remarks: "",
    verification_status: "",
    verification_note: "",
  });

  const resetForm = () => {
    setForm({
      client_name: "", outlet_address: "", pincode: "", locality: "",
      contact_number: "", gst_id: "", pan_number: "",
      purchase_manager_name: "", pm_contact: "", email: "", instagram_url: "", linkedin_url: "", swiggy_zomato_url: "", others_info: "",
      avocado_consumption: "", avocado_variety: "", current_supplier: "", estimated_monthly_spend: "",
      franchised: false,
      appointment_date: "", appointment_time: "",
      remarks: "",
      verification_status: "",
      verification_note: "",
    });
    setPinLat(null);
    setPinLng(null);
    setPhotoUrl(null);
    setGstCertUrl(null);
    setPanCardUrl(null);
    setVerifyResult(null);
  };

  const myProspects = useMemo(() => {
    if (userRole === "admin") {
      return prospects.filter(p => p.status === "assigned");
    }
    return prospects.filter(p => p.mapped_to === user?.email && p.status === "assigned");
  }, [prospects, user, userRole]);

  const availableProspects = useMemo(() => {
    let list = myProspects.filter(p => !p.tag || p.tag === "New");
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.restaurant_name.toLowerCase().includes(s) || p.locality.toLowerCase().includes(s));
    }
    if (filterLocality && filterLocality !== "all") list = list.filter(p => p.locality === filterLocality);
    if (filterAgent && filterAgent !== "all") list = list.filter(p => p.mapped_to === filterAgent);
    return list;
  }, [myProspects, search, filterLocality, filterAgent]);

  const revisitProspects = useMemo(() => {
    let list = myProspects.filter(p => p.tag === "In Progress" || p.tag === "Rescheduled");
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.restaurant_name.toLowerCase().includes(s) || p.locality.toLowerCase().includes(s));
    }
    if (filterLocality && filterLocality !== "all") list = list.filter(p => p.locality === filterLocality);
    if (filterAgent && filterAgent !== "all") list = list.filter(p => p.mapped_to === filterAgent);
    return list;
  }, [myProspects, search, filterLocality, filterAgent]);

  const droppedProspects = useMemo(() => {
    let list = myProspects.filter(p => p.tag === "Dropped");
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.restaurant_name.toLowerCase().includes(s) || p.locality.toLowerCase().includes(s));
    }
    if (filterLocality && filterLocality !== "all") list = list.filter(p => p.locality === filterLocality);
    if (filterAgent && filterAgent !== "all") list = list.filter(p => p.mapped_to === filterAgent);
    return list;
  }, [myProspects, search, filterLocality, filterAgent]);

  const localities = useMemo(() => {
    const fromProspects = myProspects.map(p => p.locality);
    const fromLeads = leads.map(l => l.locality);
    return [...new Set([...fromProspects, ...fromLeads])].filter(Boolean).sort();
  }, [myProspects, leads]);

  const agents = useMemo(() => {
    const set = new Set<string>();
    myProspects.forEach(p => { if (p.mapped_to) set.add(p.mapped_to); });
    leads.forEach(l => { if (l.created_by) set.add(l.created_by); });
    return [...set].sort();
  }, [myProspects, leads]);

  const filteredLeads = useMemo(() => {
    let list = leads;
    if (userRole !== "admin" && userPincodes.length > 0) {
      list = list.filter(l => userPincodes.includes(l.pincode));
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(l =>
        l.client_name.toLowerCase().includes(s) ||
        (l.locality || "").toLowerCase().includes(s) ||
        l.pincode.includes(s)
      );
    }
    if (filterLocality && filterLocality !== "all") list = list.filter(l => l.locality === filterLocality);
    if (filterAgent && filterAgent !== "all") list = list.filter(l => l.created_by === filterAgent);
    return list;
  }, [leads, userRole, userPincodes, search, filterLocality, filterAgent]);

  const counts = useMemo(() => ({
    available: myProspects.filter(p => !p.tag || p.tag === "New").length,
    revisit: myProspects.filter(p => p.tag === "In Progress" || p.tag === "Rescheduled").length,
    dropouts: myProspects.filter(p => p.tag === "Dropped").length,
    leads: filteredLeads.length,
  }), [myProspects, filteredLeads]);

  const getLeadForProspect = (prospectId: string) => {
    return leads.find(l => l.prospect_id === prospectId);
  };

  const openCreateLead = (prospectId: string) => {
    const p = prospects.find(pr => pr.id === prospectId);
    resetForm();
    if (p) {
      setForm(f => ({
        ...f,
        client_name: p.restaurant_name,
        outlet_address: p.location || "",
        pincode: p.pincode,
        locality: p.locality,
      }));
      if (p.geo_lat && p.geo_lng) {
        setPinLat(Number(p.geo_lat));
        setPinLng(Number(p.geo_lng));
      }
    }
    setCreateLeadProspectId(prospectId);
    setCreateLeadOpen(true);
  };

  const openAddNewLead = () => {
    resetForm();
    setCreateLeadProspectId(null);
    setAddNewLeadOpen(true);
  };

  const getIncrementField = () => {
    if (userRole === "calling_agent") return "call_count";
    return "visit_count";
  };

  const buildLeadPayload = (extraFields = {}) => {
    const field = getIncrementField();
    const existingLead = createLeadProspectId ? getLeadForProspect(createLeadProspectId) : null;
    const currentCount = existingLead ? ((existingLead as any)[field] || 0) : 0;
    return {
      client_name: form.client_name,
      pincode: form.pincode,
      locality: form.locality || null,
      outlet_address: form.outlet_address || null,
      contact_number: form.contact_number || null,
      gst_id: form.gst_id || null,
      gst_cert_url: gstCertUrl,
      pan_number: form.pan_number || null,
      pan_card_url: panCardUrl,
      verification_status: form.verification_status || null,
      verification_note: form.verification_note || null,
      purchase_manager_name: form.purchase_manager_name || null,
      pm_contact: form.pm_contact || null,
      avocado_consumption: form.avocado_consumption || null,
      avocado_variety: form.avocado_variety || null,
      current_supplier: form.current_supplier || null,
      estimated_monthly_spend: form.estimated_monthly_spend ? Number(form.estimated_monthly_spend) : null,
      franchised: form.franchised,
      appointment_date: form.appointment_date || null,
      appointment_time: form.appointment_time || null,
      remarks: form.remarks || null,
      prospect_id: createLeadProspectId || null,
      created_by: user?.email || null,
      geo_lat: pinLat,
      geo_lng: pinLng,
      outlet_photo_url: photoUrl,
      call_count: field === "call_count" ? currentCount + 1 : (existingLead?.call_count || 0),
      visit_count: field === "visit_count" ? currentCount + 1 : (existingLead?.visit_count || 0),
      ...extraFields,
    };
  };

  const syncAppointment = async (leadId: string, clientName: string, appointmentDate: string | null, appointmentTime: string | null, apptType = "Call") => {
    if (!appointmentDate) return;
    const { data: profile } = await supabase.from("profiles").select("email").eq("user_id", user?.id || "").maybeSingle();
    await supabase.from("appointments").insert({
      restaurant_name: clientName,
      scheduled_date: appointmentDate,
      scheduled_time: appointmentTime || null,
      appointment_type: apptType,
      entity_id: leadId,
      entity_type: "lead",
      assigned_to: profile?.email || null,
      status: "scheduled",
    });
  };

  const handleSaveLead = async () => {
    if (!form.client_name || !form.pincode) return;
    const payload = { ...buildLeadPayload(), status: "qualified" } as any;
    const ok = await addLead(payload);
    if (ok) {
      if (createLeadProspectId) await updateProspect(createLeadProspectId, { tag: "Qualified" });
      if (payload.appointment_date) {
        const { data: newLead } = await supabase.from("leads").select("id").eq("client_name", payload.client_name).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (newLead?.id) await syncAppointment(newLead.id, payload.client_name, payload.appointment_date, payload.appointment_time);
      }
      toast({ title: "Lead saved — marked as Qualified" });
      resetForm();
      setCreateLeadOpen(false);
      setAddNewLeadOpen(false);
      refetchLeads();
    }
  };

  const handleSaveIncomplete = async () => {
    if (!form.client_name || !form.pincode) return;
    const apptDate = revisitDate ? format(revisitDate, "yyyy-MM-dd") : null;
    const remarksSuffix = apptDate ? `\n[Re-visit: ${format(revisitDate!, "dd MMM yyyy")}${revisitTime ? " " + revisitTime : ""}]` : "";
    const payload = {
      ...buildLeadPayload({
        appointment_date: apptDate,
        appointment_time: revisitTime || null,
        remarks: (form.remarks || "") + remarksSuffix,
      }),
      status: "in_progress",
    } as any;
    const ok = await addLead(payload);
    if (ok) {
      if (createLeadProspectId) await updateProspect(createLeadProspectId, { tag: "In Progress" });
      if (apptDate) {
        const { data: newLead } = await supabase.from("leads").select("id").eq("client_name", payload.client_name).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (newLead?.id) await syncAppointment(newLead.id, payload.client_name, apptDate, revisitTime || null, "Visit");
      }
      toast({ title: "Saved as incomplete — re-visit scheduled" });
      resetForm();
      setCreateLeadOpen(false);
      setAddNewLeadOpen(false);
      setIncompleteOpen(false);
      setRevisitDate(undefined);
      setRevisitTime("");
      refetchLeads();
    }
  };

  const handleMarkDropout = async () => {
    if (!markDropoutProspectId || !dropoutReason) return;
    const isDrop = dropoutReason === "Drop" || !dropoutReasons.includes(dropoutReason) || dropoutReason === dropoutReason;
    const newTag = "Dropped";

    const existingLead = getLeadForProspect(markDropoutProspectId);
    if (existingLead) {
      const field = getIncrementField();
      const remarks = `[Dropout] ${dropoutReason}${dropoutInfo ? ": " + dropoutInfo : ""}`;
      await updateLead(existingLead.id, { [field]: ((existingLead as any)[field] || 0) + 1, remarks });
    }

    await updateProspect(markDropoutProspectId, { tag: newTag });
    toast({ title: "Prospect marked as dropout" });
    setMarkDropoutOpen(false);
    setMarkDropoutProspectId(null);
    setDropoutReason("");
    setDropoutInfo("");
  };

  const filteredReassignUsers = useMemo(() => {
    const s = reassignUserSearch.toLowerCase();
    return allUsers.filter(u => !s || (u.full_name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s));
  }, [allUsers, reassignUserSearch]);

  const openReassignDialog = (prospectId: string) => {
    setReassignProspectId(prospectId);
    setReassignTo("");
    setReassignUserSearch("");
    setReassignOpen(true);
  };

  const handleConfirmReassign = async () => {
    if (!reassignProspectId || !reassignTo) return;
    await updateProspect(reassignProspectId, { status: "assigned", mapped_to: reassignTo, tag: "In Progress" });
    toast({ title: "Prospect re-assigned successfully" });
    setReassignOpen(false);
  };

  const canVerify = !!(form.gst_id || form.pan_number);

  const handleVerifyClick = () => {
    if (!canVerify) return;
    const nextResult: "Verified" | "Unverified" | "Duplicate" =
      !verifyResult ? "Verified" :
      verifyResult === "Verified" ? "Unverified" :
      verifyResult === "Unverified" ? "Duplicate" : "Verified";
    let note = "";
    if (nextResult === "Verified") note = `Contact on record: ${form.contact_number || "N/A"}`;
    else if (nextResult === "Unverified") note = "Entered GST ID and PAN number are not linked";
    else note = "Duplicate entries found";
    setVerifyResult(nextResult);
    setForm(f => ({ ...f, verification_status: nextResult, verification_note: note }));
  };

  const handleDocUpload = async (file: File, type: "gst" | "pan") => {
    const allowed = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only PNG, JPG, or PDF allowed", variant: "destructive" });
      return;
    }
    if (type === "gst") {
      setGstCertUploading(true);
      const url = await uploadDoc(file, "gst-certs");
      setGstCertUrl(url);
      setGstCertUploading(false);
    } else {
      setPanCardUploading(true);
      const url = await uploadDoc(file, "pan-cards");
      setPanCardUrl(url);
      setPanCardUploading(false);
    }
  };

  const loading = prospectsLoading || leadsLoading;

  const renderVerificationResult = () => {
    if (!verifyResult) return null;
    if (verifyResult === "Verified") {
      return (
        <div className="mt-2 p-2.5 rounded-md bg-success/10 border border-success/20 space-y-0.5">
          <div className="flex items-center gap-1.5 text-success text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified
          </div>
          <p className="text-[11px] text-muted-foreground">Contact on record: <strong>{form.contact_number || "N/A"}</strong></p>
        </div>
      );
    }
    if (verifyResult === "Unverified") {
      return (
        <div className="mt-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 space-y-0.5">
          <div className="flex items-center gap-1.5 text-destructive text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" /> Unverified
          </div>
          <p className="text-[11px] text-muted-foreground">Entered GST ID and PAN number are not linked.</p>
        </div>
      );
    }
    if (verifyResult === "Duplicate") {
      return (
        <div className="mt-2 p-2.5 rounded-md bg-warning/10 border border-warning/20 space-y-0.5">
          <div className="flex items-center gap-1.5 text-warning text-xs font-semibold">
            <ShieldX className="w-3.5 h-3.5" /> Duplicate
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">Existing records found:</p>
          <div className="bg-background/60 rounded p-1.5 space-y-0.5">
            <p className="text-[11px] font-mono">• LD-001 — Chai Point, Koramangala</p>
            <p className="text-[11px] font-mono">• LD-002 — Chai Point, Indiranagar</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderKycSection = () => (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-foreground uppercase tracking-wider border-b pb-1">KYC / Identification</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">GST Certificate</Label>
          <div className="relative">
            <input type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" id="gst-cert-input"
              onChange={e => e.target.files?.[0] && handleDocUpload(e.target.files[0], "gst")} />
            <Button type="button" variant="outline" size="sm" className="w-full text-xs h-9 justify-start"
              onClick={() => document.getElementById("gst-cert-input")?.click()} disabled={gstCertUploading}>
              <Upload className="w-3 h-3 mr-1.5" />
              {gstCertUploading ? "Uploading..." : gstCertUrl ? "✓ Uploaded" : "Upload / Capture"}
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">GST IN</Label>
          <Input placeholder="22AAAAA0000A1Z5" value={form.gst_id} onChange={e => setForm(f => ({ ...f, gst_id: e.target.value }))} className="text-xs h-9" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">PAN Card</Label>
          <div className="relative">
            <input type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" id="pan-card-input"
              onChange={e => e.target.files?.[0] && handleDocUpload(e.target.files[0], "pan")} />
            <Button type="button" variant="outline" size="sm" className="w-full text-xs h-9 justify-start"
              onClick={() => document.getElementById("pan-card-input")?.click()} disabled={panCardUploading}>
              <Upload className="w-3 h-3 mr-1.5" />
              {panCardUploading ? "Uploading..." : panCardUrl ? "✓ Uploaded" : "Upload / Capture"}
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">PAN Number</Label>
          <Input placeholder="ABCDE1234F" value={form.pan_number} onChange={e => setForm(f => ({ ...f, pan_number: e.target.value }))} className="text-xs h-9" />
        </div>
      </div>

      <div className="pt-1">
        <Button type="button" size="sm" variant={canVerify ? "default" : "outline"} className="text-xs"
          onClick={handleVerifyClick} disabled={!canVerify}>
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
          Verify Identity
        </Button>
        {renderVerificationResult()}
      </div>
    </div>
  );

  const renderLeadForm = () => (
    <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider border-b pb-1">Basic Info</p>
        <div className="space-y-1">
          <Label className="text-xs">Name *</Label>
          <Input placeholder="Restaurant name" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Pincode *</Label>
            <Input placeholder="560034" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contact Number</Label>
            <Input placeholder="+91..." value={form.contact_number} onChange={e => setForm(f => ({ ...f, contact_number: e.target.value }))} />
          </div>
        </div>
        {(createLeadOpen || addNewLeadOpen) && (
          <MapPinPicker lat={pinLat} lng={pinLng} onLocationSelect={(lat, lng) => { setPinLat(lat); setPinLng(lng); }} />
        )}
      </div>

      <PhotoCapture label="Outlet Photo" required={false} value={photoUrl} onCapture={setPhotoUrl} />

      {renderKycSection()}

      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider border-b pb-1">Contact Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">PM Name</Label>
            <Input placeholder="Name" value={form.purchase_manager_name} onChange={e => setForm(f => ({ ...f, purchase_manager_name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">PM Contact</Label>
            <Input placeholder="Phone" value={form.pm_contact} onChange={e => setForm(f => ({ ...f, pm_contact: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email ID</Label>
          <Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Instagram URL</Label>
            <Input placeholder="https://instagram.com/..." value={form.instagram_url} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">LinkedIn URL</Label>
            <Input placeholder="https://linkedin.com/..." value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Swiggy/Zomato URL</Label>
          <Input placeholder="https://..." value={form.swiggy_zomato_url} onChange={e => setForm(f => ({ ...f, swiggy_zomato_url: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Others</Label>
          <Input placeholder="Any other info" value={form.others_info} onChange={e => setForm(f => ({ ...f, others_info: e.target.value }))} />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider border-b pb-1">Behaviour</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Avocado Consumption</Label>
            <Select value={form.avocado_consumption} onValueChange={v => setForm(f => ({ ...f, avocado_consumption: v }))}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes_imported">Yes - Imported</SelectItem>
                <SelectItem value="yes_indian">Yes - Indian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Current Supplier</Label>
            <Input placeholder="Supplier name" value={form.current_supplier} onChange={e => setForm(f => ({ ...f, current_supplier: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Monthly Spend ₹</Label>
            <Input type="number" placeholder="₹" value={form.estimated_monthly_spend} onChange={e => setForm(f => ({ ...f, estimated_monthly_spend: e.target.value }))} />
          </div>
          <div className="flex items-end pb-1">
            <div className="flex items-center gap-2">
              <Checkbox checked={form.franchised} onCheckedChange={v => setForm(f => ({ ...f, franchised: !!v }))} />
              <Label className="text-xs">Franchised Outlet</Label>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider border-b pb-1">Appointment</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Time</Label>
            <Input type="time" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Remarks</Label>
        <Textarea placeholder="Notes..." value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={2} />
      </div>
    </div>
  );

  const renderProspectRow = (p: typeof prospects[0], showActions: boolean) => {
    const lead = getLeadForProspect(p.id);
    const callCount = lead?.call_count || 0;
    const visitCount = lead?.visit_count || 0;

    return (
      <TableRow key={p.id} className="text-sm">
        <TableCell className="font-medium max-w-[180px] truncate">
          {p.restaurant_name}
          {(tab === "revisit" || tab === "dropouts") && (callCount > 0 || visitCount > 0) && (
            <div className="flex gap-1 mt-0.5">
              {callCount > 0 && (
                <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/20">
                  {callCount} {callCount === 1 ? "call" : "calls"}
                </Badge>
              )}
              {visitCount > 0 && (
                <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">
                  {visitCount} {visitCount === 1 ? "visit" : "visits"}
                </Badge>
              )}
            </div>
          )}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">{p.locality}</TableCell>
        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{p.mapped_to || "—"}</TableCell>
        <TableCell className="text-xs font-mono hidden md:table-cell">{p.pincode}</TableCell>
        {tab === "revisit" && (
          <TableCell className="text-xs text-muted-foreground">{callCount + visitCount}</TableCell>
        )}
        <TableCell>
          {showActions ? (
            <div className="flex gap-1 flex-wrap">
              <Button size="sm" className="text-xs h-7 bg-success hover:bg-success/90 text-success-foreground" onClick={() => openCreateLead(p.id)}><CheckCircle2 className="w-3 h-3 mr-1" /> Log Visit</Button>
              <Button size="sm" className="text-xs h-7 bg-warning hover:bg-warning/90 text-warning-foreground" onClick={() => openReassignDialog(p.id)}><RefreshCw className="w-3 h-3 mr-1" /> Re-assign</Button>
              <Button size="sm" className="text-xs h-7 bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => {
                setMarkDropoutProspectId(p.id);
                setDropoutReason("");
                setDropoutInfo("");
                setMarkDropoutOpen(true);
              }}><XCircle className="w-3 h-3 mr-1" /> Mark Dropout</Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Step 2: Lead Generation</h1>
          <p className="text-sm text-muted-foreground">
            {userRole === "admin" ? "All" : ""} {myProspects.length} assigned prospects · {filteredLeads.length} leads
          </p>
        </div>
        <Button size="sm" onClick={openAddNewLead}><Plus className="w-4 h-4 mr-1" /> Add New Lead</Button>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1">
          <TabsTrigger value="available" className="text-xs">Assigned Prospects ({counts.available})</TabsTrigger>
          <TabsTrigger value="revisit" className="text-xs">Revisit ({counts.revisit})</TabsTrigger>
          <TabsTrigger value="dropouts" className="text-xs">Dropouts ({counts.dropouts})</TabsTrigger>
          <TabsTrigger value="leads" className="text-xs">All Leads ({counts.leads})</TabsTrigger>
        </TabsList>

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
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs"><SelectValue placeholder="All Agents" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Assigned Prospects */}
        <TabsContent value="available" className="mt-3">
          <Card><CardContent className="p-0"><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Locality</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Assigned To</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Pincode</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">Loading...</TableCell></TableRow>
                ) : availableProspects.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">No assigned prospects.</TableCell></TableRow>
                ) : availableProspects.map(p => renderProspectRow(p, true))}
              </TableBody>
            </Table>
          </div></CardContent></Card>
        </TabsContent>

        {/* Revisit */}
        <TabsContent value="revisit" className="mt-3">
          <Card><CardContent className="p-0"><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Locality</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Assigned To</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Pincode</TableHead>
                <TableHead className="text-xs">Visits</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">Loading...</TableCell></TableRow>
                ) : revisitProspects.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">No prospects in revisit queue.</TableCell></TableRow>
                ) : revisitProspects.map(p => renderProspectRow(p, true))}
              </TableBody>
            </Table>
          </div></CardContent></Card>
        </TabsContent>

        {/* Dropouts */}
        <TabsContent value="dropouts" className="mt-3">
          <Card><CardContent className="p-0"><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Locality</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Assigned To</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Pincode</TableHead>
                <TableHead className="text-xs">Visits</TableHead>
                <TableHead className="text-xs">Reason</TableHead>
                <TableHead className="text-xs">Info</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">Loading...</TableCell></TableRow>
                ) : droppedProspects.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">No dropouts.</TableCell></TableRow>
                ) : droppedProspects.map(p => {
                  const lead = getLeadForProspect(p.id);
                  const callCount = lead?.call_count || 0;
                  const visitCount = lead?.visit_count || 0;
                  const totalAttempts = callCount + visitCount;
                  // parse reason and info from remarks
                  const remarksStr = lead?.remarks || "";
                  const dropMatch = remarksStr.match(/\[Dropout\]\s*([^:]+)(?::\s*(.*))?/);
                  const parsedReason = dropMatch ? dropMatch[1].trim() : "—";
                  const parsedInfo = dropMatch?.[2]?.trim() || "—";
                  return (
                    <TableRow key={p.id} className="text-sm">
                      <TableCell className="font-medium max-w-[180px] truncate">{p.restaurant_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.locality}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{p.mapped_to || "—"}</TableCell>
                      <TableCell className="text-xs font-mono hidden md:table-cell">{p.pincode}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {callCount > 0 && <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/20">{callCount}c</Badge>}
                          {visitCount > 0 && <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">{visitCount}v</Badge>}
                          {totalAttempts === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{parsedReason}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{parsedInfo}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div></CardContent></Card>
        </TabsContent>

        {/* All Leads */}
        <TabsContent value="leads" className="mt-3">
          <Card><CardContent className="p-0"><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Locality</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Assigned To</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Pincode</TableHead>
                <TableHead className="text-xs">KYC</TableHead>
                <TableHead className="text-xs">Visits</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">Loading...</TableCell></TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">No leads found.</TableCell></TableRow>
                ) : filteredLeads.map(l => {
                  const vs = (l as any).verification_status as string | null;
                  return (
                    <TableRow key={l.id} className="text-sm">
                      <TableCell className="font-medium max-w-[180px] truncate">{l.client_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.locality || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{l.created_by || "—"}</TableCell>
                      <TableCell className="text-xs font-mono hidden sm:table-cell">{l.pincode}</TableCell>
                      <TableCell>
                        {vs ? (
                          <Badge variant="outline" className={`text-[10px] ${verificationColors[vs] || ""}`}>{vs}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(l.visit_count || 0) > 0 && <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">{l.visit_count}v</Badge>}
                          {(l.call_count || 0) > 0 && <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/20">{l.call_count}c</Badge>}
                          {((l.visit_count || 0) + (l.call_count || 0)) === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div></CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Create Lead Dialog */}
      <Dialog open={createLeadOpen} onOpenChange={open => { if (!open) { setCreateLeadOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Visit / Create Lead</DialogTitle></DialogHeader>
          {renderLeadForm()}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setIncompleteOpen(true)} disabled={!form.client_name || !form.pincode}>
              <CalendarIcon className="w-3 h-3 mr-1" /> Save as Incomplete
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
              <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={handleSaveLead} disabled={!form.client_name || !form.pincode}>Log Visit</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Lead Dialog */}
      <Dialog open={addNewLeadOpen} onOpenChange={open => { if (!open) { setAddNewLeadOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
          {renderLeadForm()}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setIncompleteOpen(true)} disabled={!form.client_name || !form.pincode}>
              <CalendarIcon className="w-3 h-3 mr-1" /> Save as Incomplete
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
              <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={handleSaveLead} disabled={!form.client_name || !form.pincode}>Log Visit</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incomplete - Date/Time Picker */}
      <Dialog open={incompleteOpen} onOpenChange={setIncompleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Schedule Re-visit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-center">
              <Calendar mode="single" selected={revisitDate} onSelect={setRevisitDate} initialFocus className="p-3 pointer-events-auto" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Time (optional)</Label>
              <Input type="time" value={revisitTime} onChange={e => setRevisitTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleSaveIncomplete} disabled={!revisitDate}>Confirm & Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Dropout Dialog */}
      <Dialog open={markDropoutOpen} onOpenChange={open => { if (!open) { setMarkDropoutOpen(false); setMarkDropoutProspectId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Mark Dropout</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Reason *</Label>
              <RadioGroup value={dropoutReason} onValueChange={setDropoutReason} className="space-y-2">
                {dropoutReasons.map((reason, i) => (
                  <div key={reason} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason} id={`dropout-reason-${i}`} />
                    <Label htmlFor={`dropout-reason-${i}`} className="text-sm">{reason}</Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Drop" id="dropout-reason-drop" />
                  <Label htmlFor="dropout-reason-drop" className="text-sm">Drop</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Additional Info</Label>
              <Textarea placeholder="Brief notes..." rows={2} value={dropoutInfo} onChange={e => setDropoutInfo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleMarkDropout} disabled={!dropoutReason}>Mark Dropout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-assign Dialog - direct agent list */}
      <Dialog open={reassignOpen} onOpenChange={open => { if (!open) setReassignOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Re-assign Prospect</DialogTitle>
            <p className="text-xs text-muted-foreground">Select an agent to re-assign this prospect to</p>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Search agents..." value={reassignUserSearch} onChange={e => setReassignUserSearch(e.target.value)} className="h-8 text-xs" />
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {filteredReassignUsers.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground text-center">No users found</p>
              ) : (
                filteredReassignUsers.map(u => (
                  <button
                    key={u.email}
                    className={cn("w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b last:border-b-0",
                      reassignTo === u.email && "bg-primary/10 text-primary"
                    )}
                    onClick={() => setReassignTo(u.email!)}
                  >
                    <span className="font-medium">{u.full_name || u.email}</span>
                    {u.full_name && <span className="text-muted-foreground ml-2">{u.email}</span>}
                  </button>
                ))
              )}
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
