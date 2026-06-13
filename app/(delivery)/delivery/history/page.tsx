"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, History, MapPin, Calendar, Clock, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  name: string;
  size: string;
}

interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
}

interface Order {
  id: string;
  status: string;
  deliveryAddress: string;
  deliveryPincode: string;
  deliveredAt: string | null;
  user: { name: string; phone: string };
  orderItems: OrderItem[];
}

export default function DeliveryHistory() {
  const { data: session } = useSession();
  const [history, setHistory] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/orders");
        if (res.ok) {
          const data = await res.json();
          // Filter only completed deliveries
          const completed = data.filter((o: Order) => o.status === "DELIVERED");
          setHistory(completed);
        }
      } catch (err) {
        toast.error("Failed to load delivery logs.");
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchHistory();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-[#00B4D8] animate-spin" />
        <p className="text-sm text-slate-500">Loading delivery logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-sky-950 pb-4">
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <History className="text-[#00B4D8]" />
          Logistics History
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review details of your completed deliveries and handoffs.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-sm text-slate-400 italic text-xs">
          No completed deliveries recorded in this account yet.
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((order) => {
            const bottleCount = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
            const deliveryDate = order.deliveredAt
              ? new Date(order.deliveredAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })
              : "";
            const deliveryTime = order.deliveredAt
              ? new Date(order.deliveredAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : "";

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-3"
              >
                
                <div className="flex justify-between items-start border-b border-slate-50 dark:border-sky-950/50 pb-2.5">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs">{order.user.name}</h3>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Order #{order.id.slice(0, 8)}</span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 text-[9px] font-extrabold uppercase border border-green-100/50 dark:border-green-900/50">
                    Completed
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <p className="flex items-start gap-1.5 leading-relaxed">
                    <MapPin size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>{order.deliveryAddress} ({order.deliveryPincode})</span>
                  </p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-50 dark:border-sky-950/30 pt-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={13} /> Delivered {deliveryDate}</span>
                    <span className="flex items-center gap-1"><Clock size={13} /> Time: {deliveryTime}</span>
                    <span className="text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px]">{bottleCount} bottles</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
