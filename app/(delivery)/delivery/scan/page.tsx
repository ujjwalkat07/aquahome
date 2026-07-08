"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Loader2, 
  Camera, 
  AlertCircle, 
  CheckCircle, 
  ArrowLeft, 
  XCircle, 
  RotateCcw,
  Plus,
  Minus,
  CreditCard,
  Send,
  Mail,
  MessageSquare,
  Receipt,
  User,
  ShoppingBag,
  MapPin,
  FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface ScannedOrderDetails {
  id: string;
  status: string;
  deliveryAddress: string;
  user: { name: string; phone: string };
  payments: Array<{ amount: number }>;
}

interface Product {
  id: string;
  name: string;
  size: string;
  pricePerUnit: number;
  stock: number;
}

interface CustomerDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  pincode: string | null;
}

export default function QRScanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetOrderId = searchParams.get("orderId");

  // Scanner States
  const [scanning, setScanning] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [successData, setSuccessData] = useState<ScannedOrderDetails | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedText, setScannedText] = useState<string | null>(null);

  // Instant Billing Flow States
  const [billingCustomer, setBillingCustomer] = useState<CustomerDetails | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "UNPAID">("PAID");
  const [submittingBill, setSubmittingBill] = useState(false);
  const [billingSuccessData, setBillingSuccessData] = useState<any | null>(null);

  const scannerRef = useRef<any>(null);
  const scannerContainerId = "qr-scanner-container";
  const isInitializedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // ignore
      }
      try {
        scannerRef.current.clear();
      } catch (e) {
        // ignore
      }
      scannerRef.current = null;
      isInitializedRef.current = false;
    }
  }, []);

  const verifyQRCode = useCallback(async (codeStr: string) => {
    setVerifying(true);
    setScanError(null);
    setScannedText(codeStr);
    console.log("[SCANNER] Scanned QR text:", codeStr);

    // Check if the QR code is a Customer Account Number QR
    let customerId = "";
    if (codeStr.startsWith("AQUAHOME-CUSTOMER:")) {
      customerId = codeStr.replace("AQUAHOME-CUSTOMER:", "").trim();
    } else if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(codeStr.trim())) {
      // Direct User UUID format
      customerId = codeStr.trim();
    }

    if (customerId) {
      console.log("[SCANNER] Customer QR detected. Customer ID:", customerId);
      try {
        const res = await fetch(`/api/delivery/customer/${customerId}`);
        const data = await res.json();
        
        if (res.ok) {
          setBillingCustomer(data);
          
          // Load products for the billing menu
          const prodRes = await fetch("/api/products");
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            // Filter only available and in-stock products
            const activeProds = prodData.filter((p: Product) => p.stock > 0);
            setAvailableProducts(activeProds);
            
            const initialQtys: Record<string, number> = {};
            activeProds.forEach((p: Product) => {
              initialQtys[p.id] = 0;
            });
            setSelectedQuantities(initialQtys);
            toast.success(`Customer ${data.name} loaded!`);
          } else {
            toast.error("Failed to load product menu.");
          }
        } else {
          setScanError(data.error || "Customer account not found.");
          toast.error(data.error || "Failed to load customer account.");
        }
      } catch (err) {
        console.error("[SCANNER] Customer lookup error:", err);
        setScanError("Failed to fetch customer. Check internet connection.");
      } finally {
        setVerifying(false);
      }
      return;
    }

    // Default Order scan confirmation flow
    try {
      const res = await fetch("/api/delivery/confirm-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCode: codeStr,
          location: "Mobile camera scan"
        })
      });

      const data = await res.json();
      console.log("[SCANNER] API response:", res.status, data);

      if (res.ok) {
        toast.success("Delivery confirmed successfully!");
        setSuccessData(data.order);
      } else {
        setScanError(data.error || "Verification failed. Invalid QR Code.");
        toast.error(data.error || "Verification failed.");
      }
    } catch (err: any) {
      console.error("[SCANNER] Network error:", err);
      setScanError("Network connection error. Please check your internet and try again.");
      toast.error("Network error. Please retry.");
    } finally {
      setVerifying(false);
    }
  }, []);

  // Initialize scanner
  useEffect(() => {
    if (!scanning || verifying || successData || billingCustomer || billingSuccessData || isInitializedRef.current) return;

    let cancelled = false;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (cancelled) return;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Camera access is blocked. Your browser requires HTTPS to use the camera. Please use a secure connection or enable the insecure origin flag in Chrome.");
          return;
        }

        const scanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = scanner;
        isInitializedRef.current = true;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            console.log("[SCANNER] ✅ QR Decoded:", decodedText);
            // Stop the scanner immediately after successful scan
            scanner.stop().then(() => {
              scanner.clear();
              scannerRef.current = null;
              isInitializedRef.current = false;
            }).catch(() => {});
            
            setScanning(false);
            verifyQRCode(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        console.error("[SCANNER] Camera init error:", err);
        if (!cancelled) {
          if (err?.message?.includes("NotAllowedError") || err?.name === "NotAllowedError") {
            setCameraError("Camera permission denied. Please allow camera access in your browser settings and reload.");
          } else if (err?.message?.includes("NotFoundError") || err?.name === "NotFoundError") {
            setCameraError("No camera found on this device.");
          } else if (err?.message?.includes("NotReadableError") || err?.name === "NotReadableError") {
            setCameraError("Camera is being used by another app. Please close other apps using the camera.");
          } else {
            setCameraError(err?.message || "Failed to initialize camera. Please check permissions.");
          }
        }
      }
    };

    const timeout = setTimeout(initScanner, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      stopScanner();
    };
  }, [scanning, verifying, successData, billingCustomer, billingSuccessData, verifyQRCode, stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleRetry = () => {
    setScanError(null);
    setCameraError(null);
    setScannedText(null);
    setBillingCustomer(null);
    setBillingSuccessData(null);
    setSuccessData(null);
    setScanning(true);
    isInitializedRef.current = false;
  };

  // Quantity updates
  const updateQuantity = (productId: string, delta: number, maxStock: number) => {
    setSelectedQuantities(prev => {
      const current = prev[productId] || 0;
      const updated = Math.max(0, Math.min(maxStock, current + delta));
      return { ...prev, [productId]: updated };
    });
  };

  // Calculate bill totals
  const getSelectedItems = () => {
    return availableProducts
      .filter(p => (selectedQuantities[p.id] || 0) > 0)
      .map(p => ({
        productId: p.id,
        name: p.name,
        size: p.size,
        price: p.pricePerUnit,
        quantity: selectedQuantities[p.id],
        total: p.pricePerUnit * selectedQuantities[p.id]
      }));
  };

  const getSubtotal = () => {
    return getSelectedItems().reduce((sum, item) => sum + item.total, 0);
  };

  // Submit bill immediately
  const handleGenerateBill = async () => {
    const items = getSelectedItems().map(item => ({
      productId: item.productId,
      quantity: item.quantity
    }));

    if (items.length === 0) {
      toast.error("Please select at least one bottle/product.");
      return;
    }

    if (!billingCustomer) return;

    setSubmittingBill(true);
    try {
      const res = await fetch("/api/delivery/customer-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: billingCustomer.id,
          items,
          paymentMethod,
          paymentStatus,
        })
      });

      const data = await res.json();
      if (res.ok) {
        setBillingSuccessData({
          order: data.order,
          payment: data.payment,
          items: getSelectedItems(),
          customerName: billingCustomer.name,
          accountNumber: `AQ-2026-${billingCustomer.id.slice(0, 6).toUpperCase()}`
        });
        toast.success("Bill generated & notifications sent!");
        setBillingCustomer(null);
      } else {
        toast.error(data.error || "Failed to generate bill.");
      }
    } catch (err) {
      toast.error("Network error. Failed to process billing.");
    } finally {
      setSubmittingBill(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 max-w-xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-sky-950 pb-4">
        <Link
          href="/delivery/orders"
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
            {billingCustomer ? "Instant Billing Form" : "Scan QR & Deliver"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {billingCustomer ? "Create bill for scanned customer" : "Scan Customer Account QR or Order QR Code"}
          </p>
        </div>
      </div>

      {/* ── Verifying / Loading State ── */}
      {verifying && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-8 shadow-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-sky-50 dark:bg-sky-950/40 text-[#00B4D8] flex items-center justify-center mx-auto">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">Verifying Scan...</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Retrieving account or order information. Please wait...
            </p>
          </div>
          {scannedText && (
            <p className="text-[10px] text-slate-400 font-mono break-all bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
              Code: {scannedText}
            </p>
          )}
        </div>
      )}

      {/* ── Scan Error State ── */}
      {!verifying && scanError && (
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 shadow-md text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 flex items-center justify-center mx-auto">
            <XCircle size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-red-700 dark:text-red-300">Scan Failed</h3>
            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{scanError}</p>
          </div>
          {scannedText && (
            <p className="text-[10px] text-slate-400 font-mono break-all bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
              Scanned: {scannedText}
            </p>
          )}
          <button
            onClick={handleRetry}
            className="w-full py-2.5 bg-[#00B4D8] hover:bg-[#0096C7] text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={14} /> Scan Again
          </button>
        </div>
      )}

      {/* ── Success Confirmation (Order Scan Flow) ── */}
      {!verifying && successData && (
        <div className="bg-white dark:bg-slate-900 border border-green-200 dark:border-green-900/50 rounded-2xl p-6 shadow-md text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle size={32} />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">Delivery Confirmed!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Order status has been updated to Delivered.</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-left text-xs space-y-2 border border-slate-100/50">
            <p className="font-bold text-slate-700 dark:text-slate-300">Customer Details:</p>
            <p><strong>Name:</strong> {successData.user?.name}</p>
            <p><strong>Address:</strong> {successData.deliveryAddress}</p>
            <p className="text-amber-500 font-bold border-t border-slate-100 dark:border-sky-950 pt-2 mt-2">
              Outstanding Invoice Amount: ₹{(successData.payments?.[0]?.amount || 0).toFixed(2)}
            </p>
          </div>

          <button
            onClick={handleRetry}
            className="w-full py-2.5 bg-[#00B4D8] hover:bg-[#0096C7] text-white text-xs font-bold rounded-xl shadow transition"
          >
            Scan Another QR Code
          </button>
        </div>
      )}

      {/* ── Billing Form View (Customer QR Scan Flow) ── */}
      {!verifying && billingCustomer && (
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-sky-950 pb-2">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-[#00B4D8] uppercase tracking-wider block">Customer Details</span>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">{billingCustomer.name}</h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-150 dark:bg-sky-950/60 text-slate-600 dark:text-[#00B4D8] px-2.5 py-1 rounded-lg">
                AQ-2026-{billingCustomer.id.slice(0, 6).toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Mail size={14} className="text-slate-400" />
                <span>{billingCustomer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <MessageSquare size={14} className="text-green-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-350">{billingCustomer.phone}</span>
                <span className="text-[9px] bg-green-50 text-green-600 font-bold px-1.5 py-0.2 rounded border border-green-200">WhatsApp</span>
              </div>
              <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400 sm:col-span-2">
                <MapPin size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <span>{billingCustomer.address} {billingCustomer.pincode && `(${billingCustomer.pincode})`}</span>
              </div>
            </div>
          </div>

          {/* Product Picker */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-sky-950 pb-2">
              <ShoppingBag size={14} className="text-[#00B4D8]" />
              Select Quantities Delivered
            </h3>

            {availableProducts.length === 0 ? (
              <p className="text-xs text-slate-450 italic text-center py-4">No products in stock.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-sky-950/40">
                {availableProducts.map((product) => {
                  const qty = selectedQuantities[product.id] || 0;
                  return (
                    <div key={product.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                      <div className="space-y-0.5">
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{product.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Size: {product.size} | Price: ₹{product.pricePerUnit.toFixed(2)}
                        </p>
                        <span className={`inline-block text-[9px] font-bold ${product.stock <= 5 ? "text-amber-500" : "text-slate-400"}`}>
                          Stock left: {product.stock} bottles
                        </span>
                      </div>

                      {/* Counter buttons */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, -1, product.stock)}
                          disabled={qty === 0}
                          className={`w-8 h-8 rounded-full flex items-center justify-center border transition ${
                            qty > 0 
                              ? "bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-sky-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                              : "border-slate-100 dark:border-sky-950/20 text-slate-350 cursor-not-allowed"
                          }`}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-extrabold w-6 text-center text-slate-800 dark:text-slate-200">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, 1, product.stock)}
                          disabled={qty >= product.stock}
                          className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-sky-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center transition"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Details Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-sky-950 pb-2">
              <CreditCard size={14} className="text-[#00B4D8]" />
              Payment Collection Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-650 dark:text-slate-400">Payment Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus("PAID")}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      paymentStatus === "PAID"
                        ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-900 dark:text-green-400"
                        : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-850 dark:text-slate-450 hover:bg-slate-100"
                    }`}
                  >
                    Paid (Completed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus("UNPAID")}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      paymentStatus === "UNPAID"
                        ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400"
                        : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-850 dark:text-slate-450 hover:bg-slate-100"
                    }`}
                  >
                    Unpaid (Due)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-650 dark:text-slate-400">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      paymentMethod === "CASH"
                        ? "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-900 dark:text-[#00B4D8]"
                        : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-850 dark:text-slate-450 hover:bg-slate-100"
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BANK_TRANSFER")}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      paymentMethod === "BANK_TRANSFER"
                        ? "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-900 dark:text-[#00B4D8]"
                        : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-850 dark:text-slate-450 hover:bg-slate-100"
                    }`}
                  >
                    Online / Transfer
                  </button>
                </div>
              </div>
            </div>

            {/* Total Balance Invoice Row */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-sky-950 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-450 font-medium">Grand Subtotal</p>
                <p className="text-xs text-slate-400 italic">Invoice bill amount</p>
              </div>
              <p className="text-xl font-extrabold text-[#00B4D8]">
                ₹{getSubtotal().toFixed(2)}
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRetry}
              className="flex-1 py-3 border border-slate-250 dark:border-sky-950 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              disabled={submittingBill}
            >
              Cancel Scan
            </button>
            <button
              type="button"
              onClick={handleGenerateBill}
              disabled={submittingBill || getSubtotal() === 0}
              className={`flex-[2] py-3 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 ${
                getSubtotal() > 0 && !submittingBill
                  ? "bg-gradient-to-r from-[#0077B6] to-[#00B4D8] hover:opacity-90 cursor-pointer"
                  : "bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
              }`}
            >
              {submittingBill ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating Bill...
                </>
              ) : (
                <>
                  <Send size={14} /> Make Bill & Dispatch
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Billing Success View (Customer QR Scan Flow) ── */}
      {!verifying && billingSuccessData && (
        <div className="bg-white dark:bg-slate-900 border border-green-200 dark:border-green-900/50 rounded-2xl p-6 shadow-md space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-100">Bill Invoiced Successfully!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">The customer has been billed and notified immediately.</p>
          </div>

          {/* Dispatch notifications log badges */}
          <div className="flex justify-center gap-3 py-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-550/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 text-[10px] font-bold">
              <Mail size={12} /> Email Invoice Dispatched
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-550/10 text-green-600 dark:text-green-450 border border-green-200/50 text-[10px] font-bold">
              <MessageSquare size={12} /> WhatsApp Receipt Dispatched
            </div>
          </div>

          {/* Receipt Panel */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl text-left text-xs border border-slate-100 dark:border-sky-950 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-sky-950 pb-2">
              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Invoice Code</p>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  #INV-{billingSuccessData.order.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Customer Acc</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{billingSuccessData.accountNumber}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p><strong>Customer Name:</strong> {billingSuccessData.customerName}</p>
              <p><strong>Address:</strong> {billingSuccessData.order.deliveryAddress}</p>
            </div>

            <div className="border-t border-slate-200 dark:border-sky-950 pt-2 space-y-1.5">
              <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mb-1">Delivered Products</p>
              {billingSuccessData.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-650 dark:text-slate-400">
                    {item.name} ({item.size}) x {item.quantity}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-300">₹{item.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 dark:border-sky-950 pt-2.5 flex justify-between items-center font-extrabold text-sm text-[#00B4D8]">
              <span>GRAND TOTAL</span>
              <span>₹{(billingSuccessData.payment.amount || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-sky-950 pt-2">
              <span>Method: {billingSuccessData.payment.method}</span>
              <span className={`font-bold uppercase ${billingSuccessData.payment.status === "PAID" ? "text-green-500" : "text-amber-500"}`}>
                Payment Status: {billingSuccessData.payment.status}
              </span>
            </div>
          </div>

          <button
            onClick={handleRetry}
            className="w-full py-3 bg-gradient-to-r from-[#0077B6] to-[#00B4D8] text-white text-xs font-bold rounded-xl shadow transition"
          >
            Scan Next Customer
          </button>
        </div>
      )}

      {/* ── Camera Error ── */}
      {cameraError && !verifying && !successData && !scanError && !billingCustomer && !billingSuccessData && (
        <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">Camera Error</h3>
            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{cameraError}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-left text-xs space-y-2 border border-slate-100 dark:border-sky-950/50">
            <p className="font-bold text-slate-700 dark:text-slate-300">To fix this on Chrome (Mobile):</p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>Navigate to: <code className="font-mono text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-1 rounded select-all text-[10px]">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
              <li>Enable the flag and add your server URL.</li>
              <li>Relaunch Chrome and refresh this page.</li>
            </ol>
          </div>
          <button
            onClick={handleRetry}
            className="w-full py-2.5 bg-[#00B4D8] hover:bg-[#0096C7] text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={14} /> Try Again
          </button>
        </div>
      )}

      {/* ── Camera Scanning View ── */}
      {scanning && !verifying && !successData && !scanError && !cameraError && !billingCustomer && !billingSuccessData && (
        <div className="space-y-4 animate-fadeIn">
          <div className="relative overflow-hidden rounded-2xl border-2 border-[#00B4D8]/30 shadow-md bg-black">
            <div id={scannerContainerId} className="w-full" />
          </div>

          <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-sky-950">
            <Camera size={16} className="text-[#00B4D8] flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-350">Scanning Instructions</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Position the camera to scan either the customer's account QR code (for new billing) or an existing order's QR code (for hand-off confirmation). It will detect it automatically.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
