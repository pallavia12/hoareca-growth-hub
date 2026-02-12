import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useAgreements, useDistributionPartners, useDeliverySlots } from "@/hooks/useAgreements";
import { useSampleOrders } from "@/hooks/useSampleOrders";
import { useLeads } from "@/hooks/useLeads";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Star, CalendarIcon, Package, MapPin, RotateCcw, XCircle,
  Send, FileCheck, AlertTriangle, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const otherSkuOptions = [
  "Blueberry", "Orange Mandarin", "Apple USA", "Apple Italy", "Apple Poland", "Apple NZ",
];

const dropReasons = [
  "Quality Issues", "Price Rejected", "Payment Terms", "Competition", "Changed Mind", "Other",
];

const esignBadge: Record<string, string> = {
  not_sent: "bg-muted text-muted-foreground",
  sent: "bg-info/10 text-info",
  signed: "bg-success/10 text-success",
  expired: "bg-destructive/10 text-destructive",
};

const statusBadge: Record<string, string> = {
  pending_feedback: "bg-muted text-muted-foreground",
  quality_failed: "bg-warning/10 text-warning",
  negotiating: "bg-info/10 text-info",
  agreement_sent: "bg-info/10 text-info",
  signed: "bg-success/10 text-success",
  revisit_needed: "bg-warning/10 text-warning",
  lost: "bg-destructive/10 text-destructive",
};

interface FormErrors {
  [key: string]: string;
}

export default function AgreementsPage() {
  const { agreements, loading, addAgreement, updateAgreement, refetch } = useAgreements();
  const { orders } = useSampleOrders();
  const { leads } = useLeads();
  const partners = useDistributionPartners();
  const slots = useDeliverySlots();
  const { toast } = useToast();

  const [tab, setTab] = useState<"pending" | "negotiating" | "agreement" | "revisit" | "dropped">("pending");
  const [search, setSearch] = useState("");

  // Create form state
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [rating, setRating] = useState(0);
  const [qualityRemarks, setQualityRemarks] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  // Agreement fields
  const [pricingType, setPricingType] = useState("");
  const [agreedPrice, setAgreedPrice] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [creditDays, setCreditDays] = useState("");
  const [outletsInBangalore, setOutletsInBangalore] = useState("");
  const [otherCities, setOtherCities] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [distributionPartner, setDistributionPartner] = useState("");
  const [expectedFirstOrder, setExpectedFirstOrder] = useState<Date | undefined>();
  const [expectedWeeklyVolume, setExpectedWeeklyVolume] = useState("");
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [mailId, setMailId] = useState("");
  const [kamRemarks, setKamRemarks] = useState("");

  // Drop dialog
  const [dropAgreementId, setDropAgreementId] = useState<string | null>(null);
  const [dropReason, setDropReason] = useState("");
  const [dropRemarks, setDropRemarks] = useState("");

  // Revisit dialog
  const [revisitAgreementId, setRevisitAgreementId] = useState<string | null>(null);
  const [revisitDate, setRevisitDate] = useState<Date | undefined>();
  const [revisitRemarks, setRevisitRemarks] = useState("");

  // Sample orders without an agreement = "Quality Pending"
  const pendingOrders = useMemo(() => {
    const agreementOrderIds = new Set(agreements.map(a => a.sample_order_id));
    return orders
      .filter(o => ["sample_ordered", "sample_delivered"].includes(o.status) && !agreementOrderIds.has(o.id))
      .map(o => {
        const lead = leads.find(l => l.id === o.lead_id);
        return { ...o, lead };
      });
  }, [orders, agreements, leads]);

  const selectedOrder = useMemo(() => orders.find(o => o.id === selectedOrderId), [orders, selectedOrderId]);
  const selectedLead = useMemo(() => {
    if (!selectedOrder) return null;
    return leads.find(l => l.id === selectedOrder.lead_id) || null;
  }, [selectedOrder, leads]);

  // Enrich agreements with lead/order data
  const enriched = useMemo(() => {
    return agreements.map(a => {
      const order = orders.find(o => o.id === a.sample_order_id);
      const lead = order ? leads.find(l => l.id === order.lead_id) : null;
      return { ...a, order, lead };
    });
  }, [agreements, orders, leads]);

  // Filter pending orders by search
  const filteredPending = useMemo(() => {
    if (!search) return pendingOrders;
    const s = search.toLowerCase();
    return pendingOrders.filter(o =>
      o.lead?.client_name?.toLowerCase().includes(s) || o.lead?.pincode?.includes(s)
    );
  }, [pendingOrders, search]);

  // Filter agreements by tab
  const filteredAgreements = useMemo(() => {
    let list = enriched;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a => a.lead?.client_name?.toLowerCase().includes(s) || a.lead?.pincode?.includes(s));
    }
    if (tab === "negotiating") return list.filter(a => ["agreement_sent", "negotiating", "quality_failed", "pending_feedback"].includes(a.status));
    if (tab === "agreement") return list.filter(a => a.status === "signed");
    if (tab === "revisit") return list.filter(a => a.status === "revisit_needed");
    if (tab === "dropped") return list.filter(a => a.status === "lost");
    return [];
  }, [enriched, search, tab]);

  const counts = useMemo(() => ({
    pending: pendingOrders.length,
    negotiating: enriched.filter(a => ["agreement_sent", "negotiating", "quality_failed", "pending_feedback"].includes(a.status)).length,
    agreement: enriched.filter(a => a.status === "signed").length,
    revisit: enriched.filter(a => a.status === "revisit_needed").length,
    dropped: enriched.filter(a => a.status === "lost").length,
  }), [pendingOrders, enriched]);

  const marginWarning = useMemo(() => {
    if (!agreedPrice) return false;
    const margin = Number(agreedPrice) - 50;
    return margin < 90 || margin > 100;
  }, [agreedPrice]);

  const resetForm = () => {
    setSelectedOrderId("");
    setRating(0);
    setQualityRemarks("");
    setPricingType("");
    setAgreedPrice("");
    setPaymentType("");
    setCreditDays("");
    setOutletsInBangalore("");
    setOtherCities("");
    setDeliverySlot("");
    setDistributionPartner("");
    setExpectedFirstOrder(undefined);
    setExpectedWeeklyVolume("");
    setSelectedSkus([]);
    setMailId("");
    setKamRemarks("");
    setErrors({});
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (rating === 0) e.rating = "Rating is required";
    if (rating > 0 && rating < 6 && !qualityRemarks.trim()) e.qualityRemarks = "Feedback remarks required for low rating";
    if (rating >= 6) {
      if (!pricingType) e.pricingType = "Required";
      if (!agreedPrice || Number(agreedPrice) <= 0) e.agreedPrice = "Required";
      if (!paymentType) e.paymentType = "Required";
      if (paymentType === "credit" && (!creditDays || Number(creditDays) <= 0)) e.creditDays = "Required for credit";
      if (!outletsInBangalore || Number(outletsInBangalore) <= 0) e.outletsInBangalore = "Required";
      if (!deliverySlot) e.deliverySlot = "Required";
      if (!distributionPartner) e.distributionPartner = "Required";
      if (!expectedFirstOrder) e.expectedFirstOrder = "Required";
      if (!expectedWeeklyVolume || Number(expectedWeeklyVolume) <= 0) e.expectedWeeklyVolume = "Must be > 0";
      if (!mailId.trim()) e.mailId = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailId)) e.mailId = "Invalid email";
    }
    return e;
  };

  const handleSave = async () => {
    if (!selectedOrderId) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (rating < 6) {
      const ok = await addAgreement({
        sample_order_id: selectedOrderId,
        quality_feedback: false,
        quality_remarks: qualityRemarks,
        status: "quality_failed",
      });
      if (ok) {
        toast({ title: "Quality feedback saved" });
        resetForm();
        setCreateOpen(false);
      }
      return;
    }

    const ok = await addAgreement({
      sample_order_id: selectedOrderId,
      quality_feedback: true,
      quality_remarks: qualityRemarks || null,
      pricing_type: pricingType,
      agreed_price_per_kg: Number(agreedPrice),
      payment_type: paymentType,
      credit_days: paymentType === "credit" ? Number(creditDays) : null,
      outlets_in_bangalore: Number(outletsInBangalore),
      other_cities: otherCities ? otherCities.split(",").map(c => c.trim()).filter(Boolean) : null,
      delivery_slot: deliverySlot,
      distribution_partner: distributionPartner,
      expected_first_order_date: expectedFirstOrder ? format(expectedFirstOrder, "yyyy-MM-dd") : null,
      expected_weekly_volume_kg: Number(expectedWeeklyVolume),
      other_skus: selectedSkus.length > 0 ? selectedSkus : null,
      mail_id: mailId,
      remarks: kamRemarks || null,
      status: "agreement_sent",
      esign_status: "sent",
    });
    if (ok) {
      toast({ title: `Agreement sent to ${mailId}` });
      resetForm();
      setCreateOpen(false);
    }
  };

  const handleDrop = async () => {
    if (!dropAgreementId || !dropReason || !dropRemarks.trim()) return;
    const ok = await updateAgreement(dropAgreementId, {
      status: "lost",
      remarks: `[Lost] ${dropReason}: ${dropRemarks}`,
    });
    if (ok) {
      toast({ title: "Lead marked as lost" });
      setDropAgreementId(null);
      setDropReason("");
      setDropRemarks("");
    }
  };

  const handleRevisit = async () => {
    if (!revisitAgreementId || !revisitDate) return;
    const ok = await updateAgreement(revisitAgreementId, {
      status: "revisit_needed",
      remarks: `[Re-visit: ${format(revisitDate, "dd MMM yyyy")}] ${revisitRemarks}`,
    });
    if (ok) {
      toast({ title: `Re-visit scheduled for ${format(revisitDate, "dd MMM yyyy")}` });
      setRevisitAgreementId(null);
      setRevisitDate(undefined);
      setRevisitRemarks("");
    }
  };

  // Handle creating agreement from pending card directly
  const openCreateForOrder = (orderId: string) => {
    resetForm();
    setSelectedOrderId(orderId);
    setCreateOpen(true);
  };

  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)} className="focus:outline-none">
          <Star className={cn("w-5 h-5 transition-colors", i <= value ? "fill-warning text-warning" : "text-muted-foreground/30")} />
        </button>
      ))}
    </div>
  );

  const FieldError = ({ msg }: { msg?: string }) => msg ? <p className="text-xs text-destructive mt-0.5">{msg}</p> : null;

  // Render a pending sample order card
  const renderPendingCard = (o: typeof pendingOrders[0]) => (
    <Card key={o.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{o.lead?.client_name || "Unknown"}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {o.lead?.locality || o.lead?.pincode || "—"}
            </p>
          </div>
          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
            Quality Pending
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" /> {o.sample_qty_units || "—"} units
          </span>
          <span>Demand: {o.demand_per_week_kg || "—"} kg/wk</span>
          {o.delivery_date && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" /> {format(new Date(o.delivery_date), "dd MMM")}
            </span>
          )}
          <span>{o.status === "sample_delivered" ? "Delivered" : "Ordered"}</span>
        </div>

        {o.remarks && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2">{o.remarks}</p>
        )}

        <Button size="sm" className="w-full text-xs h-8" onClick={() => openCreateForOrder(o.id)}>
          <Star className="w-3 h-3 mr-1" /> Rate Quality & Create Agreement
        </Button>
      </CardContent>
    </Card>
  );

  // Render an agreement card
  const renderAgreementCard = (a: typeof enriched[0]) => (
    <Card key={a.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{a.lead?.client_name || "Unknown"}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {a.lead?.locality || a.lead?.pincode || "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={`text-[10px] ${statusBadge[a.status] || ""}`}>
              {a.status.replace(/_/g, " ")}
            </Badge>
            {a.esign_status && a.esign_status !== "not_sent" && (
              <Badge variant="outline" className={`text-[10px] ${esignBadge[a.esign_status] || ""}`}>
                e-sign: {a.esign_status}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
          {a.quality_feedback !== null && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" /> Quality: {a.quality_feedback ? "Pass" : "Fail"}
            </span>
          )}
          {a.agreed_price_per_kg && (
            <span>₹{a.agreed_price_per_kg}/kg</span>
          )}
          {a.expected_weekly_volume_kg && (
            <span><Package className="w-3 h-3 inline" /> {a.expected_weekly_volume_kg} kg/wk</span>
          )}
          {a.distribution_partner && (
            <span className="truncate">{a.distribution_partner}</span>
          )}
        </div>

        {a.remarks && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2">{a.remarks}</p>
        )}

        { !["lost", "signed"].includes(a.status) && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs flex-1 h-8" onClick={() => setRevisitAgreementId(a.id)}>
              <RotateCcw className="w-3 h-3 mr-1" /> Re-visit
            </Button>
            <Button size="sm" variant="outline" className="text-xs flex-1 h-8 text-destructive" onClick={() => setDropAgreementId(a.id)}>
              <XCircle className="w-3 h-3 mr-1" /> Drop
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Step 4: Sample Order to Agreement</h1>
          <p className="text-sm text-muted-foreground">
            {pendingOrders.length} pending · {agreements.length} agreements
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="pending" className="text-xs">Quality Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="negotiating" className="text-xs">Negotiating ({counts.negotiating})</TabsTrigger>
          <TabsTrigger value="agreement" className="text-xs">Agreement ({counts.agreement})</TabsTrigger>
          <TabsTrigger value="revisit" className="text-xs">Re-visits ({counts.revisit})</TabsTrigger>
          <TabsTrigger value="dropped" className="text-xs">Dropped ({counts.dropped})</TabsTrigger>
        </TabsList>

        {/* Search */}
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search client name, pincode..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Pending Tab - Sample Orders without agreements */}
        <TabsContent value="pending" className="mt-3">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : filteredPending.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No sample orders pending quality feedback</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPending.map(renderPendingCard)}
            </div>
          )}
        </TabsContent>

        {/* Other tabs - Agreement cards */}
        {(["negotiating", "agreement", "revisit", "dropped"] as const).map(t => (
          <TabsContent key={t} value={t} className="mt-3">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : filteredAgreements.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No agreements found</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAgreements.map(renderAgreementCard)}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Agreement Dialog */}
      <Dialog open={createOpen} onOpenChange={open => { if (!open) { setCreateOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Agreement</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">

            {/* Pre-filled Summary */}
            {selectedOrder && selectedLead && (
              <Card className="bg-muted/50">
                <CardContent className="p-3 space-y-1 text-xs">
                  <p className="font-medium text-muted-foreground">Sample Order Summary</p>
                  <div className="grid grid-cols-2 gap-1">
                    <span>Client: {selectedLead.client_name}</span>
                    <span>Pincode: {selectedLead.pincode}</span>
                    <span>PM: {selectedLead.purchase_manager_name || "—"}</span>
                    <span>Qty: {selectedOrder.sample_qty_units || "—"} units</span>
                    <span>Delivery: {selectedOrder.delivery_date ? format(new Date(selectedOrder.delivery_date), "dd MMM yyyy") : "—"}</span>
                    <span>Demand: {selectedOrder.demand_per_week_kg || "—"} kg/wk</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quality Rating */}
            {selectedOrderId && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Overall Quality Rating (1-10) *</Label>
                <StarRating value={rating} onChange={setRating} />
                {rating > 0 && <p className="text-xs text-muted-foreground">Rating: {rating}/10</p>}
                <FieldError msg={errors.rating} />
              </div>
            )}

            {/* Low rating - quality remarks */}
            {rating > 0 && rating < 6 && (
              <div className="space-y-2 p-3 border border-warning/30 rounded-md bg-warning/5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-warning" /> Quality Feedback Remarks *
                </Label>
                <Textarea value={qualityRemarks} onChange={e => setQualityRemarks(e.target.value)} placeholder="Describe quality issues..." className="text-xs min-h-[80px]" />
                <FieldError msg={errors.qualityRemarks} />
              </div>
            )}

            {/* Agreement Section - only if rating >= 6 */}
            {rating >= 6 && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold">Agreement Details</h3>

                {/* Commercial Terms */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Commercial Terms</p>

                  <div className="space-y-1">
                    <Label className="text-xs">Pricing Type *</Label>
                    <RadioGroup value={pricingType} onValueChange={setPricingType} className="flex flex-wrap gap-3">
                      {["Weekly", "Monthly", "Quarterly", "Annual"].map(v => (
                        <div key={v} className="flex items-center gap-1.5">
                          <RadioGroupItem value={v.toLowerCase()} id={`pt-${v}`} />
                          <Label htmlFor={`pt-${v}`} className="text-xs cursor-pointer">{v}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <FieldError msg={errors.pricingType} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Agreed Price per Kg (₹) *</Label>
                      <Input type="number" value={agreedPrice} onChange={e => setAgreedPrice(e.target.value)} className="h-8 text-xs" placeholder="e.g. 150" />
                      {marginWarning && agreedPrice && (
                        <Badge variant="outline" className="bg-warning/10 text-warning text-[10px]">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Margin outside 90-100 Rs/kg range
                        </Badge>
                      )}
                      <FieldError msg={errors.agreedPrice} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Payment Type *</Label>
                    <RadioGroup value={paymentType} onValueChange={setPaymentType} className="flex gap-4">
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="cash_and_carry" id="pay-cash" />
                        <Label htmlFor="pay-cash" className="text-xs cursor-pointer">Cash and Carry</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="credit" id="pay-credit" />
                        <Label htmlFor="pay-credit" className="text-xs cursor-pointer">Credit</Label>
                      </div>
                    </RadioGroup>
                    <FieldError msg={errors.paymentType} />
                  </div>

                  {paymentType === "credit" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Credit Days *</Label>
                      <Input type="number" value={creditDays} onChange={e => setCreditDays(e.target.value)} className="h-8 text-xs w-32" placeholder="e.g. 30" />
                      <FieldError msg={errors.creditDays} />
                    </div>
                  )}
                </div>

                {/* Operational Details */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Operational Details</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Outlets in Bangalore *</Label>
                      <Input type="number" value={outletsInBangalore} onChange={e => setOutletsInBangalore(e.target.value)} className="h-8 text-xs" />
                      <FieldError msg={errors.outletsInBangalore} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Other Cities (comma-separated)</Label>
                      <Input value={otherCities} onChange={e => setOtherCities(e.target.value)} className="h-8 text-xs" placeholder="Mumbai, Delhi" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Delivery Slot *</Label>
                    <RadioGroup value={deliverySlot} onValueChange={setDeliverySlot} className="flex gap-4">
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="9am-12pm" id="slot-am" />
                        <Label htmlFor="slot-am" className="text-xs cursor-pointer">9 AM–12 PM</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="12pm-3pm" id="slot-pm" />
                        <Label htmlFor="slot-pm" className="text-xs cursor-pointer">12 PM–3 PM</Label>
                      </div>
                    </RadioGroup>
                    <FieldError msg={errors.deliverySlot} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Distribution Partner *</Label>
                    <Select value={distributionPartner} onValueChange={setDistributionPartner}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select partner" /></SelectTrigger>
                      <SelectContent>
                        {partners.map(p => (
                          <SelectItem key={p.id} value={p.name}>{p.name} — {p.area_coverage}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError msg={errors.distributionPartner} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Expected First Order Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="h-8 text-xs w-full justify-start">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {expectedFirstOrder ? format(expectedFirstOrder, "dd MMM yyyy") : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={expectedFirstOrder} onSelect={setExpectedFirstOrder} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FieldError msg={errors.expectedFirstOrder} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Expected Weekly Volume (kg) *</Label>
                      <Input type="number" value={expectedWeeklyVolume} onChange={e => setExpectedWeeklyVolume(e.target.value)} className="h-8 text-xs" />
                      <FieldError msg={errors.expectedWeeklyVolume} />
                    </div>
                  </div>
                </div>

                {/* Additional */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Additional</p>

                  <div className="space-y-1">
                    <Label className="text-xs">Other SKUs Interest</Label>
                    <div className="flex flex-wrap gap-3">
                      {otherSkuOptions.map(sku => (
                        <div key={sku} className="flex items-center gap-1.5">
                          <Checkbox
                            id={`sku-${sku}`}
                            checked={selectedSkus.includes(sku)}
                            onCheckedChange={checked => {
                              setSelectedSkus(prev => checked ? [...prev, sku] : prev.filter(s => s !== sku));
                            }}
                          />
                          <Label htmlFor={`sku-${sku}`} className="text-xs cursor-pointer">{sku}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Mail ID *</Label>
                    <Input type="email" value={mailId} onChange={e => setMailId(e.target.value)} className="h-8 text-xs" placeholder="client@example.com" />
                    <FieldError msg={errors.mailId} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">KAM Remarks</Label>
                    <Textarea value={kamRemarks} onChange={e => setKamRemarks(e.target.value)} className="text-xs min-h-[60px]" placeholder="Any additional notes..." />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {rating > 0 && rating < 6 && selectedOrderId && (
              <Button size="sm" className="text-xs" onClick={handleSave}>
                <Send className="w-3 h-3 mr-1" /> Save Quality Feedback
              </Button>
            )}
            {rating >= 6 && selectedOrderId && (
              <Button size="sm" className="text-xs" onClick={handleSave}>
                <Send className="w-3 h-3 mr-1" /> Save & Send Agreement
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drop Dialog */}
      <Dialog open={!!dropAgreementId} onOpenChange={open => { if (!open) { setDropAgreementId(null); setDropReason(""); setDropRemarks(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Drop Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Reason *</Label>
              <RadioGroup value={dropReason} onValueChange={setDropReason} className="grid gap-2">
                {dropReasons.map(r => (
                  <div key={r} className="flex items-center gap-2">
                    <RadioGroupItem value={r} id={`drop-${r}`} />
                    <Label htmlFor={`drop-${r}`} className="text-xs cursor-pointer">{r}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Final Remarks *</Label>
              <Textarea value={dropRemarks} onChange={e => setDropRemarks(e.target.value)} className="text-xs min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="destructive" className="text-xs" onClick={handleDrop} disabled={!dropReason || !dropRemarks.trim()}>
              Confirm Drop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revisit Dialog */}
      <Dialog open={!!revisitAgreementId} onOpenChange={open => { if (!open) { setRevisitAgreementId(null); setRevisitDate(undefined); setRevisitRemarks(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Re-visit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Re-visit Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 text-xs w-full justify-start">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {revisitDate ? format(revisitDate, "dd MMM yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={revisitDate} onSelect={setRevisitDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Remarks</Label>
              <Textarea value={revisitRemarks} onChange={e => setRevisitRemarks(e.target.value)} className="text-xs min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={handleRevisit} disabled={!revisitDate}>
              Schedule Re-visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
