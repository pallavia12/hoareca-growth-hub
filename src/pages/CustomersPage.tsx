import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, Phone, MapPin, ClipboardList, ChevronDown, ChevronUp,
  ArrowDown, Users, UserCheck, CalendarDays, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Customer {
  entityId: string;
  customerId: string | null;
  customerName: string;
  bpName: string;
  bpId: string;
  dpName: string;
  dpId: string;
  agreementDate: string | null;
  agreedPrice: number | null;
  weeklyDemandKg: number | null;
  expectedFirstOrderDate: string | null;
  lastDeliveryDate: string | null;
  lastDeliveryKg: number | null;
  kam: string;
  locality: string;
  localityId: string;
  address: string;
  pmContact: string;
  orderHistory: DayOrder[];
}

interface DayOrder {
  date: string;
  kg: number | null;
}

interface OrderDetail {
  orderId: string;
  deliveryDate: string;
  skuName: string;
  skuId: string;
  weightUnit: string;
  orderQty: string;
  returnedQty: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function build14DayGrid(history: DayOrder[], today: Date) {
  const todayIso = isoDate(today);
  const deliveryIso = isoDate(new Date(today.getTime() + 86400000));
  const histMap = new Map(history.map(h => [h.date, h.kg]));

  const result = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const iso = isoDate(d);
    result.push({
      date: iso,
      kg: histMap.get(iso) ?? null,
      isFuture: iso > todayIso,
      isDeliveryDate: iso === deliveryIso,
      dayOfWeek: (d.getDay() + 6) % 7,
    });
  }
  return result;
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const TODAY = new Date("2025-03-20");

function makeHistory(orderedDays: number[], kgPerDay: number): DayOrder[] {
  return Array.from({ length: 14 }, (_, idx) => {
    const i = 13 - idx;
    const d = new Date(TODAY.getTime() - i * 86400000);
    return { date: isoDate(d), kg: orderedDays.includes(i) ? kgPerDay : null };
  });
}

// Simulate the current logged-in user's email for demo
const CURRENT_USER_EMAIL = "amit@ninjacart.com";

// KAM options for dropdown
const KAM_OPTIONS = [
  "amit@ninjacart.com",
  "priya@ninjacart.com",
  "ravi@ninjacart.com",
  "sneha@ninjacart.com",
];

// Onboard Pending — signed agreements, not yet customers
const SAMPLE_ONBOARD_PENDING: Customer[] = [
  {
    entityId: "E010",
    customerId: null,
    customerName: "The Green Table",
    bpName: "XYZ Corp", bpId: "2201",
    dpName: "Dunzo", dpId: "33",
    agreementDate: "2025-03-12",
    agreedPrice: 180,
    weeklyDemandKg: 30,
    expectedFirstOrderDate: "2025-03-22",
    lastDeliveryDate: null, lastDeliveryKg: null,
    kam: "amit@ninjacart.com",
    locality: "Jayanagar", localityId: "JAY05",
    address: "4th Block, Jayanagar, Bangalore - 560041",
    pmContact: "+91 98001 23456",
    orderHistory: [],
  },
  {
    entityId: "E011",
    customerId: null,
    customerName: "Olive Café",
    bpName: "PQR Foods", bpId: "3305",
    dpName: "Swiggy Genie", dpId: "55",
    agreementDate: "2025-03-14",
    agreedPrice: 165,
    weeklyDemandKg: 20,
    expectedFirstOrderDate: "2025-03-25",
    lastDeliveryDate: null, lastDeliveryKg: null,
    kam: "priya@ninjacart.com",
    locality: "Malleshwaram", localityId: "MAL06",
    address: "11th Cross, Malleshwaram, Bangalore - 560003",
    pmContact: "+91 96543 21098",
    orderHistory: [],
  },
];

const SAMPLE_NOT_ORDERED: Customer[] = [
  {
    entityId: "123",
    customerId: "786543",
    customerName: "Urban Bistro",
    bpName: "ABC Company", bpId: "1076",
    dpName: "Scootsy", dpId: "71",
    agreementDate: "2025-02-15",
    agreedPrice: 175,
    weeklyDemandKg: 60,
    expectedFirstOrderDate: "2025-02-20",
    lastDeliveryDate: "2025-03-10", lastDeliveryKg: 15,
    kam: "amit@ninjacart.com",
    locality: "Indiranagar", localityId: "IND01",
    address: "12, 100 Feet Road, Indiranagar, Bangalore - 560038",
    pmContact: "+91 98765 43210",
    orderHistory: makeHistory([13, 11, 9, 7, 5, 3], 15),
  },
  {
    entityId: "E005",
    customerId: "786600",
    customerName: "The Spice Garden",
    bpName: "GHI Traders", bpId: "2034",
    dpName: "Dunzo", dpId: "88",
    agreementDate: "2025-02-10",
    agreedPrice: 160,
    weeklyDemandKg: 40,
    expectedFirstOrderDate: "2025-02-15",
    lastDeliveryDate: "2025-03-08", lastDeliveryKg: 10,
    kam: "ravi@ninjacart.com",
    locality: "Koramangala", localityId: "KOR02",
    address: "5th Block, Koramangala, Bangalore - 560034",
    pmContact: "+91 91234 56789",
    orderHistory: makeHistory([13, 10, 7, 4], 10),
  },
];

const SAMPLE_ACTIVE: Customer[] = [
  {
    entityId: "E002",
    customerId: null,
    customerName: "Brew House",
    bpName: "DEF Company", bpId: "1076",
    dpName: "PsyFoods", dpId: "45",
    agreementDate: "2025-01-20",
    agreedPrice: 170,
    weeklyDemandKg: 80,
    expectedFirstOrderDate: "2025-01-25",
    lastDeliveryDate: "2025-03-18", lastDeliveryKg: 20,
    kam: "priya@ninjacart.com",
    locality: "HSR Layout", localityId: "HSR03",
    address: "Sector 1, HSR Layout, Bangalore - 560102",
    pmContact: "+91 87654 32109",
    orderHistory: makeHistory([13, 12, 11, 9, 7, 5, 3, 2], 20),
  },
  {
    entityId: "E007",
    customerId: "786590",
    customerName: "Café Mosaic",
    bpName: "JKL Foods", bpId: "3012",
    dpName: "WeFast", dpId: "62",
    agreementDate: "2025-01-10",
    agreedPrice: 155,
    weeklyDemandKg: 32,
    expectedFirstOrderDate: "2025-01-15",
    lastDeliveryDate: "2025-03-19", lastDeliveryKg: 8,
    kam: "amit@ninjacart.com",
    locality: "Whitefield", localityId: "WHT04",
    address: "ITPL Main Road, Whitefield, Bangalore - 560066",
    pmContact: "+91 99887 76655",
    orderHistory: makeHistory([13, 11, 9, 7, 5, 4, 3, 2, 1, 0], 8),
  },
];

const SAMPLE_ORDER_DETAILS: OrderDetail[] = [
  {
    orderId: "ORD-2891", deliveryDate: "2025-03-18",
    skuName: "Hass Avocado", skuId: "SKU-42",
    weightUnit: "1 kg", orderQty: "₹480 × 1kg", returnedQty: null,
  },
  {
    orderId: "ORD-2765", deliveryDate: "2025-03-11",
    skuName: "Florida Avocado", skuId: "SKU-18",
    weightUnit: "500g", orderQty: "₹260 × 2kg", returnedQty: "0.5 kg",
  },
];

// ─── Calendar Grid ────────────────────────────────────────────────────────────

function CalendarGrid({ history, today }: { history: DayOrder[]; today: Date }) {
  const grid = build14DayGrid(history, today);
  const week1 = grid.slice(0, 7);
  const week2 = grid.slice(7, 14);

  const renderBox = (item: ReturnType<typeof build14DayGrid>[0], key: number) => {
    let boxClass = "";
    let content: React.ReactNode = null;

    if (item.isFuture) {
      boxClass = "bg-muted/60 text-muted-foreground/40";
    } else if (item.kg !== null) {
      boxClass = "bg-[#005c00] text-white";
      content = <span className="font-bold text-[11px] leading-none">{item.kg}kg</span>;
    } else {
      boxClass = "bg-destructive/15 border border-destructive/30 text-destructive";
    }

    return (
      <div key={key} className="relative flex flex-col items-center">
        <div
          className={`w-full aspect-square min-w-0 rounded flex flex-col items-center justify-center text-[9px] leading-tight ${boxClass}`}
        >
          {content ?? (item.isFuture ? null : <span className="opacity-50 text-[8px]">—</span>)}
        </div>
        {item.isDeliveryDate && (
          <ArrowDown className="w-2.5 h-2.5 text-primary mt-0.5 absolute -bottom-3" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 gap-1">
        {week1.map((item, i) => renderBox(item, i))}
      </div>
      <div className="grid grid-cols-7 gap-1 py-0.5">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 pb-4">
        {week2.map((item, i) => renderBox(item, i + 7))}
      </div>
      <div className="flex items-center gap-3 pt-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#005c00]" />
          <span className="text-[10px] text-muted-foreground">Ordered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-destructive/15 border border-destructive/30" />
          <span className="text-[10px] text-muted-foreground">No Order</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted/60" />
          <span className="text-[10px] text-muted-foreground">Future</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowDown className="w-3 h-3 text-primary" />
          <span className="text-[10px] text-muted-foreground">Delivery Day</span>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Visit Dialog ────────────────────────────────────────────────────

function ScheduleVisitDialog({
  customer,
  open,
  onClose,
  currentUserEmail,
}: {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
  currentUserEmail: string;
}) {
  const { toast } = useToast();
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Is the customer assigned to the current logged-in user?
  const isSelfAssigned = customer?.kam === currentUserEmail;
  // Effective assign-to: locked to kam if self-assigned, otherwise user's selection
  const effectiveAssignTo = isSelfAssigned ? (customer?.kam ?? "") : (assignTo || customer?.kam || "");

  const validate = () => {
    const e: Record<string, string> = {};
    if (!appointmentDate) e.appointmentDate = "Date of appointment is required.";
    if (!remarks.trim()) e.remarks = "Remarks are required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    toast({
      title: "Visit scheduled",
      description: `Visit for ${customer?.customerName} scheduled on ${appointmentDate}.`,
    });
    handleClose();
  };

  const handleClose = () => {
    setAppointmentDate("");
    setAppointmentTime("");
    setAssignTo("");
    setRemarks("");
    setErrors({});
    onClose();
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="w-full max-w-md sm:max-w-md h-[100dvh] sm:h-auto sm:max-h-[88vh] flex flex-col rounded-none sm:rounded-lg p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="w-4 h-4 text-primary" />
            Schedule Visit
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{customer.customerName}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Date of Appointment */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Date of Appointment <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={appointmentDate}
              onChange={e => setAppointmentDate(e.target.value)}
              min={isoDate(new Date())}
              className={errors.appointmentDate ? "border-destructive" : ""}
            />
            {errors.appointmentDate && (
              <p className="text-xs text-destructive">{errors.appointmentDate}</p>
            )}
          </div>

          {/* Time of Appointment */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Time of Appointment <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Input
              type="time"
              value={appointmentTime}
              onChange={e => setAppointmentTime(e.target.value)}
            />
          </div>

          {/* Assign To — disabled if self-assigned, dropdown otherwise */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Assign To</Label>
            {isSelfAssigned ? (
              <Input
                value={effectiveAssignTo}
                disabled
                className="bg-muted/60 text-muted-foreground cursor-not-allowed"
              />
            ) : (
              <Select value={effectiveAssignTo} onValueChange={setAssignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent..." />
                </SelectTrigger>
                <SelectContent>
                  {KAM_OPTIONS.map(k => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isSelfAssigned && (
              <p className="text-xs text-muted-foreground">Assigned to you — cannot be changed here</p>
            )}
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Remarks <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Enter remarks for this visit..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className={`min-h-[90px] ${errors.remarks ? "border-destructive" : ""}`}
            />
            {errors.remarks && (
              <p className="text-xs text-destructive">{errors.remarks}</p>
            )}
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t shrink-0 flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#005c00] hover:bg-[#004800] text-white flex-1 sm:flex-none"
          >
            <CalendarDays className="w-4 h-4 mr-1.5" />
            Save and Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log Visit Dialog ─────────────────────────────────────────────────────────

const VISIT_REASONS = [
  { id: "regular", label: "Regular Visit" },
  { id: "dropout_retention", label: "Dropout Retention" },
  { id: "quality_issue", label: "Quality Issue" },
  { id: "delivery_issue", label: "Delivery Issue" },
];

function LogVisitDialog({
  customer,
  open,
  onClose,
}: {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [orderStatus, setOrderStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showOrders, setShowOrders] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasOrders = !!customer?.lastDeliveryDate;

  const toggleReason = (id: string) => {
    setSelectedReasons(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (selectedReasons.length === 0) e.reasons = "Select at least one reason.";
    if (!orderStatus) e.orderStatus = "Order status is required.";
    if (!remarks.trim()) e.remarks = "Remarks are required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    toast({ title: "Visit logged", description: `Visit for ${customer?.customerName} saved.` });
    handleClose();
  };

  const handleClose = () => {
    setSelectedReasons([]);
    setOrderStatus("");
    setRemarks("");
    setShowOrders(false);
    setErrors({});
    onClose();
  };

  if (!customer) return null;

  const mapsUrl = `https://maps.google.com/maps?saddr=My+Location&daddr=${encodeURIComponent(customer.address)}`;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="w-full max-w-lg sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-lg p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-4 h-4 text-primary" />
            Log Visit
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Section 1 – Customer Info */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Customer Info</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Entity ID</p>
                <p className="font-mono font-medium text-sm">{customer.entityId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Customer ID</p>
                <p className="font-mono font-medium text-sm">{customer.customerId ?? "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-0.5">Customer Name</p>
                <p className="font-semibold text-base">{customer.customerName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm bg-muted/40 rounded-md px-3 py-2">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">PM Contact</span>
              <a
                href={`tel:${customer.pmContact.replace(/\s/g, "")}`}
                className="text-primary font-medium flex items-center gap-1 text-sm hover:underline ml-auto"
              >
                {customer.pmContact} 📞
              </a>
            </div>

            <div className="flex items-start gap-2 text-sm bg-muted/40 rounded-md px-3 py-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm">{customer.locality}</span>
                <span className="text-muted-foreground text-xs ml-1">({customer.localityId})</span>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{customer.address}</p>
              </div>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 ml-2">
                <Button variant="outline" size="icon" className="h-7 w-7">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                </Button>
              </a>
            </div>
          </section>

          <div className="border-t border-dashed" />

          {/* Section 2 – Order History */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Delivery History</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Last Delivered Date</p>
                <p className="font-medium">{customer.lastDeliveryDate ? formatDate(customer.lastDeliveryDate) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Last Delivered Kg</p>
                <p className="font-medium">{customer.lastDeliveryKg !== null ? `${customer.lastDeliveryKg} kg` : "—"}</p>
              </div>
            </div>
            <div className="bg-muted/30 rounded-md p-3">
              <CalendarGrid history={customer.orderHistory} today={TODAY} />
            </div>
          </section>

          {/* Section 3 – Order Details (expandable) */}
          <section>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasOrders}
              onClick={() => setShowOrders(v => !v)}
              className="w-full flex items-center justify-between text-xs"
            >
              <span>View Order Details</span>
              {showOrders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
            {showOrders && (
              <div className="mt-2 rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">Order ID</th>
                        <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">Delivery</th>
                        <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">SKU</th>
                        <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">Qty</th>
                        <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">Returned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {SAMPLE_ORDER_DETAILS.map(od => (
                        <tr key={od.orderId} className="hover:bg-muted/30">
                          <td className="px-2 py-1.5 font-mono">{od.orderId}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(od.deliveryDate)}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{od.skuName} ({od.skuId}) · {od.weightUnit}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{od.orderQty}</td>
                          <td className="px-2 py-1.5">{od.returnedQty ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <div className="border-t border-dashed" />

          {/* Section 4 – Visit Input */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Visit Details</h3>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Reason for Visit <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-col gap-2.5">
                {VISIT_REASONS.map(r => (
                  <div key={r.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`reason-${r.id}`}
                      checked={selectedReasons.includes(r.id)}
                      onCheckedChange={() => toggleReason(r.id)}
                    />
                    <label htmlFor={`reason-${r.id}`} className="text-sm cursor-pointer select-none">
                      {r.label}
                    </label>
                  </div>
                ))}
              </div>
              {errors.reasons && <p className="text-xs text-destructive">{errors.reasons}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Order Status <span className="text-destructive">*</span>
              </Label>
              <Select value={orderStatus} onValueChange={setOrderStatus}>
                <SelectTrigger className={errors.orderStatus ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select order status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placed">Already placed</SelectItem>
                  <SelectItem value="will_not_place">Will not place</SelectItem>
                  <SelectItem value="not_expected">Not expected today</SelectItem>
                </SelectContent>
              </Select>
              {errors.orderStatus && <p className="text-xs text-destructive">{errors.orderStatus}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Remarks <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Enter visit remarks..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className={`min-h-[80px] ${errors.remarks ? "border-destructive" : ""}`}
              />
              {errors.remarks && <p className="text-xs text-destructive">{errors.remarks}</p>}
            </div>
          </section>
        </div>

        <DialogFooter className="px-5 py-3 border-t shrink-0 flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="flex-1 sm:flex-none">Cancel</Button>
          <Button
            onClick={handleSave}
            className="bg-[#005c00] hover:bg-[#004800] text-white flex-1 sm:flex-none"
          >
            <ClipboardList className="w-4 h-4 mr-1.5" />
            Save and Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Action Buttons ───────────────────────────────────────────────────────────

function ActionButtons({
  customer,
  currentUserEmail,
  onLogVisit,
  onScheduleVisit,
}: {
  customer: Customer;
  currentUserEmail: string;
  onLogVisit: (c: Customer) => void;
  onScheduleVisit: (c: Customer) => void;
}) {
  const isSelfAssigned = customer.kam === currentUserEmail;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Button
        size="sm"
        disabled={!isSelfAssigned}
        className="bg-[#005c00] hover:bg-[#004800] text-white whitespace-nowrap text-xs h-7 px-2.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-auto"
        onClick={() => isSelfAssigned && onLogVisit(customer)}
      >
        <ClipboardList className="w-3 h-3 mr-1" />
        Log Visit
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="whitespace-nowrap text-xs h-7 px-2.5 border-primary text-primary hover:bg-primary/10"
        onClick={() => onScheduleVisit(customer)}
      >
        <CalendarDays className="w-3 h-3 mr-1" />
        Schedule Visit
      </Button>
    </div>
  );
}

// ─── Desktop Table: Onboard Pending ──────────────────────────────────────────

function OnboardPendingTable({
  customers,
  currentUserEmail,
  onLogVisit,
  onScheduleVisit,
}: {
  customers: Customer[];
  currentUserEmail: string;
  onLogVisit: (c: Customer) => void;
  onScheduleVisit: (c: Customer) => void;
}) {
  const headers = (
    <tr className="bg-muted/60 border-b">
      <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Entity ID</th>
      <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Entity Name</th>
      <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Agreement Date</th>
      <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Agreed Price (₹/kg)</th>
      <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Weekly Demand (kg)</th>
      <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">DP</th>
      <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Expected 1st Order</th>
      <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Assigned To</th>
      <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Action</th>
    </tr>
  );

  if (customers.length === 0) {
    return (
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>{headers}</thead>
            <tbody>
              <tr>
                <td colSpan={9} className="px-3 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 text-[#005c00] opacity-70" />
                    <p className="font-semibold text-base text-foreground">✓ All Leads onboarded!</p>
                    <p className="text-sm">No pending onboarding at the moment.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>{headers}</thead>
          <tbody className="divide-y divide-border">
            {customers.map(c => (
              <tr key={c.entityId} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2.5 font-mono text-xs">{c.entityId}</td>
                <td className="px-3 py-2.5 font-medium whitespace-nowrap">{c.customerName}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                  {c.agreementDate ? formatDate(c.agreementDate) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {c.agreedPrice !== null ? `₹${c.agreedPrice}` : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {c.weeklyDemandKg !== null ? `${c.weeklyDemandKg} kg` : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs">{c.dpName} ({c.dpId})</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                  {c.expectedFirstOrderDate ? formatDate(c.expectedFirstOrderDate) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <UserCheck className="w-3 h-3 shrink-0" />
                    <span>{c.kam}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <ActionButtons
                    customer={c}
                    currentUserEmail={currentUserEmail}
                    onLogVisit={onLogVisit}
                    onScheduleVisit={onScheduleVisit}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Desktop Table: Regular tabs ─────────────────────────────────────────────

function CustomerTableDesktop({
  customers,
  currentUserEmail,
  onLogVisit,
  onScheduleVisit,
}: {
  customers: Customer[];
  currentUserEmail: string;
  onLogVisit: (c: Customer) => void;
  onScheduleVisit: (c: Customer) => void;
}) {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <Users className="w-10 h-10 mb-3 opacity-30" />
        <p className="font-medium">No customers found</p>
        <p className="text-sm">Try adjusting your search or filter.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b">
              <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Entity ID</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Customer ID</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Customer Name</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">BP Name (ID)</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">DP Name (ID)</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Last Delivery Date</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Last Order Kg</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Assigned To</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.map(c => (
              <tr key={c.entityId} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2.5 font-mono text-xs">{c.entityId}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                  {c.customerId ?? "—"}
                </td>
                <td className="px-3 py-2.5 font-medium whitespace-nowrap">{c.customerName}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs">{c.bpName} ({c.bpId})</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs">{c.dpName} ({c.dpId})</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                  {c.lastDeliveryDate ? formatDate(c.lastDeliveryDate) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {c.lastDeliveryKg !== null ? `${c.lastDeliveryKg} kg` : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <UserCheck className="w-3 h-3 shrink-0" />
                    <span>{c.kam}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <ActionButtons
                    customer={c}
                    currentUserEmail={currentUserEmail}
                    onLogVisit={onLogVisit}
                    onScheduleVisit={onScheduleVisit}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Mobile Card View ─────────────────────────────────────────────────────────

function CustomerCardsMobile({
  customers,
  currentUserEmail,
  onLogVisit,
  onScheduleVisit,
  isOnboardPending = false,
}: {
  customers: Customer[];
  currentUserEmail: string;
  onLogVisit: (c: Customer) => void;
  onScheduleVisit: (c: Customer) => void;
  isOnboardPending?: boolean;
}) {
  if (customers.length === 0) {
    if (isOnboardPending) {
      return (
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 px-4 py-2 flex gap-2 text-xs font-semibold text-muted-foreground">
            <span className="flex-1">Entity</span>
            <span>Agreement</span>
          </div>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#005c00] opacity-70 mb-2" />
            <p className="font-semibold text-base text-foreground">✓ All Leads onboarded!</p>
            <p className="text-sm text-muted-foreground">No pending onboarding at the moment.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <Users className="w-10 h-10 mb-3 opacity-30" />
        <p className="font-medium">No customers found</p>
        <p className="text-sm">Try adjusting your search or filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {customers.map(c => (
        <Card key={c.entityId} className="overflow-hidden">
          <CardContent className="p-0">
            {/* Card header */}
            <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b bg-muted/30">
              <div>
                <p className="font-semibold text-sm leading-tight">{c.customerName}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.entityId}</p>
              </div>
              {c.customerId && (
                <p className="text-xs font-mono text-muted-foreground">{c.customerId}</p>
              )}
            </div>

            {/* Card body */}
            <div className="px-4 py-3 space-y-2">
              {isOnboardPending ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Agreement Date</p>
                    <p className="font-medium">{c.agreementDate ? formatDate(c.agreementDate) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Agreed Price</p>
                    <p className="font-medium">{c.agreedPrice !== null ? `₹${c.agreedPrice}/kg` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Weekly Demand</p>
                    <p className="font-medium">{c.weeklyDemandKg !== null ? `${c.weeklyDemandKg} kg` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">DP</p>
                    <p className="font-medium">{c.dpName} ({c.dpId})</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expected 1st Order</p>
                    <p className="font-medium">{c.expectedFirstOrderDate ? formatDate(c.expectedFirstOrderDate) : "—"}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">BP</p>
                    <p className="font-medium">{c.bpName} ({c.bpId})</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">DP</p>
                    <p className="font-medium">{c.dpName} ({c.dpId})</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Delivery Date</p>
                    <p className="font-medium">{c.lastDeliveryDate ? formatDate(c.lastDeliveryDate) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Order Kg</p>
                    <p className="font-medium">{c.lastDeliveryKg !== null ? `${c.lastDeliveryKg} kg` : "—"}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
                <UserCheck className="w-3 h-3 shrink-0" />
                <span>{c.kam}</span>
              </div>
            </div>

            {/* Card footer */}
            <div className="px-4 pb-3 flex gap-2 flex-wrap">
              <Button
                size="sm"
                disabled={c.kam !== currentUserEmail}
                className="flex-1 bg-[#005c00] hover:bg-[#004800] text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-auto"
                onClick={() => c.kam === currentUserEmail && onLogVisit(c)}
              >
                <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
                Log Visit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-primary text-primary hover:bg-primary/10 text-xs"
                onClick={() => onScheduleVisit(c)}
              >
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                Schedule Visit
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [logVisitOpen, setLogVisitOpen] = useState(false);
  const [scheduleVisitOpen, setScheduleVisitOpen] = useState(false);
  const isMobile = useIsMobile();

  // Use logged-in user email, fall back to demo value
  const currentUserEmail = user?.email ?? CURRENT_USER_EMAIL;

  const allCustomers = useMemo(() => [
    ...SAMPLE_ONBOARD_PENDING,
    ...SAMPLE_NOT_ORDERED,
    ...SAMPLE_ACTIVE,
  ], []);

  const agents = useMemo(() => {
    const set = new Set(allCustomers.map(c => c.kam));
    return Array.from(set).sort();
  }, [allCustomers]);

  const filter = (list: Customer[]) =>
    list.filter(c => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        c.customerName.toLowerCase().includes(q) ||
        c.entityId.toLowerCase().includes(q) ||
        (c.customerId ?? "").toLowerCase().includes(q);
      const matchAgent = agentFilter === "all" || c.kam === agentFilter;
      return matchSearch && matchAgent;
    });

  const handleLogVisit = (c: Customer) => {
    setSelectedCustomer(c);
    setLogVisitOpen(true);
  };

  const handleScheduleVisit = (c: Customer) => {
    setSelectedCustomer(c);
    setScheduleVisitOpen(true);
  };

  const onboardFiltered = filter(SAMPLE_ONBOARD_PENDING);
  const notOrderedFiltered = filter(SAMPLE_NOT_ORDERED);
  const activeFiltered = filter(SAMPLE_ACTIVE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Step 5: Customers</h1>
          <p className="text-sm text-muted-foreground">Converted customers from signed agreements</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {allCustomers.length} Total
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs — default is "not_ordered" (Current Week Not Ordered) */}
      <Tabs defaultValue="not_ordered">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="onboard_pending" className="flex-1 sm:flex-none">
            Onboard Pending
            {onboardFiltered.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{onboardFiltered.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="not_ordered" className="flex-1 sm:flex-none">
            Current Week Not Ordered
            <Badge variant="secondary" className="ml-1.5 text-xs">{notOrderedFiltered.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1 sm:flex-none">
            Active Customers
            <Badge variant="secondary" className="ml-1.5 text-xs">{activeFiltered.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="onboard_pending" className="mt-4">
          {isMobile ? (
            <CustomerCardsMobile
              customers={onboardFiltered}
              currentUserEmail={currentUserEmail}
              onLogVisit={handleLogVisit}
              onScheduleVisit={handleScheduleVisit}
              isOnboardPending={true}
            />
          ) : (
            <OnboardPendingTable
              customers={onboardFiltered}
              currentUserEmail={currentUserEmail}
              onLogVisit={handleLogVisit}
              onScheduleVisit={handleScheduleVisit}
            />
          )}
        </TabsContent>
        <TabsContent value="not_ordered" className="mt-4">
          {isMobile ? (
            <CustomerCardsMobile
              customers={notOrderedFiltered}
              currentUserEmail={currentUserEmail}
              onLogVisit={handleLogVisit}
              onScheduleVisit={handleScheduleVisit}
            />
          ) : (
            <CustomerTableDesktop
              customers={notOrderedFiltered}
              currentUserEmail={currentUserEmail}
              onLogVisit={handleLogVisit}
              onScheduleVisit={handleScheduleVisit}
            />
          )}
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          {isMobile ? (
            <CustomerCardsMobile
              customers={activeFiltered}
              currentUserEmail={currentUserEmail}
              onLogVisit={handleLogVisit}
              onScheduleVisit={handleScheduleVisit}
            />
          ) : (
            <CustomerTableDesktop
              customers={activeFiltered}
              currentUserEmail={currentUserEmail}
              onLogVisit={handleLogVisit}
              onScheduleVisit={handleScheduleVisit}
            />
          )}
        </TabsContent>
      </Tabs>

      <LogVisitDialog
        customer={selectedCustomer}
        open={logVisitOpen}
        onClose={() => setLogVisitOpen(false)}
      />
      <ScheduleVisitDialog
        customer={selectedCustomer}
        open={scheduleVisitOpen}
        onClose={() => setScheduleVisitOpen(false)}
        currentUserEmail={currentUserEmail}
      />
    </div>
  );
}
