"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Camera, AlertCircle, CheckCircle, ArrowLeft, XCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

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
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedText, setScannedText] = useState<string | null>(null);

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
    if (!scanning || verifying || successData || isInitializedRef.current) return;

    let cancelled = false;

    const initScanner = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { Html5Qrcode } = await import("html5-qrcode");

        if (cancelled) return;

        // Check camera support
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
          () => {
            // Scan failure callback — fires every frame when no QR is found
            // Do nothing, this is normal behavior
          }
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

    // Small delay to ensure DOM element is rendered
    const timeout = setTimeout(initScanner, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      stopScanner();
    };
  }, [scanning, verifying, successData, verifyQRCode, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleRetry = () => {
    setScanError(null);
    setCameraError(null);
    setScannedText(null);
    setScanning(true);
    isInitializedRef.current = false;
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

      {/* ── Verifying / Loading State ── */}
      {verifying && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-8 shadow-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-sky-50 dark:bg-sky-950/40 text-[#00B4D8] flex items-center justify-center mx-auto">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">Marking Delivery...</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifying QR code and updating order status. Please wait...
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

      {/* ── Success Confirmation ── */}
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
            onClick={() => {
              setSuccessData(null);
              setScanning(true);
              isInitializedRef.current = false;
              router.push("/delivery/orders");
            }}
            className="w-full py-2.5 bg-[#00B4D8] hover:bg-[#0096C7] text-white text-xs font-bold rounded-xl shadow transition"
          >
            Return to Orders Sheet
          </button>
        </div>
      )}

      {/* ── Camera Error ── */}
      {cameraError && !verifying && !successData && !scanError && (
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
      {scanning && !verifying && !successData && !scanError && !cameraError && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border-2 border-[#00B4D8]/30 shadow-md bg-black">
            {/* The html5-qrcode library renders into this div */}
            <div id={scannerContainerId} className="w-full" />
          </div>

          <div className="flex items-start gap-2">
            <Camera size={14} className="text-[#00B4D8] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Point your camera at the customer&apos;s QR code. The scanner will automatically detect and verify it.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
