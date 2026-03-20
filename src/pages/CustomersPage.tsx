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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Phone, MapPin, ClipboardList, ChevronDown, ChevronUp,
  CalendarDays, ArrowDown, Users, UserCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Customer {
  entityId: string;
  customerId: string | null;
  customerName: string;
  bpName: string;
  bpId: string;
  dpName: string;
  dpId: string;
  lastOrderDate: string | null;
  lastOrderKg: number | null;
  kam: string;
  locality: string;
  localityId: string;
  address: string;
  pmContact: string;
  orderHistory: DayOrder[]; // 14 days ending today
}

interface DayOrder {
  date: string; // ISO yyyy-MM-dd
  kg: number | null; // null = no order, number = ordered
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Mon
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Build 14-day history grid: days [0..6] = week-2, [7..13] = week-1 (last week + current)
function build14DayGrid(history: DayOrder[], today: Date): {
  date: string;
  kg: number | null;
  isFuture: boolean;
  isDeliveryDate: boolean;
  dayOfWeek: number; // 0=Mon..6=Sun
}[] {
  const todayIso = isoDate(today);
  const deliveryDate = isoDate(new Date(today.getTime() + 86400000));
  const histMap = new Map(history.map(h => [h.date, h.kg]));

  const result = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const iso = isoDate(d);
    const dayOfWeek = (d.getDay() + 6) % 7; // 0=Mon..6=Sun
    result.push({
      date: iso,
      kg: histMap.get(iso) ?? null,
      isFuture: iso > todayIso,
      isDeliveryDate: iso === deliveryDate,
      dayOfWeek,
    });
  }
  return result;
}

// ─── Sample data ────────────────────────────────────────────────────────────

const TODAY = new Date("2025-03-20");

function makeHistory(orderedDays: number[], kgPerDay: number): DayOrder[] {
  const history: DayOrder[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(TODAY.getTime() - i * 86400000);
    const iso = isoDate(d);
    history.push({ date: iso, kg: orderedDays.includes(i) ? kgPerDay : null });
  }
  return history;
}

const SAMPLE_NOT_ORDERED: Customer[] = [
  {
    entityId: "123",
    customerId: "786543",
    customerName: "Urban Bistro",
    bpName: "ABC Company",
    bpId: "1076",
    dpName: "Scootsy",
    dpId: "71",
    lastOrderDate: "2025-03-10",
    lastOrderKg: 15,
    kam: "amit@ninjacart.com",
    locality: "Indiranagar",
    localityId: "IND01",
    address: "12, 100 Feet Road, Indiranagar, Bangalore - 560038",
    pmContact: "+91 98765 43210",
    orderHistory: makeHistory([13, 11, 9, 7, 5, 3], 15),
  },
  {
    entityId: "E005",
    customerId: "786600",
    customerName: "The Spice Garden",
    bpName: "GHI Traders",
    bpId: "2034",
    dpName: "Dunzo",
    dpId: "88",
    lastOrderDate: "2025-03-08",
    lastOrderKg: 10,
    kam: "ravi@ninjacart.com",
    locality: "Koramangala",
    localityId: "KOR02",
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
    bpName: "DEF Company",
    bpId: "1076",
    dpName: "PsyFoods",
    dpId: "45",
    lastOrderDate: "2025-03-18",
    lastOrderKg: 20,
    kam: "priya@ninjacart.com",
    locality: "HSR Layout",
    localityId: "HSR03",
    address: "Sector 1, HSR Layout, Bangalore - 560102",
    pmContact: "+91 87654 32109",
    orderHistory: makeHistory([13, 12, 11, 9, 7, 5, 3, 2], 20),
  },
  {
    entityId: "E007",
    customerId: "786590",
    customerName: "Café Mosaic",
    bpName: "JKL Foods",
    bpId: "3012",
    dpName: "WeFast",
    dpId: "62",
    lastOrderDate: "2025-03-19",
    lastOrderKg: 8,
    kam: "amit@ninjacart.com",
    locality: "Whitefield",
    localityId: "WHT04",
    address: "ITPL Main Road, Whitefield, Bangalore - 560066",
    pmContact: "+91 99887 76655",
    orderHistory: makeHistory([13, 11, 9, 7, 5, 4, 3, 2, 1, 0], 8),
  },
];

const SAMPLE_ORDER_DETAILS: OrderDetail[] = [
  {
    orderId: "ORD-2891",
    deliveryDate: "2025-03-18",
    skuName: "Hass Avocado",
    skuId: "SKU-42",
    weightUnit: "1 kg",
    orderQty: "₹480 × 1kg",
    returnedQty: null,
  },
  {
    orderId: "ORD-2765",
    deliveryDate: "2025-03-11",
    skuName: "Florida Avocado",
    skuId: "SKU-18",
    weightUnit: "500g",
    orderQty: "₹260 × 2kg",
    returnedQty: "0.5 kg",
  },
];

// ─── CalendarGrid Component ─────────────────────────────────────────────────

function CalendarGrid({ history, today }: { history: DayOrder[]; today: Date }) {
  const grid = build14DayGrid(history, today);
  // Split into two weeks
  const week1 = grid.slice(0, 7); // older week
  const week2 = grid.slice(7, 14); // recent week

  const renderBox = (item: (typeof grid)[0], idx: number) => {
    let boxClass = "";
    let content: React.ReactNode = null;

    if (item.isFuture) {
      boxClass = "bg-muted text-muted-foreground";
    } else if (item.kg !== null) {
      boxClass = "bg-success text-success-foreground";
      content = <span className="font-semibold text-[10px] leading-none">{item.kg}kg</span>;
    } else {
      boxClass = "bg-destructive/20 text-destructive";
    }

    return (
      <div key={idx} className="flex flex-col items-center gap-0.5">
        <div
          className={`w-9 h-9 rounded flex flex-col items-center justify-center text-[9px] leading-tight relative ${boxClass}`}
        >
          <span className="text-[9px] opacity-70">{formatDate(item.date)}</span>
          {content}
          {item.isDeliveryDate && (
            <ArrowDown className="absolute -bottom-3 w-3 h-3 text-primary" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Week 1 (older) */}
      <div className="grid grid-cols-7 gap-1">
        {week1.map((item, i) => renderBox(item, i))}
      </div>
      {/* Day labels row */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground">{d}</div>
        ))}
      </div>
      {/* Week 2 (recent) */}
      <div className="grid grid-cols-7 gap-1 mt-1">
        {week2.map((item, i) => renderBox(item, i + 7))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 pt-1 flex-wrap">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-success" /><span className="text-[10px] text-muted-foreground">Ordered</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-destructive/20" /><span className="text-[10px] text-muted-foreground">No Order</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted" /><span className="text-[10px] text-muted-foreground">Future</span></div>
        <div className="flex items-center gap-1"><ArrowDown className="w-3 h-3 text-primary" /><span className="text-[10px] text-muted-foreground">Delivery Day</span></div>
      </div>
    </div>
  );
}

// ─── Log Visit Dialog ───────────────────────────────────────────────────────

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

  const hasOrders = customer?.lastOrderDate !== null;

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
    onClose();
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-4 h-4 text-primary" />
            Log Visit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* Section 1: Customer Info */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer Info</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Entity ID</p>
                <p className="font-medium">{customer.entityId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Customer ID</p>
                <p className="font-medium">{customer.customerId ?? "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Customer Name</p>
                <p className="font-semibold">{customer.customerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">PM Contact:</span>
              <a
                href={`tel:${customer.pmContact.replace(/\s/g, "")}`}
                className="text-primary font-medium flex items-center gap-1 text-sm hover:underline"
              >
                {customer.pmContact} 📞
              </a>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-muted-foreground text-xs">Location: </span>
                <span className="font-medium">{customer.locality} ({customer.localityId})</span>
                <p className="text-xs text-muted-foreground truncate">{customer.address}</p>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Button variant="outline" size="icon" className="h-7 w-7">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                </Button>
              </a>
            </div>
          </section>

          <div className="border-t border-dashed" />

          {/* Section 2: Order History */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order History</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Last Order Date</p>
                <p className="font-medium">
                  {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Order Kg</p>
                <p className="font-medium">
                  {customer.lastOrderKg !== null ? `${customer.lastOrderKg} kg` : "—"}
                </p>
              </div>
            </div>
            <CalendarGrid history={customer.orderHistory} today={TODAY} />
          </section>

          {/* Section 3: View Order Details */}
          <section>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasOrders}
              onClick={() => setShowOrders(v => !v)}
              className="w-full flex items-center justify-between"
            >
              <span>View Order Details</span>
              {showOrders ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {showOrders && (
              <div className="mt-2 rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">Order ID</th>
                        <th className="px-2 py-1.5 text-left font-medium">Delivery</th>
                        <th className="px-2 py-1.5 text-left font-medium">SKU</th>
                        <th className="px-2 py-1.5 text-left font-medium">Qty</th>
                        <th className="px-2 py-1.5 text-left font-medium">Returned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {SAMPLE_ORDER_DETAILS.map(od => (
                        <tr key={od.orderId}>
                          <td className="px-2 py-1.5 font-mono">{od.orderId}</td>
                          <td className="px-2 py-1.5">{formatDate(od.deliveryDate)}</td>
                          <td className="px-2 py-1.5">{od.skuName} ({od.skuId}) · {od.weightUnit}</td>
                          <td className="px-2 py-1.5">{od.orderQty}</td>
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

          {/* Section 4: Visit Input */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visit Details</h3>

            {/* Reason for Visit */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Reason for Visit <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {VISIT_REASONS.map(r => (
                  <div key={r.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`reason-${r.id}`}
                      checked={selectedReasons.includes(r.id)}
                      onCheckedChange={() => toggleReason(r.id)}
                    />
                    <label htmlFor={`reason-${r.id}`} className="text-sm cursor-pointer">
                      {r.label}
                    </label>
                  </div>
                ))}
              </div>
              {errors.reasons && <p className="text-xs text-destructive">{errors.reasons}</p>}
            </div>

            {/* Order Status */}
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

            {/* Remarks */}
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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            className="bg-[#005c00] hover:bg-[#004800] text-white"
          >
            <ClipboardList className="w-4 h-4 mr-1.5" />
            Save and Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Customer Row ────────────────────────────────────────────────────────────

function CustomerTable({
  customers,
  onLogVisit,
}: {
  customers: Customer[];
  onLogVisit: (c: Customer) => void;
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
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Entity ID</TableHead>
            <TableHead className="whitespace-nowrap">Customer ID</TableHead>
            <TableHead className="whitespace-nowrap">Customer Name</TableHead>
            <TableHead className="whitespace-nowrap">BP Name (ID)</TableHead>
            <TableHead className="whitespace-nowrap">DP Name (ID)</TableHead>
            <TableHead className="whitespace-nowrap">Last Order Date</TableHead>
            <TableHead className="whitespace-nowrap">Last Order Kg</TableHead>
            <TableHead className="whitespace-nowrap">Assigned To</TableHead>
            <TableHead className="whitespace-nowrap">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map(c => (
            <TableRow key={c.entityId}>
              <TableCell className="font-mono text-xs">{c.entityId}</TableCell>
              <TableCell>
                {c.customerId ? (
                  <Badge variant="outline" className="font-mono text-xs">{c.customerId}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="font-medium whitespace-nowrap">{c.customerName}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">{c.bpName} ({c.bpId})</TableCell>
              <TableCell className="whitespace-nowrap text-sm">{c.dpName} ({c.dpId})</TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {c.lastOrderDate ? formatDate(c.lastOrderDate) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-sm">
                {c.lastOrderKg !== null ? `${c.lastOrderKg} kg` : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{c.kam}</span>
                </div>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  className="bg-[#005c00] hover:bg-[#004800] text-white whitespace-nowrap"
                  onClick={() => onLogVisit(c)}
                >
                  <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
                  Log Visit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const allCustomers = useMemo(() => [...SAMPLE_NOT_ORDERED, ...SAMPLE_ACTIVE], []);
  const agents = useMemo(() => {
    const set = new Set(allCustomers.map(c => c.kam));
    return Array.from(set).sort();
  }, [allCustomers]);

  const filter = (list: Customer[]) =>
    list.filter(c => {
      const matchSearch =
        !search ||
        c.customerName.toLowerCase().includes(search.toLowerCase()) ||
        c.entityId.toLowerCase().includes(search.toLowerCase()) ||
        (c.customerId ?? "").toLowerCase().includes(search.toLowerCase());
      const matchAgent = agentFilter === "all" || c.kam === agentFilter;
      return matchSearch && matchAgent;
    });

  const handleLogVisit = (c: Customer) => {
    setSelectedCustomer(c);
    setDialogOpen(true);
  };

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
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-48">
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

      {/* Tabs */}
      <Tabs defaultValue="not_ordered">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="not_ordered" className="flex-1 sm:flex-none">
            Current Week Not Ordered
            <Badge variant="secondary" className="ml-1.5 text-xs">{SAMPLE_NOT_ORDERED.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1 sm:flex-none">
            Active Customers
            <Badge variant="secondary" className="ml-1.5 text-xs">{SAMPLE_ACTIVE.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="not_ordered" className="mt-4">
          <CustomerTable customers={filter(SAMPLE_NOT_ORDERED)} onLogVisit={handleLogVisit} />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <CustomerTable customers={filter(SAMPLE_ACTIVE)} onLogVisit={handleLogVisit} />
        </TabsContent>
      </Tabs>

      <LogVisitDialog
        customer={selectedCustomer}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
