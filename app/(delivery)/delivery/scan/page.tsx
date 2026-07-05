"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, QrCode, Camera, AlertCircle, CheckCircle, ArrowLeft, Keyboard } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

// Load react-qr-scanner dynamically with SSR disabled to prevent Node compilation errors
// @ts-ignore
const QrReader = dynamic(() => import("react-qr-scanner"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-sky-950">
      <Loader2 className="w-8 h-8 text-[#00B4D8] animate-spin" />
      <span className="text-xs text-slate-500 mt-2 font-medium">Initializing camera module...</span>
    </div>
  )
}) as any;

interface ScannedOrderDetails {
  id: string;
  status: string;
  deliveryAddress: string;
  user: { name: string; phone: string };
  payments: Array<{ amount: number }>;
}

export default function QRScanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetOrderId = searchParams.get("orderId");

  // Scanner States
  const [scanning, setScanning] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [successData, setSuccessData] = useState<ScannedOrderDetails | null>(null);
  const [hasCameraSupport, setHasCameraSupport] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const support = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      setHasCameraSupport(support);
    }
  }, []);

  const handleScan = async (data: any) => {
    if (!data) return;
    console.log("Scanner raw payload:", data);
    
    let scannedText = "";
    if (typeof data === "string") {
      scannedText = data;
    } else if (data && typeof data === "object" && typeof data.text === "string") {
      scannedText = data.text;
    }
    
    if (scannedText && scanning && !verifying) {
      setScanning(false);
      await verifyQRCode(scannedText);
    }
  };

  const handleError = (err: any) => {
    console.error("Camera scanner error:", err);
    toast.error("Camera access failed or permission denied. Please check your camera permissions.");
  };

  const verifyQRCode = async (codeStr: string) => {
    setVerifying(true);
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
      if (res.ok) {
        toast.success("Delivery confirmed successfully!");
        setSuccessData(data.order);
      } else {
        toast.error(data.error || "Verification failed. Invalid QR Code.");
        setScanning(true); // Restart scanner on failure
      }
    } catch (err) {
      toast.error("Network connection error. Re-try scan.");
      setScanning(true);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      
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
            Confirm Water Handoff
          </h2>
          {targetOrderId && (
            <p className="text-[10px] font-bold text-amber-500 uppercase mt-0.5">
              Scanning specifically for Order #{targetOrderId.slice(0, 8)}
            </p>
          )}
        </div>
      </div>

      {verifying && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-[#00B4D8] animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Verifying QR code & records...</p>
        </div>
      )}

      {/* Success Confirmation screen */}
      {!verifying && successData && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-md text-center space-y-5 animate-scaleUp">
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
            onClick={() => {
              setSuccessData(null);
              setScanning(true);
              router.push("/delivery/orders");
            }}
            className="w-full py-2.5 bg-[#00B4D8] hover:bg-[#0096C7] text-white text-xs font-bold rounded-xl shadow transition"
          >
            Return to Orders Sheet
          </button>
        </div>
      )}

      {/* Camera Scanning screen */}
      {!verifying && !successData && (
        <div className="space-y-5">
          {hasCameraSupport === false ? (
            <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">Camera Access Blocked</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your browser blocks camera access on insecure connections (HTTP). To scan QR codes, you must use a secure connection (HTTPS or localhost), or enable the camera flag in your browser settings.
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-left text-xs space-y-2 border border-slate-100 dark:border-sky-950/50">
                <p className="font-bold text-slate-700 dark:text-slate-350">To fix this on Chrome (Mobile/Desktop):</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400">
                  <li>Open Chrome and navigate to: <code className="font-mono text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-1 rounded select-all">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
                  <li>Enable the flag.</li>
                  <li>Add <code className="font-mono text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded select-all">http://10.147.27.82:3000</code> (or your current server IP) into the input box.</li>
                  <li>Relaunch Chrome and refresh this page.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border-2 border-[#00B4D8]/30 shadow-md">
                
                {/* Visual Camera scanner overlay */}
                <div className="absolute inset-0 border-[30px] border-black/45 z-10 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-[#00B4D8] rounded-xl relative shadow-[0_0_15px_rgba(0,180,216,0.3)] animate-pulse">
                    <span className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-sky-400 -mt-1.5 -ml-1.5 rounded-tl-sm" />
                    <span className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-sky-400 -mt-1.5 -mr-1.5 rounded-tr-sm" />
                    <span className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-sky-400 -mb-1.5 -ml-1.5 rounded-bl-sm" />
                    <span className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-sky-400 -mb-1.5 -mr-1.5 rounded-br-sm" />
                  </div>
                </div>

                {hasCameraSupport === true && (
                  <QrReader
                    delay={300}
                    onError={handleError}
                    onScan={handleScan}
                    facingMode="rear"
                    constraints={{
                      video: {
                        facingMode: "environment",
                        aspectRatio: { ideal: 1 }
                      }
                    }}
                    style={{ width: "100%", height: "260px", objectFit: "cover" }}
                  />
                )}
              </div>

              <div className="flex justify-between items-center gap-3">
                <p className="text-[11px] text-slate-500 leading-tight flex items-start gap-1">
                  <Camera size={14} className="text-slate-400 flex-shrink-0" />
                  <span>Align the customer&apos;s order details QR code inside the target frame.</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
