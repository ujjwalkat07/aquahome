"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ShoppingBag, ChevronDown, ChevronUp, Calendar, MapPin, Clock, QrCode as QrIcon, AlertCircle } from "lucide-react";
import QRCode from "qrcode";
import toast from "react-hot-toast";

interface Product {
  name: string;
  size: string;
}

interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
}

interface Payment {
  amount: number;
  status: "PAID" | "UNPAID";
}

interface Order {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "DELIVERED" | "CANCELLED";
  deliveryTimeSlot: string;
  deliveryAddress: string;
  deliveryPincode: string;
  qrCode: string;
  isScheduled: boolean;
  scheduleFrequency: string;
  createdAt: string;
  deliveredAt: string | null;
  orderItems: OrderItem[];
  payments: Payment[];
}

// Canvas QR Code Generator component
function OrderQRCode({ text }: { text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && text) {
      QRCode.toCanvas(
        canvasRef.current,
        text,
        {
          width: 180,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF"
          }
        },
        (error) => {
          if (error) console.error("QR Code Error:", error);
        }
      );
    }
  }, [text]);

  return (
    <div className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-white rounded-xl shadow-inner border border-slate-200">
      <canvas ref={canvasRef} />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
        Show to Delivery Partner
      </span>
    </div>
  );
}

export default function MyOrders() {
  const { data: session } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
 
  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchOrders();
    }
  }, [session]);

  const toggleExpand = (id: string) => {
    setExpandedOrderId(prev => (prev === id ? null : id));
  };

  const handleCancelClick = (orderId: string) => {
    setCancelOrderId(orderId);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelOrderId) return;
    if (!cancelReason.trim()) {
      toast.error("Reason is required to cancel the order.");
      return;
    }

    setCancellingId(cancelOrderId);
    setCancelModalOpen(false);
    try {
      const res = await fetch(`/api/orders/${cancelOrderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", cancelReason: cancelReason })
      });

      if (res.ok) {
        toast.success("Order cancelled successfully.");
        // Refresh orders
        fetchOrders();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel order.");
      }
    } catch (err) {
      toast.error("Network error. Could not cancel order.");
    } finally {
      setCancellingId(null);
      setCancelOrderId(null);
      setCancelReason("");
    }
  };

  const getStatusBadgeClass = (status: Order["status"], isPaid: boolean) => {
    if (status === "CANCELLED") return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900";
    if (status === "DELIVERED") {
      return isPaid
        ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-900"
        : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900"; // Payment Due
    }
    if (status === "IN_PROGRESS") return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900"; // Out for Delivery
    return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"; // Pending
  };

  const getStatusText = (status: Order["status"], isPaid: boolean) => {
    if (status === "CANCELLED") return "Cancelled";
    if (status === "DELIVERED") return isPaid ? "Delivered" : "Payment Due";
    if (status === "IN_PROGRESS") return "Out for Delivery";
    return "Pending";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-[#0077B6] animate-spin" />
        <p className="text-sm text-slate-500">Retrieving order history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="border-b border-slate-200 dark:border-sky-950 pb-4">
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ShoppingBag className="text-[#0077B6] dark:text-[#00B4D8]" />
          My Orders
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review details of your current subscriptions, pending orders, and order history.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <ShoppingBag size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Orders Found</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">You haven&apos;t placed any deliveries yet.</p>
          </div>
          <button
            onClick={() => router.push("/user/order/new")}
            className="px-5 py-2 bg-[#0077B6] hover:bg-[#00B4D8] text-white text-xs font-bold rounded-lg shadow transition"
          >
            Order Water Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const isPaid = order.payments[0]?.status === "PAID";
            const orderTotal = order.payments[0]?.amount || 0;
            const orderDate = new Date(order.createdAt).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric"
            });

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Header card info */}
                <div
                  onClick={() => toggleExpand(order.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-400 uppercase">
                        #{order.id.slice(0, 8)}
                      </span>
                      {order.isScheduled && (
                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#CAF0F8] text-[#03045E] dark:bg-sky-950 dark:text-[#00B4D8]">
                          {order.scheduleFrequency}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar size={13} />
                      <span>{orderDate}</span>
                      <span className="text-slate-300 dark:text-sky-950">•</span>
                      <span>{order.deliveryTimeSlot}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Total Price</p>
                      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                        ₹{orderTotal.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getStatusBadgeClass(order.status, isPaid)}`}>
                        {getStatusText(order.status, isPaid)}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Collapsible body */}
                {isExpanded && (
                  <div className="px-4 pb-5 pt-3 border-t border-slate-100 dark:border-sky-950 bg-slate-50/20 dark:bg-slate-900/30 space-y-4 animate-slideDown">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      
                      {/* Left Side: Items & address */}
                      <div className="md:col-span-7 space-y-3">
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Order Items
                          </h4>
                          <div className="space-y-1.5">
                            {order.orderItems.map((item) => (
                              <div key={item.id} className="flex justify-between items-center text-xs">
                                <span className="text-slate-600 dark:text-slate-400">
                                  {item.product.name} ({item.product.size}) <span className="font-bold text-slate-500">x{item.quantity}</span>
                                </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  ₹{(item.unitPrice * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1 text-xs">
                          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Delivery Address
                          </h4>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed flex items-start gap-1">
                            <MapPin size={13} className="mt-0.5 text-slate-400 flex-shrink-0" />
                            <span>{order.deliveryAddress} ({order.deliveryPincode})</span>
                          </p>
                        </div>

                        {order.status === "PENDING" && (
                          <button
                            onClick={() => handleCancelClick(order.id)}
                            disabled={cancellingId === order.id}
                            className="mt-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                          >
                            {cancellingId === order.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <AlertCircle size={14} />
                                Cancel Order
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Right Side: QR Code scan helper (except cancelled orders) */}
                      {order.status !== "CANCELLED" && (
                        <div className="md:col-span-5 flex flex-col items-center justify-center p-3 bg-sky-50/10 dark:bg-sky-950/10 border border-dashed border-[#00B4D8]/20 dark:border-sky-900 rounded-2xl">
                          {order.status === "DELIVERED" ? (
                            <div className="text-center py-6 space-y-2">
                              <span className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto text-lg font-bold">✓</span>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Delivered successfully</p>
                              {order.deliveredAt && (
                                <p className="text-[10px] text-slate-400">
                                  scanned at {new Date(order.deliveredAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              {order.qrCode ? (
                                <OrderQRCode text={order.qrCode} />
                              ) : (
                                <Loader2 className="w-6 h-6 animate-spin text-[#0077B6]" />
                              )}
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center max-w-[170px] leading-tight mt-1">
                                Delivery agent will scan this code to confirm hand-off and complete delivery.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Reason Modal Popup */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <AlertCircle className="text-red-500" size={18} />
                Cancel Order
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Please let us know why you are cancelling order <span className="font-mono text-slate-600 dark:text-slate-300">#{cancelOrderId?.slice(0, 8)}</span>. This helps us improve our service.
              </p>
            </div>

            {/* Quick Reasons Chips */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Reasons
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  "Changed my mind",
                  "Incorrect delivery address",
                  "Slot timing not suitable",
                  "Ordered by mistake",
                  "Found better alternative",
                ].map((reasonOption) => (
                  <button
                    key={reasonOption}
                    type="button"
                    onClick={() => setCancelReason(reasonOption)}
                    className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold border transition ${
                      cancelReason === reasonOption
                        ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400"
                        : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-850"
                    }`}
                  >
                    {reasonOption}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Detailed Reason
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tell us more about the cancellation reason..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:border-red-500 outline-none transition resize-none"
                  required
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCancelModalOpen(false);
                    setCancelOrderId(null);
                    setCancelReason("");
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-550 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  Confirm Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
