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
  Plus, Search, CalendarIcon, ShieldCheck, ShieldAlert, ShieldX, Upload,
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

// Simple file upload helper for docs
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
  const [userPincodes, setUserPincodes] = useState<string[]>([]);

  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createLeadProspectId, setCreateLeadProspectId] = useState<string | null>(null);

  const [unsuccessfulOpen, setUnsuccessfulOpen] = useState(false);
  const [unsuccessfulProspectId, setUnsuccessfulProspectId] = useState<string | null>(null);
  const [unsuccessfulReason, setUnsuccessfulReason] = useState("");
  const [unsuccessfulRemarks, setUnsuccessfulRemarks] = useState("");
  const [unsuccessfulReasons, setUnsuccessfulReasons] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("drop_reasons").select("reason_text").in("step_number", [1, 2]).eq("is_active", true)
      .then(({ data }) => setUnsuccessfulReasons(data?.map(d => d.reason_text) || []));
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

  // Map pin state
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);

  // Photo state (optional in Step 2)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // KYC states
  const [gstCertUrl, setGstCertUrl] = useState<string | null>(null);
  const [panCardUrl, setPanCardUrl] = useState<string | null>(null);
  const [gstCertUploading, setGstCertUploading] = useState(false);
  const [panCardUploading, setPanCardUploading] = useState(false);

  // Verification dialog
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
    return list;
  }, [myProspects, search, filterLocality]);

  const revisitProspects = useMemo(() => {
    let list = myProspects.filter(p => p.tag === "In Progress" || p.tag === "Rescheduled");
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.restaurant_name.toLowerCase().includes(s) || p.locality.toLowerCase().includes(s));
    }
    if (filterLocality && filterLocality !== "all") list = list.filter(p => p.locality === filterLocality);
    return list;
  }, [myProspects, search, filterLocality]);

  const droppedProspects = useMemo(() => {
    let list = myProspects.filter(p => p.tag === "Dropped");
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.restaurant_name.toLowerCase().includes(s) || p.locality.toLowerCase().includes(s));
    }
    if (filterLocality && filterLocality !== "all") list = list.filter(p => p.locality === filterLocality);
    return list;
  }, [myProspects, search, filterLocality]);

  const localities = useMemo(() => {
    const fromProspects = myProspects.map(p => p.locality);
    const fromLeads = leads.map(l => l.locality);
    return [...new Set([...fromProspects, ...fromLeads])].filter(Boolean).sort();
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
    return list;
  }, [leads, userRole, userPincodes, search, filterLocality]);

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
      // Sync appointment to calendar
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
      // Sync revisit appointment to calendar
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

  const handleLogUnsuccessful = async () => {
    if (!unsuccessfulProspectId || !unsuccessfulReason || !unsuccessfulRemarks) return;
    const isDrop = unsuccessfulReason === "Drop";
    const newTag = isDrop ? "Dropped" : "Rescheduled";

    const existingLead = getLeadForProspect(unsuccessfulProspectId);
    if (existingLead) {
      const field = getIncrementField();
      await updateLead(existingLead.id, { [field]: ((existingLead as any)[field] || 0) + 1 });
    }

    await updateProspect(unsuccessfulProspectId, { tag: newTag });
    toast({ title: isDrop ? "Prospect dropped" : "Prospect rescheduled" });
    setUnsuccessfulOpen(false);
    setUnsuccessfulProspectId(null);
    setUnsuccessfulReason("");
    setUnsuccessfulRemarks("");
  };

  const canVerify = !!(form.gst_id || form.pan_number);

  const handleVerifyClick = () => {
    if (!canVerify) return;
    setSelectedVerify("Verified");
    setVerifyOpen(true);
  };

  const handleConfirmVerify = () => {
    let note = "";
    if (selectedVerify === "Verified") {
      const contactDisplay = form.contact_number || "XXXXXXXXXX";
      note = `Contact on record: ${contactDisplay}`;
    } else if (selectedVerify === "Unverified") {
      note = "Entered GST ID and PAN number are not linked";
    } else if (selectedVerify === "Duplicate") {
      note = "Duplicate entries found";
    }
    setVerifyResult(selectedVerify);
    setForm(f => ({ ...f, verification_status: selectedVerify, verification_note: note }));
    setVerifyOpen(false);
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

  const renderVerificationBadge = () => {
    if (!verifyResult) return null;
    const colors = verificationColors[verifyResult] || "";
    const icons = {
      Verified: <ShieldCheck className="w-3 h-3 mr-1" />,
      Unverified: <ShieldAlert className="w-3 h-3 mr-1" />,
      Duplicate: <ShieldX className="w-3 h-3 mr-1" />,
    };
    return (
      <Badge variant="outline" className={`text-[11px] flex items-center ${colors}`}>
        {icons[verifyResult]}{verifyResult}
      </Badge>
    );
  };

  const renderKycSection = () => (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-foreground uppercase tracking-wider border-b pb-1">KYC / Identification</p>

      {/* GST row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">GST Certificate</Label>
          <div className="relative">
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              className="hidden"
              id="gst-cert-input"
              onChange={e => e.target.files?.[0] && handleDocUpload(e.target.files[0], "gst")}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs h-9 justify-start"
              onClick={() => document.getElementById("gst-cert-input")?.click()}
              disabled={gstCertUploading}
            >
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

      {/* PAN row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">PAN Card</Label>
          <div className="relative">
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              className="hidden"
              id="pan-card-input"
              onChange={e => e.target.files?.[0] && handleDocUpload(e.target.files[0], "pan")}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs h-9 justify-start"
              onClick={() => document.getElementById("pan-card-input")?.click()}
              disabled={panCardUploading}
            >
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

      {/* Verify CTA */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          type="button"
          size="sm"
          variant={canVerify ? "default" : "outline"}
          className="text-xs"
          onClick={handleVerifyClick}
          disabled={!canVerify}
        >
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
          Verify Identity
        </Button>
        {renderVerificationBadge()}
        {verifyResult && form.verification_note && (
          <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">{form.verification_note}</span>
        )}
      </div>
    </div>
  );

  const renderLeadForm = () => (
    <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
      {/* Section 1: Basic Info */}
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

        {/* Map Pin Picker */}
        {(createLeadOpen || addNewLeadOpen) && (
          <MapPinPicker lat={pinLat} lng={pinLng} onLocationSelect={(lat, lng) => { setPinLat(lat); setPinLng(lng); }} />
        )}
      </div>

      {/* Photo Capture (optional) */}
      <PhotoCapture label="Outlet Photo" required={false} value={photoUrl} onCapture={setPhotoUrl} />

      {/* KYC Section */}
      {renderKycSection()}

      {/* Section 2: Contact Details */}
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

      {/* Section 3: Behaviour */}
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

      {/* Section 4: Appointment */}
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

      {/* Section 5: Remarks */}
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
        <TableCell className="text-xs font-mono hidden sm:table-cell">{p.pincode}</TableCell>
        {tab === "revisit" && (
          <TableCell className="text-xs text-muted-foreground">{callCount + visitCount}</TableCell>
        )}
        <TableCell>
          {showActions ? (
            <div className="flex gap-1 flex-wrap">
              <Button size="sm" className="text-xs h-7" onClick={() => openCreateLead(p.id)}>Create Lead</Button>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                setUnsuccessfulProspectId(p.id);
                setUnsuccessfulReason("");
                setUnsuccessfulRemarks("");
                setUnsuccessfulOpen(true);
              }}>Log Unsuccessful</Button>
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
          <TabsTrigger value="available" className="text-xs">Available Prospects ({counts.available})</TabsTrigger>
          <TabsTrigger value="revisit" className="text-xs">Revisit ({counts.revisit})</TabsTrigger>
          <TabsTrigger value="dropouts" className="text-xs">Drop-outs ({counts.dropouts})</TabsTrigger>
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
        </div>

        {/* Available */}
        <TabsContent value="available" className="mt-3">
          <Card><CardContent className="p-0"><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Locality</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Pincode</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">Loading...</TableCell></TableRow>
                ) : availableProspects.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">No available prospects assigned to you.</TableCell></TableRow>
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
                <TableHead className="text-xs hidden sm:table-cell">Pincode</TableHead>
                <TableHead className="text-xs">Attempts</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">Loading...</TableCell></TableRow>
                ) : revisitProspects.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">No prospects in revisit queue.</TableCell></TableRow>
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
                <TableHead className="text-xs hidden sm:table-cell">Pincode</TableHead>
                <TableHead className="text-xs">Attempts</TableHead>
                <TableHead className="text-xs">Remarks</TableHead>
                <TableHead className="text-xs">Info</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">Loading...</TableCell></TableRow>
                ) : droppedProspects.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">No dropped prospects.</TableCell></TableRow>
                ) : droppedProspects.map(p => {
                  const lead = getLeadForProspect(p.id);
                  const callCount = lead?.call_count || 0;
                  const visitCount = lead?.visit_count || 0;
                  const totalAttempts = callCount + visitCount;
                  return (
                    <TableRow key={p.id} className="text-sm">
                      <TableCell className="font-medium max-w-[180px] truncate">{p.restaurant_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.locality}</TableCell>
                      <TableCell className="text-xs font-mono hidden sm:table-cell">{p.pincode}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {callCount > 0 && <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/20">{callCount} {callCount === 1 ? "call" : "calls"}</Badge>}
                          {visitCount > 0 && <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">{visitCount} {visitCount === 1 ? "visit" : "visits"}</Badge>}
                          {totalAttempts === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{lead?.remarks || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">Dropped</Badge></TableCell>
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
                <TableHead className="text-xs hidden sm:table-cell">Pincode</TableHead>
                <TableHead className="text-xs">KYC</TableHead>
                <TableHead className="text-xs">Visits</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">Loading...</TableCell></TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">No leads found.</TableCell></TableRow>
                ) : filteredLeads.map(l => {
                  const vs = (l as any).verification_status as string | null;
                  return (
                    <TableRow key={l.id} className="text-sm">
                      <TableCell className="font-medium max-w-[180px] truncate">{l.client_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.locality || "—"}</TableCell>
                      <TableCell className="text-xs font-mono hidden sm:table-cell">{l.pincode}</TableCell>
                      <TableCell>
                        {vs ? (
                          <Badge variant="outline" className={`text-[10px] ${verificationColors[vs] || ""}`}>{vs}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(l.visit_count || 0) > 0 && <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">{l.visit_count} visit{(l.visit_count || 0) === 1 ? "" : "s"}</Badge>}
                          {(l.call_count || 0) > 0 && <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/20">{l.call_count} call{(l.call_count || 0) === 1 ? "" : "s"}</Badge>}
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
          <DialogHeader><DialogTitle>Create Lead</DialogTitle></DialogHeader>
          {renderLeadForm()}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setIncompleteOpen(true)} disabled={!form.client_name || !form.pincode}>
              <CalendarIcon className="w-3 h-3 mr-1" /> Save as Incomplete
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
              <Button size="sm" onClick={handleSaveLead} disabled={!form.client_name || !form.pincode}>Save Lead</Button>
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
              <Button size="sm" onClick={handleSaveLead} disabled={!form.client_name || !form.pincode}>Save Lead</Button>
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

      {/* Log Unsuccessful */}
      <Dialog open={unsuccessfulOpen} onOpenChange={open => { if (!open) { setUnsuccessfulOpen(false); setUnsuccessfulProspectId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Log Unsuccessful Attempt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Reason *</Label>
              <RadioGroup value={unsuccessfulReason} onValueChange={setUnsuccessfulReason} className="space-y-2">
                {unsuccessfulReasons.map((reason, i) => (
                  <div key={reason} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason} id={`reason-${i}`} />
                    <Label htmlFor={`reason-${i}`} className="text-sm">{reason}</Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Drop" id="reason-drop" />
                  <Label htmlFor="reason-drop" className="text-sm">Drop</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remarks *</Label>
              <Textarea placeholder="Brief notes..." rows={2} value={unsuccessfulRemarks} onChange={e => setUnsuccessfulRemarks(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleLogUnsuccessful} disabled={!unsuccessfulReason || !unsuccessfulRemarks}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Identity Dialog */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Identity Verification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-xs text-muted-foreground">Select verification result for this lead:</p>
            <RadioGroup value={selectedVerify} onValueChange={v => setSelectedVerify(v as any)} className="space-y-3">
              <div className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/40" onClick={() => setSelectedVerify("Verified")}>
                <RadioGroupItem value="Verified" id="v-verified" />
                <div>
                  <Label htmlFor="v-verified" className="text-sm font-medium cursor-pointer">✅ Verified</Label>
                  <p className="text-[11px] text-muted-foreground">Contact on record: {form.contact_number || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/40" onClick={() => setSelectedVerify("Unverified")}>
                <RadioGroupItem value="Unverified" id="v-unverified" />
                <div>
                  <Label htmlFor="v-unverified" className="text-sm font-medium cursor-pointer">⚠️ Unverified</Label>
                  <p className="text-[11px] text-muted-foreground">Entered GST ID and PAN number are not linked</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/40" onClick={() => setSelectedVerify("Duplicate")}>
                <RadioGroupItem value="Duplicate" id="v-duplicate" />
                <div>
                  <Label htmlFor="v-duplicate" className="text-sm font-medium cursor-pointer">🔁 Duplicate</Label>
                  <div className="mt-1 space-y-1">
                    <p className="text-[11px] text-muted-foreground font-medium">Existing records found:</p>
                    <div className="bg-muted/50 rounded p-1.5 space-y-0.5">
                      <p className="text-[11px] font-mono">• LD-001 — Chai Point, Koramangala</p>
                      <p className="text-[11px] font-mono">• LD-002 — Chai Point, Indiranagar</p>
                    </div>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleConfirmVerify}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
