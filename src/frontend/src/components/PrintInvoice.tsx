import { X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { CustomerRecord, RenewalRecord } from "../backend";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

const DSK_LOGO = "/assets/uploads/dsk-logo-new.png";

interface PrintInvoiceProps {
  customer: CustomerRecord;
  renewal?: RenewalRecord | null;
  onClose?: () => void;
}

type H2CFunc = (
  el: HTMLElement,
  opts?: Record<string, unknown>,
) => Promise<HTMLCanvasElement>;

interface WindowWithH2C {
  html2canvas?: H2CFunc;
}

function formatDate(ts?: bigint): string {
  if (!ts) return "\u2014";
  const ms = Number(ts);
  const date = ms > 1e15 ? new Date(ms / 1_000_000) : new Date(ms);
  return date.toLocaleDateString("en-IN");
}

function formatDateMs(ms: number): string {
  return new Date(ms).toLocaleDateString("en-IN");
}

/** Dynamically load html2canvas from CDN (cached after first load) */
function loadHtml2Canvas(): Promise<H2CFunc> {
  return new Promise((resolve, reject) => {
    const w = window as WindowWithH2C;
    if (typeof w.html2canvas === "function") {
      resolve(w.html2canvas);
      return;
    }
    const existing = document.querySelector("script[data-h2c]");
    if (existing) {
      existing.addEventListener("load", () => {
        if (w.html2canvas) resolve(w.html2canvas);
        else reject(new Error("html2canvas not found after load"));
      });
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.setAttribute("data-h2c", "1");
    script.src =
      "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    script.onload = () => {
      if (w.html2canvas) resolve(w.html2canvas);
      else reject(new Error("html2canvas not found after load"));
    };
    script.onerror = () => reject(new Error("Failed to load html2canvas"));
    document.head.appendChild(script);
  });
}

/** Wait for all <img> inside an element to finish loading */
async function waitForImages(el: HTMLElement): Promise<void> {
  const images = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 6000);
          }),
    ),
  );
}

/** Fetch a URL and return a base64 data URL */
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function captureInvoiceAsBlob(el: HTMLElement): Promise<Blob | null> {
  const html2canvas = await loadHtml2Canvas();

  // Clone into detached div so dialog clipping doesn't interfere
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;z-index:0;background:#fff;";
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.width = `${el.scrollWidth}px`;
  container.appendChild(clone);
  document.body.appendChild(container);

  // Replace img src with data URLs so html2canvas can access them
  const imgs = Array.from(clone.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src");
      if (src) {
        const dataUrl = await toDataUrl(
          src.startsWith("http") ? src : window.location.origin + src,
        );
        if (dataUrl) img.src = dataUrl;
      }
    }),
  );

  await waitForImages(clone);

  try {
    const canvas = await html2canvas(clone, {
      backgroundColor: "#ffffff",
      scale: 3,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: clone.scrollWidth,
      height: clone.scrollHeight,
    });
    return await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/png"),
    );
  } finally {
    document.body.removeChild(container);
  }
}

function printThermal(invoiceEl: HTMLElement) {
  const win = window.open("", "_blank", "width=420,height=750");
  if (!win) {
    toast.error("Pop-up blocked. Allow pop-ups and try again.");
    return;
  }
  win.document.write(`
    <html><head>
    <style>
      @page { size: 80mm auto; margin: 2mm; }
      body { font-family: 'Courier New', Courier, monospace; font-size: 12px;
             width: 76mm; margin: 0 auto; background: #fff; color: #111; padding: 4px; }
      img { max-width: 100%; }
      @media print {
        body { width: 76mm; }
        @page { size: 80mm auto; margin: 1mm; }
      }
    </style>
    </head><body>
    ${invoiceEl.innerHTML}
    <script>window.onload=function(){window.print();setTimeout(function(){window.close();},800);}<\/script>
    </body></html>
  `);
  win.document.close();
}

export function PrintInvoice({
  customer: c,
  renewal,
  onClose,
}: PrintInvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const today = new Date().toLocaleDateString("en-IN");
  const invoiceNo = `DSK-INV-${c.tokenId}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(c.tokenId)}`;

  const total = renewal ? renewal.totalCharged : c.totalCharged;
  const advance = renewal ? renewal.advancePaid : c.advancePaid;
  const balance = renewal ? renewal.balanceDue : c.balanceDue;
  const serviceName = renewal ? renewal.serviceName : c.serviceType;
  const nextExpiry = renewal
    ? formatDate(renewal.nextExpiryDate)
    : formatDate(c.expiryDate);
  const renewalDate = renewal ? formatDate(renewal.renewalDate) : today;

  const rupee = "\u20b9";

  async function handleDownloadPng() {
    if (!invoiceRef.current) return;
    setDownloading(true);
    try {
      const blob = await captureInvoiceAsBlob(invoiceRef.current);
      if (!blob) throw new Error("Failed to create image");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${c.tokenId}-${c.name}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("Invoice image downloaded");
    } catch {
      toast.error("Download failed. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    if (!invoiceRef.current) return;
    setSharing(true);
    const phone = c.phone.replace(/\D/g, "");
    const waPhone = phone.length >= 10 ? `91${phone.slice(-10)}` : phone;
    try {
      const blob = await captureInvoiceAsBlob(invoiceRef.current);
      if (!blob) throw new Error("Could not create invoice image");

      const file = new File([blob], `Invoice-${c.name}.png`, {
        type: "image/png",
      });

      // Try Web Share API (Android Chrome / mobile browsers)
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice - ${c.name}`,
          text: `Invoice from Document Seva Kendra for ${c.name}`,
        });
        return;
      }

      // Fallback: download image then open WhatsApp
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${c.name}.png`;
      a.click();
      toast.success("Invoice saved! Opening WhatsApp...");
      setTimeout(() => {
        URL.revokeObjectURL(url);
        window.open(`https://wa.me/${waPhone}`, "_blank");
      }, 1200);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      // Last fallback: just open WhatsApp
      window.open(`https://wa.me/${waPhone}`, "_blank");
      toast.info("WhatsApp opened. Attach the downloaded invoice manually.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div>
      {/* Invoice content captured for image sharing */}
      <div
        ref={invoiceRef}
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 12,
          width: 304,
          margin: "0 auto",
          background: "#fff",
          color: "#111",
          padding: "12px 10px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <img
            src={DSK_LOGO}
            alt="DSK Logo"
            style={{
              height: 60,
              width: 60,
              objectFit: "contain",
              margin: "0 auto",
              display: "block",
            }}
            crossOrigin="anonymous"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div style={{ fontWeight: "bold", fontSize: 14, marginTop: 4 }}>
            Document Seva Kendra
          </div>
          <div style={{ fontSize: 11, color: "#555" }}>
            DSK Management System
          </div>
          <div style={{ margin: "6px 0", borderTop: "1px dashed #999" }} />
          <div style={{ fontWeight: "bold", letterSpacing: 2, fontSize: 13 }}>
            SERVICE INVOICE
          </div>
          <div style={{ margin: "4px 0", borderTop: "1px dashed #999" }} />
        </div>

        <div style={{ fontSize: 11, marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Invoice No:</span>
            <span style={{ fontWeight: "bold" }}>{invoiceNo}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Date:</span>
            <span>{today}</span>
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />

        <div style={{ fontSize: 11, marginBottom: 6 }}>
          <div style={{ fontWeight: "bold", marginBottom: 3, fontSize: 12 }}>
            CUSTOMER DETAILS
          </div>
          <InvRow label="Name" value={c.name} />
          <InvRow label="Token ID" value={c.tokenId} />
          <InvRow label="Phone" value={c.phone} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 1,
            }}
          >
            <span>Service:</span>
            <span style={{ textAlign: "right" }}>
              <div>{serviceName}</div>
              {renewal && (
                <div
                  style={{ fontSize: 10, color: "#888", fontStyle: "italic" }}
                >
                  Renewal
                </div>
              )}
            </span>
          </div>
          {c.applicationNo && <InvRow label="App No" value={c.applicationNo} />}
        </div>

        <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />

        <div style={{ fontSize: 11, marginBottom: 6 }}>
          <div style={{ fontWeight: "bold", marginBottom: 3, fontSize: 12 }}>
            PAYMENT DETAILS
          </div>
          <div style={{ borderTop: "1px solid #333", margin: "3px 0" }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
            }}
          >
            <span>TOTAL</span>
            <span>{`${rupee}${total.toFixed(2)}`}</span>
          </div>
          <div style={{ borderTop: "1px solid #333", margin: "3px 0" }} />
          <InvRow
            label="Advance Paid"
            value={`${rupee}${advance.toFixed(2)}`}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: balance > 0 ? "#dc2626" : "#16a34a",
            }}
          >
            <span>Balance Due</span>
            <span style={{ fontWeight: "bold" }}>
              {`${rupee}${balance.toFixed(2)}`}
            </span>
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />

        <div style={{ fontSize: 11, marginBottom: 6 }}>
          <InvRow label="Renewal Date" value={renewalDate} />
          <InvRow label="Next Expiry" value={nextExpiry} />
        </div>

        <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />

        <div style={{ textAlign: "center", margin: "8px 0" }}>
          <img
            src={qrUrl}
            alt="QR Code"
            style={{
              width: 100,
              height: 100,
              margin: "0 auto",
              display: "block",
            }}
            crossOrigin="anonymous"
          />
          <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
            Scan to verify: {c.tokenId}
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />

        <div style={{ textAlign: "center", fontSize: 10, color: "#555" }}>
          <div style={{ fontWeight: "bold", color: "#111", marginBottom: 2 }}>
            Thank you for choosing DSK
          </div>
          <div>Document Seva Kendra</div>
          <div
            style={{
              marginTop: 4,
              borderTop: "1px dashed #ccc",
              paddingTop: 4,
            }}
          >
            {formatDateMs(Date.now())}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          textAlign: "center",
          marginTop: 16,
          display: "flex",
          gap: 8,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => invoiceRef.current && printThermal(invoiceRef.current)}
          style={{
            background: "#f59e0b",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: 13,
            color: "#111",
          }}
        >
          &#128424; Print (Thermal)
        </button>

        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={downloading}
          style={{
            background: downloading ? "#6b7280" : "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            cursor: downloading ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: "bold",
          }}
        >
          {downloading ? "Saving..." : "\uD83D\uDCF7 Save as PNG"}
        </button>

        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          style={{
            background: sharing ? "#4ade80" : "#25D366",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            cursor: sharing ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: "bold",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {sharing ? "Sharing..." : "\uD83D\uDCF2 Share to WhatsApp"}
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#374151",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

function InvRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 1,
      }}
    >
      <span>{label}:</span>
      <span>{value}</span>
    </div>
  );
}

interface PrintInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  customer: CustomerRecord;
  renewal?: RenewalRecord | null;
}

export function PrintInvoiceModal({
  open,
  onClose,
  customer,
  renewal,
}: PrintInvoiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-white text-black p-0 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="px-4 pt-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold">
              Print Invoice
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800 h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="px-2 pb-4">
          <PrintInvoice
            customer={customer}
            renewal={renewal}
            onClose={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
