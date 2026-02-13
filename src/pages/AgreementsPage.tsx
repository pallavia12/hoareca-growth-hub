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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAgreements, useDistributionPartners } from "@/hooks/useAgreements";
import { supabase } from "@/integrations/supabase/client";
import { useSampleOrders } from "@/hooks/useSampleOrders";
import { useLeads } from "@/hooks/useLeads";
import { useToast } from "@/hooks/use-toast";
import {
  Search, CalendarIcon, Send, RotateCcw, XCircle, AlertTriangle, Truck, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const otherSkuOptions = [
  "Blueberry", "Orange Mandarin", "Apple USA", "Apple Italy", "Apple Poland", "Apple NZ",
];

const dropReasons = [
  "Quality Issues", "Price Rejected", "Payment Terms", "Competition", "Changed Mind", "Other",
];

const esignBadgeClass: Record<string, string> = {
  not_sent: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  signed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

interface FormErrors { [key: string]: string; }

// Helper to extract specs from remarks
const extractSpecs = (remarks: string | null) => {
  if (!remarks) return { pcsPerBox: "—", ripeness: "—", numBoxes: "—" };
  const countMatch = remarks.match(/Count\/box:\s*(\d+)/);
  const ripenessMatch = remarks.match(/Ripeness:\s*([^|]+)/);
  return {
    pcsPerBox: countMatch ? countMatch[1] : "—",
    ripeness: ripenessMatch ? ripenessMatch[1].trim() : "—",
    numBoxes: "—", // derived from sample_qty_units
  };
};

export default function AgreementsPage() {
  const { agreements, loading, addAgreement, updateAgreement } = useAgreements();
  const { orders, updateOrder } = useSampleOrders();
  const { leads, updateLead } = useLeads();
  const partners = useDistributionPartners();
  const { toast } = useToast();

  const [tab, setTab] = useState<"pending_orders" | "delivered" | "revisit" | "completed" | "dropped">("pending_orders");
  const [search, setSearch] = useState("");

  // Completed tab filters
  const [filterEsign, setFilterEsign] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Deliver Order confirm dialog
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverOrderId, setDeliverOrderId] = useState<string | null>(null);
  const [deliverError, setDeliverError] = useState("");

  // Reschedule dialog
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleOrderId, setRescheduleOrderId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState("");

  // Send Agreement dialog
  const [sendOpen, setSendOpen] = useState(false);
  const [sendOrderId, setSendOrderId] = useState<string | null>(null);
  const [sendAgreementId, setSendAgreementId] = useState<string | null>(null);

  // Quality feedback
  const [feedback, setFeedback] = useState<"positive" | "negative" | "">("");
  const [feedbackRemarks, setFeedbackRemarks] = useState("");

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
  const [errors, setErrors] = useState<FormErrors>({});

  // Schedule Revisit dialog
  const [revisitOpen, setRevisitOpen] = useState(false);
  const [revisitOrderId, setRevisitOrderId] = useState<string | null>(null);
  const [revisitAgreementId, setRevisitAgreementId] = useState<string | null>(null);
  const [revisitFeedback, setRevisitFeedback] = useState<"positive" | "negative" | "">("");
  const [revisitFeedbackRemarks, setRevisitFeedbackRemarks] = useState("");
  const [revisitDate, setRevisitDate] = useState<Date | undefined>();
  const [revisitTime, setRevisitTime] = useState("");
  const [revisitRemarks, setRevisitRemarks] = useState("");

  // Not Interested dialog
  const [dropOpen, setDropOpen] = useState(false);
  const [dropOrderId, setDropOrderId] = useState<string | null>(null);
  const [dropAgreementId, setDropAgreementId] = useState<string | null>(null);
  const [dropReason, setDropReason] = useState("");
  const [dropRemarks, setDropRemarks] = useState("");

  // Enriched agreements
  const enriched = useMemo(() => {
    return agreements.map(a => {
      const order = orders.find(o => o.id === a.sample_order_id);
      const lead = order ? leads.find(l => l.id === order.lead_id) : null;
      return { ...a, order, lead };
    });
  }, [agreements, orders, leads]);

  // Orders with leads
  const ordersWithLeads = useMemo(() =>
    orders.map(o => ({ ...o, lead: leads.find(l => l.id === o.lead_id) })),
    [orders, leads]
  );

  // Tab 1: Pending Orders - sample_ordered status (not yet delivered)
  const pendingOrders = useMemo(() => {
    let items = ordersWithLeads.filter(o => o.status === "sample_ordered");
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(o => (o.lead?.client_name || "").toLowerCase().includes(s));
    }
    return items;
  }, [ordersWithLeads, search]);

  // Tab 2: Delivered Orders - sample_delivered without agreement OR pending_feedback agreement
  const deliveredItems = useMemo(() => {
    const agreementOrderIds = new Set(agreements.map(a => a.sample_order_id));
    const fromOrders = ordersWithLeads
      .filter(o => o.status === "sample_delivered" && !agreementOrderIds.has(o.id))
      .map(o => ({
        type: "order" as const, orderId: o.id, agreementId: null,
        leadName: o.lead?.client_name || "Unknown", deliveredDate: o.delivery_date || o.updated_at,
        lead: o.lead, order: o,
      }));
    const fromAgreements = enriched
      .filter(a => a.status === "pending_feedback")
      .map(a => ({
        type: "agreement" as const, orderId: a.sample_order_id, agreementId: a.id,
        leadName: a.lead?.client_name || "Unknown", deliveredDate: a.order?.delivery_date || a.created_at,
        lead: a.lead, order: a.order,
      }));
    let items = [...fromOrders, ...fromAgreements];
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(i => i.leadName.toLowerCase().includes(s));
    }
    return items;
  }, [ordersWithLeads, agreements, enriched, search]);

  // Tab 3: Revisits
  const revisitItems = useMemo(() => {
    let items = enriched.filter(a => a.status === "revisit_needed");
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(a => (a.lead?.client_name || "").toLowerCase().includes(s));
    }
    return items;
  }, [enriched, search]);

  // Tab 4: Completed
  const completedItems = useMemo(() => {
    let items = enriched.filter(a => ["agreement_sent", "signed"].includes(a.status));
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(a => (a.lead?.client_name || "").toLowerCase().includes(s));
    }
    if (filterEsign && filterEsign !== "all") items = items.filter(a => a.esign_status === filterEsign);
    if (dateFrom) items = items.filter(a => new Date(a.created_at) >= dateFrom);
    if (dateTo) items = items.filter(a => new Date(a.created_at) <= dateTo);
    return items;
  }, [enriched, search, filterEsign, dateFrom, dateTo]);

  // Tab 5: Dropped
  const droppedItems = useMemo(() => {
    let items = enriched.filter(a => a.status === "lost");
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(a => (a.lead?.client_name || "").toLowerCase().includes(s));
    }
    return items;
  }, [enriched, search]);

  const counts = useMemo(() => ({
    pending_orders: pendingOrders.length,
    delivered: deliveredItems.length,
    revisit: revisitItems.length,
    completed: completedItems.length,
    dropped: droppedItems.length,
  }), [pendingOrders, deliveredItems, revisitItems, completedItems, droppedItems]);

  const marginWarning = useMemo(() => {
    if (!agreedPrice) return false;
    const margin = Number(agreedPrice) - 50;
    return margin < 90 || margin > 100;
  }, [agreedPrice]);

  const resetSendForm = () => {
    setSendOrderId(null); setSendAgreementId(null);
    setFeedback(""); setFeedbackRemarks("");
    setPricingType(""); setAgreedPrice(""); setPaymentType(""); setCreditDays("");
    setOutletsInBangalore(""); setOtherCities(""); setDeliverySlot(""); setDistributionPartner("");
    setExpectedFirstOrder(undefined); setExpectedWeeklyVolume("");
    setSelectedSkus([]); setMailId(""); setKamRemarks(""); setErrors({});
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!feedback) e.feedback = "Required";
    if (!pricingType) e.pricingType = "Required";
    if (!agreedPrice || Number(agreedPrice) <= 0) e.agreedPrice = "Required";
    if (!paymentType) e.paymentType = "Required";
    if (paymentType === "credit" && (!creditDays || Number(creditDays) <= 0)) e.creditDays = "Required";
    if (!outletsInBangalore || Number(outletsInBangalore) <= 0) e.outletsInBangalore = "Required";
    if (!deliverySlot) e.deliverySlot = "Required";
    if (!distributionPartner) e.distributionPartner = "Required";
    if (!expectedFirstOrder) e.expectedFirstOrder = "Required";
    if (!expectedWeeklyVolume || Number(expectedWeeklyVolume) <= 0) e.expectedWeeklyVolume = "Required";
    if (!mailId.trim()) e.mailId = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailId)) e.mailId = "Invalid email";
    return e;
  };

  const getLeadForOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    return order ? leads.find(l => l.id === order.lead_id) : null;
  };

  const incrementVisitCount = async (orderId: string) => {
    const lead = getLeadForOrder(orderId);
    if (lead) {
      await updateLead(lead.id, { visit_count: (lead.visit_count || 0) + 1 });
    }
  };

  // === Deliver Order ===
  const openDeliverDialog = (orderId: string) => {
    setDeliverOrderId(orderId);
    setDeliverError("");
    setDeliverOpen(true);
  };

  const handleDeliverOrder = async () => {
    if (!deliverOrderId) return;
    const lead = getLeadForOrder(deliverOrderId);

    // Check user distance from lead location
    if (lead?.geo_lat && lead?.geo_lng && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        const dist = getDistanceKm(pos.coords.latitude, pos.coords.longitude, Number(lead.geo_lat), Number(lead.geo_lng));
        if (dist > 2) {
          setDeliverError("You are far from Lead's location");
          return;
        }
      } catch {
        // If geolocation fails, show location error
        setDeliverError("You are far from Lead's location");
        return;
      }
    }

    await updateOrder(deliverOrderId, { status: "sample_delivered" });
    await incrementVisitCount(deliverOrderId);
    toast({ title: "Order delivered successfully" });
    setDeliverOpen(false);
    setDeliverOrderId(null);
  };

  // === Reschedule ===
  const openRescheduleDialog = (orderId: string) => {
    setRescheduleOrderId(orderId);
    setRescheduleDate(undefined);
    setRescheduleTime("");
    setRescheduleOpen(true);
  };

  const handleReschedule = async () => {
    if (!rescheduleOrderId || !rescheduleDate) return;
    await updateOrder(rescheduleOrderId, {
      delivery_date: format(rescheduleDate, "yyyy-MM-dd"),
      delivery_slot: rescheduleTime || null,
    });
    await incrementVisitCount(rescheduleOrderId);
    toast({ title: `Delivery rescheduled to ${format(rescheduleDate, "dd MMM yyyy")}` });
    setRescheduleOpen(false);
  };

  // === Send Agreement ===
  const handleSendAgreement = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    const orderId = sendOrderId;
    if (!orderId) return;

    const agreementData = {
      quality_feedback: feedback === "positive",
      quality_remarks: feedbackRemarks || null,
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
    };

    let ok: boolean;
    if (sendAgreementId) {
      ok = await updateAgreement(sendAgreementId, agreementData);
    } else {
      ok = await addAgreement({ sample_order_id: orderId, ...agreementData });
    }
    if (ok) {
      await incrementVisitCount(orderId);
      toast({ title: `Agreement sent to ${mailId}` });
      resetSendForm();
      setSendOpen(false);
    }
  };

  const openSendAgreement = (orderId: string, agreementId?: string | null) => {
    resetSendForm();
    setSendOrderId(orderId);
    setSendAgreementId(agreementId || null);
    setSendOpen(true);
  };

  // === Schedule Revisit ===
  const openScheduleRevisit = (orderId: string, agreementId?: string | null) => {
    setRevisitOrderId(orderId);
    setRevisitAgreementId(agreementId || null);
    setRevisitFeedback(""); setRevisitFeedbackRemarks("");
    setRevisitDate(undefined); setRevisitTime(""); setRevisitRemarks("");
    setRevisitOpen(true);
  };

  const handleScheduleRevisit = async () => {
    if (!revisitFeedback || !revisitDate || !revisitRemarks.trim()) return;
    const orderId = revisitOrderId;
    if (!orderId) return;
    const timeStr = revisitTime ? ` at ${revisitTime}` : "";
    const remarksStr = `[Re-visit: ${format(revisitDate, "dd MMM yyyy")}${timeStr}] Feedback: ${revisitFeedback}. ${revisitFeedbackRemarks ? revisitFeedbackRemarks + ". " : ""}${revisitRemarks}`;

    if (revisitAgreementId) {
      await updateAgreement(revisitAgreementId, { status: "revisit_needed", quality_feedback: revisitFeedback === "positive", quality_remarks: revisitFeedbackRemarks || null, remarks: remarksStr });
    } else {
      await addAgreement({ sample_order_id: orderId, status: "revisit_needed", quality_feedback: revisitFeedback === "positive", quality_remarks: revisitFeedbackRemarks || null, remarks: remarksStr });
    }
    await incrementVisitCount(orderId);
    toast({ title: `Revisit scheduled for ${format(revisitDate, "dd MMM yyyy")}${timeStr}` });
    setRevisitOpen(false);
  };

  // === Not Interested ===
  const openNotInterested = (orderId: string, agreementId?: string | null) => {
    setDropOrderId(orderId); setDropAgreementId(agreementId || null);
    setDropReason(""); setDropRemarks(""); setDropOpen(true);
  };

  const handleNotInterested = async () => {
    if (!dropReason || !dropRemarks.trim()) return;
    const orderId = dropOrderId;
    if (!orderId) return;
    const lead = getLeadForOrder(orderId);
    const totalVisits = lead?.visit_count || 0;
    if (lead) await updateLead(lead.id, { visit_count: totalVisits + 1 });

    if (dropAgreementId) {
      await updateAgreement(dropAgreementId, { status: "lost", remarks: `[Dropped] ${dropReason}: ${dropRemarks}. Total visits: ${totalVisits + 1}` });
    } else {
      await addAgreement({ sample_order_id: orderId, status: "lost", remarks: `[Dropped] ${dropReason}: ${dropRemarks}. Total visits: ${totalVisits + 1}` });
    }
    toast({ title: "Marked as not interested", variant: "destructive" });
    setDropOpen(false);
  };

  const extractRevisitDate = (remarks: string | null) => {
    if (!remarks) return null;
    const match = remarks.match(/Re-visit:\s*([^[\]]+?)(?:\]|$)/);
    return match ? match[1].trim() : null;
  };

  const extractFeedback = (a: typeof enriched[0]) => {
    if (a.quality_feedback === true) return "Positive";
    if (a.quality_feedback === false) return "Negative";
    return "—";
  };

  const extractDropInfo = (remarks: string | null) => {
    if (!remarks) return { reason: "—", finalRemarks: "—" };
    const match = remarks.match(/\[Dropped\]\s*([^:]+):\s*(.*?)(?:\.\s*Total|$)/s);
    if (match) return { reason: match[1].trim(), finalRemarks: match[2].trim() };
    return { reason: "—", finalRemarks: remarks };
  };

  const FieldError = ({ msg }: { msg?: string }) => msg ? <p className="text-xs text-destructive mt-0.5">{msg}</p> : null;

  // Get order specs for Send Agreement dialog summary
  const getOrderSummary = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;
    const specs = extractSpecs(order.remarks);
    return {
      deliveryDate: order.delivery_date ? format(new Date(order.delivery_date), "dd MMM yyyy") : "—",
      pcsPerBox: specs.pcsPerBox,
      ripeness: specs.ripeness,
      numBoxes: order.sample_qty_units ? String(order.sample_qty_units) : "—",
    };
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Step 4: Sample Order to Agreement</h1>
        <p className="text-sm text-muted-foreground">
          {counts.pending_orders} pending · {counts.delivered} delivered · {counts.completed} completed · {counts.revisit} revisits
        </p>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="w-full sm:w-auto flex-wrap">
          <TabsTrigger value="pending_orders" className="text-xs">Pending Orders ({counts.pending_orders})</TabsTrigger>
          <TabsTrigger value="delivered" className="text-xs">Delivered ({counts.delivered})</TabsTrigger>
          <TabsTrigger value="revisit" className="text-xs">Revisits ({counts.revisit})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Completed ({counts.completed})</TabsTrigger>
          <TabsTrigger value="dropped" className="text-xs">Drop-outs ({counts.dropped})</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search lead name..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {tab === "completed" && (
            <>
              <Select value={filterEsign} onValueChange={setFilterEsign}>
                <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs"><SelectValue placeholder="E-sign Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("text-xs h-9", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {dateFrom ? format(dateFrom, "dd MMM") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("text-xs h-9", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {dateTo ? format(dateTo, "dd MMM") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>

        {/* Tab 1: Pending Orders */}
        <TabsContent value="pending_orders" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Lead Name</TableHead>
                      <TableHead className="text-xs">Delivery Date</TableHead>
                      <TableHead className="text-xs">Pcs per Box</TableHead>
                      <TableHead className="text-xs">Ripeness</TableHead>
                      <TableHead className="text-xs">No of Boxes</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">Loading...</TableCell></TableRow>
                    ) : pendingOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">No pending orders.</TableCell></TableRow>
                    ) : (
                      pendingOrders.map(o => {
                        const specs = extractSpecs(o.remarks);
                        return (
                          <TableRow key={o.id} className="text-sm">
                            <TableCell className="font-medium max-w-[180px] truncate">{o.lead?.client_name || "Unknown"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {o.delivery_date ? format(new Date(o.delivery_date), "dd MMM yyyy") : "—"}
                            </TableCell>
                            <TableCell className="text-xs">{specs.pcsPerBox}</TableCell>
                            <TableCell className="text-xs">{specs.ripeness}</TableCell>
                            <TableCell className="text-xs">{o.sample_qty_units || "—"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                <Button size="sm" className="text-xs h-7" onClick={() => openDeliverDialog(o.id)}>
                                  <Truck className="w-3 h-3 mr-1" /> Deliver
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openRescheduleDialog(o.id)}>
                                  <Clock className="w-3 h-3 mr-1" /> Reschedule
                                </Button>
                              </div>
                            </TableCell>
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

        {/* Tab 2: Delivered Orders */}
        <TabsContent value="delivered" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Lead Name</TableHead>
                      <TableHead className="text-xs">Visits</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Sample Delivered</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveredItems.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">No delivered orders pending feedback.</TableCell></TableRow>
                    ) : (
                      deliveredItems.map(item => (
                        <TableRow key={item.orderId} className="text-sm">
                          <TableCell className="font-medium max-w-[180px] truncate">{item.leadName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.lead?.visit_count || 0}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                            {item.deliveredDate ? format(new Date(item.deliveredDate), "dd MMM") : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button size="sm" className="text-xs h-7" onClick={() => openSendAgreement(item.orderId, item.agreementId)}>
                                <Send className="w-3 h-3 mr-1" /> Send Agreement
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7 text-destructive" onClick={() => openNotInterested(item.orderId, item.agreementId)}>
                                <XCircle className="w-3 h-3 mr-1" /> Not Interested
                              </Button>
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

        {/* Tab 3: Revisits */}
        <TabsContent value="revisit" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Lead Name</TableHead>
                      <TableHead className="text-xs">Visits</TableHead>
                      <TableHead className="text-xs">Next Visit</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Last Feedback</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revisitItems.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">No revisits scheduled.</TableCell></TableRow>
                    ) : (
                      revisitItems.map(a => {
                        const nextVisit = extractRevisitDate(a.remarks);
                        return (
                          <TableRow key={a.id} className="text-sm">
                            <TableCell className="font-medium max-w-[180px] truncate">{a.lead?.client_name || "Unknown"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{a.lead?.visit_count || 0}</TableCell>
                            <TableCell className="text-xs">{nextVisit || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{extractFeedback(a)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                <Button size="sm" className="text-xs h-7" onClick={() => openSendAgreement(a.sample_order_id, a.id)}>
                                  <Send className="w-3 h-3 mr-1" /> Send Agreement
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs h-7 text-destructive" onClick={() => openNotInterested(a.sample_order_id, a.id)}>
                                  <XCircle className="w-3 h-3 mr-1" /> Not Interested
                                </Button>
                              </div>
                            </TableCell>
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

        {/* Tab 4: Completed */}
        <TabsContent value="completed" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Lead Name</TableHead>
                      <TableHead className="text-xs">Total Visits</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Sent Date</TableHead>
                      <TableHead className="text-xs">E-sign</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Email</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Price ₹/kg</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Weekly Vol</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedItems.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">No completed agreements yet.</TableCell></TableRow>
                    ) : (
                      completedItems.map(a => (
                        <TableRow key={a.id} className="text-sm">
                          <TableCell className="font-medium max-w-[180px] truncate">{a.lead?.client_name || "Unknown"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{a.lead?.visit_count || 0}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{format(new Date(a.created_at), "dd MMM")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${esignBadgeClass[a.esign_status || "not_sent"]}`}>
                              {(a.esign_status || "not_sent").replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden md:table-cell truncate max-w-[140px]">{a.mail_id || "—"}</TableCell>
                          <TableCell className="text-xs hidden sm:table-cell">{a.agreed_price_per_kg ? `₹${a.agreed_price_per_kg}` : "—"}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell">{a.expected_weekly_volume_kg ? `${a.expected_weekly_volume_kg} kg` : "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Drop-outs */}
        <TabsContent value="dropped" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Lead Name</TableHead>
                      <TableHead className="text-xs">Total Visits</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Last Feedback</TableHead>
                      <TableHead className="text-xs">Reason</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Final Remarks</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Dropped</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {droppedItems.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">No drop-outs.</TableCell></TableRow>
                    ) : (
                      droppedItems.map(a => {
                        const { reason, finalRemarks } = extractDropInfo(a.remarks);
                        return (
                          <TableRow key={a.id} className="text-sm">
                            <TableCell className="font-medium max-w-[180px] truncate">{a.lead?.client_name || "Unknown"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{a.lead?.visit_count || 0}</TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{extractFeedback(a)}</TableCell>
                            <TableCell className="text-xs">{reason}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate hidden md:table-cell">{finalRemarks}</TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{format(new Date(a.updated_at), "dd MMM")}</TableCell>
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

      {/* Deliver Order Confirm Dialog */}
      <Dialog open={deliverOpen} onOpenChange={open => { if (!open) setDeliverOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Delivery</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to mark this order as delivered?</p>
          {deliverError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {deliverError}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleDeliverOrder}>
              <Truck className="w-3 h-3 mr-1" /> Confirm Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Delivery Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={open => { if (!open) setRescheduleOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reschedule Delivery</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">New Delivery Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-8 text-xs w-full justify-start", !rescheduleDate && "text-muted-foreground")}>
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {rescheduleDate ? format(rescheduleDate, "dd MMM yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={rescheduleDate} onSelect={setRescheduleDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Time</Label>
              <Input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleReschedule} disabled={!rescheduleDate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Agreement Dialog */}
      <Dialog open={sendOpen} onOpenChange={open => { if (!open) { setSendOpen(false); resetSendForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Send Agreement</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">

            {/* Client info + order summary */}
            {sendOrderId && (() => {
              const lead = getLeadForOrder(sendOrderId);
              const summary = getOrderSummary(sendOrderId);
              if (!lead) return null;
              return (
                <div className="bg-muted/50 p-3 rounded-md text-xs grid grid-cols-2 gap-1">
                  <span><strong>Lead:</strong> {lead.client_name}</span>
                  <span><strong>Pincode:</strong> {lead.pincode}</span>
                  {lead.purchase_manager_name && <span><strong>PM:</strong> {lead.purchase_manager_name}</span>}
                  {lead.contact_number && <span><strong>Phone:</strong> {lead.contact_number}</span>}
                  {summary && (
                    <>
                      <span><strong>Delivery Date:</strong> {summary.deliveryDate}</span>
                      <span><strong>Pcs/Box:</strong> {summary.pcsPerBox}</span>
                      <span><strong>Ripeness:</strong> {summary.ripeness}</span>
                      <span><strong>No of Boxes:</strong> {summary.numBoxes}</span>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Quality Feedback */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quality Feedback</p>
              <div className="space-y-1">
                <Label className="text-xs">Feedback *</Label>
                <RadioGroup value={feedback} onValueChange={v => setFeedback(v as any)} className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="positive" id="fb-pos" />
                    <Label htmlFor="fb-pos" className="text-xs cursor-pointer">Positive</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="negative" id="fb-neg" />
                    <Label htmlFor="fb-neg" className="text-xs cursor-pointer">Negative</Label>
                  </div>
                </RadioGroup>
                <FieldError msg={errors.feedback} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Feedback Remarks</Label>
                <Textarea value={feedbackRemarks} onChange={e => setFeedbackRemarks(e.target.value)} className="text-xs min-h-[60px]" placeholder="Optional quality remarks..." />
              </div>
            </div>

            {/* Commercial Terms */}
            <div className="space-y-4 border-t pt-4">
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
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px]">
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
            <div className="space-y-3 border-t pt-4">
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
                      <Button variant="outline" className={cn("h-8 text-xs w-full justify-start", !expectedFirstOrder && "text-muted-foreground")}>
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {expectedFirstOrder ? format(expectedFirstOrder, "dd MMM yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={expectedFirstOrder} onSelect={setExpectedFirstOrder} initialFocus className="p-3 pointer-events-auto" />
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
            <div className="space-y-3 border-t pt-4">
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => {
              setSendOpen(false);
              openScheduleRevisit(sendOrderId!, sendAgreementId);
            }}>
              <RotateCcw className="w-3 h-3 mr-1" /> Schedule Revisit
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
              <Button size="sm" className="text-xs" onClick={handleSendAgreement}>
                <Send className="w-3 h-3 mr-1" /> Save & Send Agreement
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Revisit Dialog */}
      <Dialog open={revisitOpen} onOpenChange={open => { if (!open) setRevisitOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Revisit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Feedback *</Label>
              <RadioGroup value={revisitFeedback} onValueChange={v => setRevisitFeedback(v as any)} className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="positive" id="rv-fb-pos" />
                  <Label htmlFor="rv-fb-pos" className="text-xs cursor-pointer">Positive</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="negative" id="rv-fb-neg" />
                  <Label htmlFor="rv-fb-neg" className="text-xs cursor-pointer">Negative</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Feedback Remarks</Label>
              <Textarea value={revisitFeedbackRemarks} onChange={e => setRevisitFeedbackRemarks(e.target.value)} className="text-xs min-h-[50px]" placeholder="Optional..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Revisit Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-8 text-xs w-full justify-start", !revisitDate && "text-muted-foreground")}>
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {revisitDate ? format(revisitDate, "dd MMM yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={revisitDate} onSelect={setRevisitDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Time *</Label>
                <Input type="time" value={revisitTime} onChange={e => setRevisitTime(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remarks *</Label>
              <Textarea value={revisitRemarks} onChange={e => setRevisitRemarks(e.target.value)} className="text-xs min-h-[60px]" placeholder="Revisit reason and plan..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleScheduleRevisit} disabled={!revisitFeedback || !revisitDate || !revisitRemarks.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Not Interested Dialog */}
      <Dialog open={dropOpen} onOpenChange={open => { if (!open) setDropOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Not Interested</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Reason *</Label>
              <RadioGroup value={dropReason} onValueChange={setDropReason} className="grid gap-2">
                {dropReasons.map(r => (
                  <div key={r} className="flex items-center gap-2">
                    <RadioGroupItem value={r} id={`drop4-${r}`} />
                    <Label htmlFor={`drop4-${r}`} className="text-xs cursor-pointer">{r}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Final Remarks *</Label>
              <Textarea value={dropRemarks} onChange={e => setDropRemarks(e.target.value)} className="text-xs min-h-[60px]" />
            </div>
            {dropOrderId && (() => {
              const lead = getLeadForOrder(dropOrderId);
              return lead ? (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  Total Visits: <strong>{lead.visit_count || 0}</strong>
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" variant="destructive" onClick={handleNotInterested} disabled={!dropReason || !dropRemarks.trim()}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Haversine distance in km
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
