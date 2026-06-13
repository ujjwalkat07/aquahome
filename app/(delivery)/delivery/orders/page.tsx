"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2, Truck, MapPin, Phone, Clock, QrCode, ClipboardList, CheckCircle } from "lucide-react";
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

interface OrderUser {
  name: string;
  phone: string;
}

interface Order {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "DELIVERED" | "CANCELLED";
  deliveryTimeSlot: string;
  deliveryAddress: string;
  deliveryPincode: string;
  user: OrderUser;
  orderItems: OrderItem[];
}

export default function DeliveryOrders() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        // Only show pending and active deliveries
        const active = data.filter((o: Order) => o.status === "PENDING" || o.status === "IN_PROGRESS");
        setOrders(active);
      }
    } catch (err) {
      toast.error("Failed to load assigned deliveries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchDeliveries();
    }
  }, [session]);

  // Sort orders by pincode to optimize delivery routes area-by-area!
  const sortedOrders = [...orders].sort((a, b) => a.deliveryPincode.localeCompare(b.deliveryPincode));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-[#00B4D8] animate-spin" />
        <p className="text-sm text-slate-500">Loading deliveries sheet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-sky-950 pb-4">
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Truck className="text-[#00B4D8]" />
          My Deliveries
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Today&apos;s assigned deliveries. The list is automatically sorted by area pincodes to optimize your driving routes.
        </p>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <CheckCircle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">All Done!</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">No pending deliveries left for today.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedOrders.map((order) => {
            const bottleCount = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow transition duration-200"
              >
                
                {/* Route Header Card */}
                <div className="flex items-start justify-between border-b border-slate-50 dark:border-sky-950/50 pb-3">
                  <div className="space-y-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-[#CAF0F8] text-[#03045E] dark:bg-sky-950 dark:text-[#00B4D8]">
                      Pincode: {order.deliveryPincode}
                    </span>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1.5">{order.user.name}</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">#{order.id.slice(0, 8)}</span>
                </div>

                {/* Body info */}
                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                  <p className="flex items-start gap-1.5 leading-relaxed">
                    <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>{order.deliveryAddress}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <p className="flex items-center gap-1.5"><Phone size={14} className="text-slate-400" /> {order.user.phone}</p>
                    <p className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400" /> {order.deliveryTimeSlot}</p>
                  </div>
                </div>

                {/* Package items */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-sky-950/50 rounded-xl space-y-2 text-xs">
                  <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <ClipboardList size={12} />
                    Bottles Package ({bottleCount} total)
                  </h4>
                  <div className="space-y-1 pl-1">
                    {order.orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">{item.product.name} ({item.product.size})</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scan confirmation triggers */}
                <div className="pt-2">
                  <Link
                    href={`/delivery/scan?orderId=${order.id}`}
                    className="w-full py-2.5 bg-[#00B4D8] hover:bg-[#0096C7] text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition"
                  >
                    <QrCode size={16} /> Scan QR to Deliver
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
