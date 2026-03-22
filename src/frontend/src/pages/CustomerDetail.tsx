import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Pencil,
  Printer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Page } from "../App";
import { Status } from "../backend";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";

interface Props {
  navigate: (p: Page) => void;
  tokenId: string;
}

function statusColor(status: Status): string {
  if (status === Status.pending)
    return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (status === Status.in_process)
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  return "bg-green-500/20 text-green-400 border-green-500/30";
}
function statusLabel(status: Status): string {
  if (status === Status.pending) return "Pending";
  if (status === Status.in_process) return "In-Process";
  return "Completed";
}
function formatDate(ts?: bigint): string {
  if (!ts) return "—";
  return new Date(Number(ts)).toLocaleDateString("en-IN");
}

export function CustomerDetail({ navigate, tokenId }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();

  const { data: c, isLoading } = useQuery({
    queryKey: ["customer", tokenId],
    queryFn: () => actor!.getCustomer(tokenId),
    enabled: !!actor,
  });

  const deleteMut = useMutation({
    mutationFn: () => actor!.softDeleteCustomer(tokenId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Deleted");
      navigate({ name: "customers" });
    },
    onError: () => toast.error("Failed to delete"),
  });

  if (isLoading || !c) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const phone = c.phone.replace(/\D/g, "");
  const expiryStr = formatDate(c.expiryDate);
  const waMsg = `Hello ${c.name}, this is a reminder from DSK. Your ${c.serviceType} is due for renewal on ${expiryStr}. Please contact us soon.`;
  const waLink = `https://wa.me/91${phone}?text=${encodeURIComponent(waMsg)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(tokenId)}`;

  const printInvoice = () => {
    const w = window.open("", "_blank")!;
    w.document.write(`
      <html><head><title>DSK Invoice - ${c.tokenId}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto}
      h1{color:#333;border-bottom:2px solid #f59e0b;padding-bottom:10px}
      .header{text-align:center;margin-bottom:20px}
      .field{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
      .label{color:#666;font-size:14px}.value{font-weight:bold;font-size:14px}
      .total{background:#f9f9f9;padding:10px;border-radius:6px;margin-top:10px}
      @media print{button{display:none}}
      </style></head><body>
      <div class="header"><h1>Document Seva Kendra</h1><p style="color:#666">Invoice / Receipt</p></div>
      <div class="field"><span class="label">Token ID</span><span class="value">${c.tokenId}</span></div>
      <div class="field"><span class="label">Customer Name</span><span class="value">${c.name}</span></div>
      <div class="field"><span class="label">Phone</span><span class="value">${c.phone}</span></div>
      <div class="field"><span class="label">Service</span><span class="value">${c.serviceType}</span></div>
      <div class="field"><span class="label">Application No</span><span class="value">${c.applicationNo ?? "—"}</span></div>
      <div class="field"><span class="label">Application Date</span><span class="value">${formatDate(c.applicationDate)}</span></div>
      <div class="field"><span class="label">Status</span><span class="value">${statusLabel(c.currentStatus)}</span></div>
      <div class="total">
        <div class="field"><span class="label">Total Charged</span><span class="value">&#8377;${c.totalCharged.toFixed(2)}</span></div>
        <div class="field"><span class="label">Govt Fees</span><span class="value">&#8377;${c.govtFees.toFixed(2)}</span></div>
        <div class="field"><span class="label">Advance Paid</span><span class="value">&#8377;${c.advancePaid.toFixed(2)}</span></div>
        <div class="field"><span class="label">Balance Due</span><span class="value" style="color:${c.balanceDue > 0 ? "#ef4444" : "#22c55e"}">&#8377;${c.balanceDue.toFixed(2)}</span></div>
      </div>
      <p style="text-align:center;color:#999;font-size:12px;margin-top:20px">Thank you for your business! &mdash; DSK</p>
      <button onclick="window.print()" style="display:block;margin:20px auto;padding:10px 20px;background:#f59e0b;border:none;border-radius:6px;cursor:pointer;font-weight:bold">Print Invoice</button>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ name: "customers" })}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{c.name}</h1>
            <span className="text-amber-400 font-mono text-sm font-bold">
              {c.tokenId}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ name: "customer-edit", tokenId })}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Delete?")) deleteMut.mutate();
            }}
            className="border-red-800 text-red-400 hover:bg-red-900/30"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={() => window.open(waLink, "_blank")}
          className="bg-green-700 hover:bg-green-600 text-white"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp Reminder
        </Button>
        <Button
          onClick={printInvoice}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Invoice
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Customer Info */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Customer Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={c.name} />
            <Row label="Phone" value={c.phone} />
            <Row label="App No" value={c.applicationNo ?? "—"} />
          </CardContent>
        </Card>

        {/* Service */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Category" value={c.serviceCategory} />
            <Row label="Service" value={c.serviceType} />
            <Row label="Status">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(c.currentStatus)}`}
              >
                {statusLabel(c.currentStatus)}
              </span>
            </Row>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Applied" value={formatDate(c.applicationDate)} />
            <Row label="Delivery" value={formatDate(c.deliveryDate)} />
            <Row label="Expiry" value={formatDate(c.expiryDate)} />
          </CardContent>
        </Card>

        {/* Financials */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label="Total Charged"
              value={`₹${c.totalCharged.toFixed(2)}`}
            />
            <Row label="Govt Fees" value={`₹${c.govtFees.toFixed(2)}`} />
            <Row
              label="Net Profit"
              value={`₹${c.netProfit.toFixed(2)}`}
              valueClass="text-green-400"
            />
            <Row label="Advance Paid" value={`₹${c.advancePaid.toFixed(2)}`} />
            <Row
              label="Balance Due"
              value={`₹${c.balanceDue.toFixed(2)}`}
              valueClass={c.balanceDue > 0 ? "text-red-400" : "text-green-400"}
            />
          </CardContent>
        </Card>
      </div>

      {/* QR Code */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">QR Code</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <img
            src={qrUrl}
            alt={`QR for ${tokenId}`}
            className="w-24 h-24 rounded-lg bg-white p-1"
          />
          <div>
            <div className="text-white font-mono font-bold">{c.tokenId}</div>
            <div className="text-slate-400 text-xs mt-1">
              Scan to view customer record
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {c.notes && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 text-sm">{c.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {c.documentBlobIds.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">
              Documents ({c.documentBlobIds.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {c.documentBlobIds.map((blob, i) => (
              <div
                key={blob.getDirectURL() || String(i)}
                className="flex items-center justify-between p-2 bg-slate-700 rounded"
              >
                <span className="text-slate-300 text-sm">Document {i + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-400 hover:text-blue-300 h-7"
                  onClick={() => window.open(blob.getDirectURL(), "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  View
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
  children,
}: {
  label: string;
  value?: string;
  valueClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      {children ?? (
        <span className={`text-white font-medium ${valueClass ?? ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}
