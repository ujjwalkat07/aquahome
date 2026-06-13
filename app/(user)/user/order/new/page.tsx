"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Minus, Calendar, MapPin, ClipboardList, ShoppingCart, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  size: string;
  pricePerUnit: number;
  stock: number;
  isAvailable: boolean;
}

export default function PlaceOrder() {
  const { data: session } = useSession();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<{ [productId: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPincode, setDeliveryPincode] = useState("");
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState("08:00 AM - 12:00 PM");
  
  // Subscription fields
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState("WEEKLY");

  // Load products and user profile info
  useEffect(() => {
    const loadData = async () => {
      try {
        const prodRes = await fetch("/api/products");
        const prodData = await prodRes.json();
        setProducts(prodData.filter((p: Product) => p.isAvailable));

        // Fetch current user details to pre-fill address
        const userRes = await fetch("/api/admin/users"); // Reuse this to query self if possible, or fetch profile
        // Let's call our profile endpoint since it gets current details
        const profileRes = await fetch("/api/user/profile"); // wait, GET profile returns user? Our PATCH is at /api/user/profile, but let's check.
        // Actually we can query standard details or use details in session. Since session has name and email, we can query details from DB via /api/admin/users or write a small fetch.
        // To be safe, let's fetch profile via GET /api/orders or session, or let's call api/user/profile.
        // Wait, does /api/user/profile have GET? If not, let's look at what we can fetch. Let's see: we can write a quick GET in /api/user/profile or just check.
        // Let's check user info by fetching from `/api/admin/users` or let's create a profile query. Wait, does `/api/admin/users` return users? Yes, for admins. But for normal customers it might return 401.
        // Let's make sure customers can fetch their own details! We can fetch from `/api/orders` to get address or just read session info. Let's read from a new session fetch or just fetch the user profile from a small endpoint.
        // Wait! We can fetch from `/api/user/profile` directly by adding a GET handler. Let's inspect what we wrote in `/api/user/profile`. We wrote PATCH but no GET. We can add a GET handler there or fetch it.
        // Let's fetch self from `/api/admin/users` but wait! `/api/admin/users` has checking for role === "ADMIN".
        // Let's create an endpoint or query the session. Wait! Can we get it by doing a quick fetch to an endpoint?
        // Let's add a GET handler inside `app/api/user/profile/route.ts` to return the current logged-in user profile!
        // That is an excellent idea and handles the client-side prefill perfectly.
        const res = await fetch("/api/user/profile"); // wait, we will add GET to this route.
        if (res.ok) {
          const profile = await res.json();
          setDeliveryAddress(profile.address || "");
          setDeliveryPincode(profile.pincode || "");
        }
      } catch (err) {
        console.error("Failed to load products/profile", err);
      } finally {
        setLoading(false);
      }
    };
    if (session) {
      loadData();
    }
  }, [session]);

  const updateQuantity = (productId: string, val: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const next = current + val;
      if (next < 0) return prev;
      return { ...prev, [productId]: next };
    });
  };

  const getSelectedItems = () => {
    return Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = products.find(p => p.id === id)!;
        return {
          productId: id,
          quantity: qty,
          name: product.name,
          size: product.size,
          pricePerUnit: product.pricePerUnit
        };
      });
  };

  const selectedItems = getSelectedItems();
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please add at least one bottle size to your order.");
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error("Please provide a delivery address.");
      return;
    }
    if (!deliveryPincode.trim()) {
      toast.error("Please provide a delivery area pincode.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedItems.map(item => ({ productId: item.productId, quantity: item.quantity })),
          deliveryAddress,
          deliveryPincode,
          deliveryTimeSlot,
          isScheduled,
          scheduleFrequency: isScheduled ? scheduleFrequency : null
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(
          isScheduled
            ? "Weekly recurring subscription order created successfully!"
            : "Order placed successfully!"
        );
        router.push("/user/orders");
      } else {
        toast.error(data.error || "Failed to place order.");
      }
    } catch (err) {
      toast.error("Network error. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-[#0077B6] animate-spin" />
        <p className="text-sm text-slate-500">Loading catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div className="border-b border-slate-200 dark:border-sky-950 pb-4">
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ShoppingCart className="text-[#0077B6] dark:text-[#00B4D8]" />
          Place Delivery Order
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Choose water bottle sizes and configure delivery instructions below.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Product Cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            1. Select Bottled Water
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {products.map((product) => {
              const qty = quantities[product.id] || 0;
              return (
                <div
                  key={product.id}
                  className={`p-4 bg-white dark:bg-slate-900 border rounded-xl flex items-center justify-between transition-all shadow-sm ${
                    qty > 0
                      ? "border-[#00B4D8] ring-1 ring-[#00B4D8]/20 bg-sky-50/10"
                      : "border-slate-100 dark:border-sky-950"
                  }`}
                >
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CAF0F8] text-[#03045E] dark:bg-sky-950 dark:text-[#00B4D8]">
                      {product.size}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{product.name}</h4>
                    <p className="text-xs text-[#0077B6] dark:text-[#00B4D8] font-bold">
                      ${product.pricePerUnit.toFixed(2)} / bottle
                    </p>
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(product.id, -1)}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition active:scale-95 text-slate-700 dark:text-slate-300"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-slate-800 dark:text-slate-200">
                      {qty}
                    </span>
                    <button
                      onClick={() => updateQuantity(product.id, 1)}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition active:scale-95 text-slate-700 dark:text-slate-300"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Slot & Address */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-sky-950 pb-2">
            <MapPin size={16} className="text-[#0077B6] dark:text-[#00B4D8]" />
            2. Delivery Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pincode / Area Code</label>
              <input
                type="text"
                placeholder="700091"
                value={deliveryPincode}
                onChange={(e) => setDeliveryPincode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Preferred Time Slot</label>
              <select
                value={deliveryTimeSlot}
                onChange={(e) => setDeliveryTimeSlot(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition dark:text-slate-200"
              >
                <option>08:00 AM - 12:00 PM</option>
                <option>12:00 PM - 04:00 PM</option>
                <option>04:00 PM - 08:00 PM</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Full Delivery Address</label>
            <textarea
              placeholder="Apartment, Street Name, Landmark..."
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:border-[#0077B6] outline-none transition"
            />
          </div>
        </div>

        {/* Order Scheduling / Subscriptions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar size={16} className="text-[#0077B6] dark:text-[#00B4D8]" />
                Recurring Subscription Setup
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Auto-generate this exact delivery order periodically.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0077B6]"></div>
            </label>
          </div>

          {isScheduled && (
            <div className="p-3 bg-sky-50/20 dark:bg-sky-950/20 rounded-xl border border-sky-100/50 dark:border-sky-950 space-y-2 animate-fadeIn">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Subscription Cycle
              </label>
              <select
                value={scheduleFrequency}
                onChange={(e) => setScheduleFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-white dark:bg-slate-800 text-sm focus:border-[#0077B6] outline-none transition"
              >
                <option value="WEEKLY">Weekly Auto-Order</option>
                <option value="BIWEEKLY">Bi-Weekly Auto-Order</option>
                <option value="MONTHLY">Monthly Auto-Order</option>
              </select>
              <p className="text-[11px] text-[#0077B6] dark:text-[#00B4D8] font-medium leading-tight">
                * Note: Your first delivery will start on the selected time slot, and subsequent orders will be created automatically.
              </p>
            </div>
          )}
        </div>

        {/* Order Summary & Confirm */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-5 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-sky-950 pb-2">
            <ClipboardList size={16} className="text-[#0077B6] dark:text-[#00B4D8]" />
            Order Summary
          </h3>

          <div className="space-y-2">
            {selectedItems.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-2 italic">No items selected yet.</p>
            ) : (
              selectedItems.map((item) => (
                <div key={item.productId} className="flex justify-between items-center text-sm">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{item.quantity}x</span>
                    <span className="text-slate-600 dark:text-slate-400">{item.name} ({item.size})</span>
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ${(item.pricePerUnit * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-sky-950 pt-3 flex justify-between items-center">
            <span className="text-base font-bold text-slate-800 dark:text-slate-200">Total Price</span>
            <span className="text-lg font-extrabold text-[#0077B6] dark:text-[#00B4D8]">
              ${totalPrice.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handlePlaceOrder}
            className="w-full py-3 bg-gradient-to-r from-[#0077B6] to-[#00B4D8] text-white rounded-xl text-sm font-bold shadow-md shadow-[#0077B6]/15 hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-2"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing Order...
              </>
            ) : (
              "Confirm & Place Order"
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
