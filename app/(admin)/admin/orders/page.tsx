"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, ShoppingBag, Truck, CheckCircle, Clock, XCircle, User, Calendar, MapPin, Eye, Search, X, Plus } from "lucide-react";
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

interface OrderUser {
  name: string;
  email: string;
  phone: string;
}

interface DeliveryPartner {
  id: string;
  name: string;
}

interface Order {
  id: string;
  userId: string;
  user: OrderUser;
  deliveryPartnerId: string | null;
  deliveryPartner: DeliveryPartner | null;
  status: "PENDING" | "IN_PROGRESS" | "DELIVERED" | "CANCELLED";
  deliveryTimeSlot: string;
  deliveryAddress: string;
  deliveryPincode: string;
  isScheduled: boolean;
  scheduleFrequency: string | null;
  createdAt: string;
  deliveredAt: string | null;
  orderItems: OrderItem[];
  payments: Payment[];
}

export default function AdminOrders() {
  const { data: session } = useSession();
  
  // Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals / Selection
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Place Order on Behalf of Customer Modal State
  const [showPlaceOrderModal, setShowPlaceOrderModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingModalData, setLoadingModalData] = useState(false);

  // Modal Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPincode, setDeliveryPincode] = useState("");
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState("08:00 AM - 12:00 PM");
  const [orderItems, setOrderItems] = useState<{ [productId: string]: number }>({});
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState("WEEKLY");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const loadData = async () => {
    try {
      // Fetch orders
      const ordRes = await fetch("/api/orders");
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        if (Array.isArray(ordData)) {
          setOrders(ordData);
        } else {
          setOrders([]);
          console.error("Invalid orders format received:", ordData);
        }
      } else {
        const errData = await ordRes.json().catch(() => ({}));
        setOrders([]);
        toast.error(errData.error || "Failed to load orders.");
      }

      // Fetch delivery partners for assignment dropdowns
      const partRes = await fetch("/api/admin/users?role=DELIVERY");
      if (partRes.ok) {
        const partData = await partRes.json();
        if (Array.isArray(partData)) {
          setDeliveryPartners(partData);
        } else {
          setDeliveryPartners([]);
        }
      } else {
        setDeliveryPartners([]);
      }
    } catch (err) {
      toast.error("Failed to load operations data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  useEffect(() => {
    if (showPlaceOrderModal) {
      const fetchModalData = async () => {
        setLoadingModalData(true);
        try {
          const custRes = await fetch("/api/admin/users?role=CUSTOMER");
          const custData = await custRes.json();
          setCustomers(custData);

          const prodRes = await fetch("/api/products");
          const prodData = await prodRes.json();
          setProducts(prodData.filter((p: any) => p.isAvailable));
        } catch (err) {
          toast.error("Failed to load customer list or products.");
        } finally {
          setLoadingModalData(false);
        }
      };
      fetchModalData();
    }
  }, [showPlaceOrderModal]);

  useEffect(() => {
    if (selectedCustomerId && customers.length > 0) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        setDeliveryAddress(customer.address || "");
        setDeliveryPincode(customer.pincode || "");
      }
    }
  }, [selectedCustomerId, customers]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const custId = params.get("customerId");
      if (custId) {
        setSelectedCustomerId(custId);
        setShowPlaceOrderModal(true);
        // Clear query param so it doesn't reopen if refreshed
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [session]);

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setDeliveryAddress(customer.address || "");
      setDeliveryPincode(customer.pincode || "");
    } else {
      setDeliveryAddress("");
      setDeliveryPincode("");
    }
  };

  const getSelectedItems = () => {
    return Object.entries(orderItems)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = products.find(p => p.id === id)!;
        return {
          productId: id,
          quantity: qty,
          name: product?.name || "",
          size: product?.size || "",
          pricePerUnit: product?.pricePerUnit || 0
        };
      });
  };

  const handlePlaceOrderOnBehalf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error("Please select a customer.");
      return;
    }
    const items = getSelectedItems().map(item => ({ productId: item.productId, quantity: item.quantity }));
    if (items.length === 0) {
      toast.error("Please add at least one product.");
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error("Please enter a delivery address.");
      return;
    }

    setSubmittingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          items,
          deliveryAddress,
          deliveryPincode,
          deliveryTimeSlot,
          isScheduled,
          scheduleFrequency: isScheduled ? scheduleFrequency : null
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Order placed successfully on customer's behalf!");
        setShowPlaceOrderModal(false);
        setSelectedCustomerId("");
        setDeliveryAddress("");
        setDeliveryPincode("");
        setOrderItems({});
        setIsScheduled(false);
        loadData();
      } else {
        toast.error(data.error || "Failed to place order.");
      }
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleAssignPartner = async (orderId: string, partnerId: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryPartnerId: partnerId || null,
        }),
      });

      if (res.ok) {
        toast.success(partnerId ? "Delivery partner assigned successfully!" : "Assignment removed.");
        loadData();
      } else {
        toast.error("Failed to assign partner.");
      }
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    let payload: any = { status: newStatus };
    if (newStatus === "CANCELLED") {
      const reason = prompt("Enter cancellation reason:");
      if (reason === null) return;
      if (!reason.trim()) {
        toast.error("Reason is required to cancel order.");
        return;
      }
      payload.cancelReason = reason;
    }

    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`Order status updated to ${newStatus}`);
        loadData();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(null); // Close sidebar on status update to refresh
        }
      } else {
        toast.error("Failed to update status.");
      }
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesSearch =
      o.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.deliveryPincode.includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: Order["status"]) => {
    if (status === "CANCELLED") return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900";
    if (status === "DELIVERED") return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-900";
    if (status === "IN_PROGRESS") return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900";
    return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  };

  const getStatusText = (status: Order["status"]) => {
    if (status === "CANCELLED") return "Cancelled";
    if (status === "DELIVERED") return "Delivered";
    if (status === "IN_PROGRESS") return "Out for Delivery";
    return "Pending";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-[#0077B6] animate-spin" />
        <p className="text-sm text-slate-500">Loading orders console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-sky-950 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShoppingBag className="text-[#0077B6]" />
            Order & Dispatch Console
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review, status-override, and assign active delivery partners to incoming requests.
          </p>
        </div>
        <button
          onClick={() => setShowPlaceOrderModal(true)}
          className="px-4 py-2 bg-[#0077B6] hover:bg-[#023E8A] text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={15} /> Place Order on Behalf
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by customer name, order ID, or pincode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-sky-950 bg-white dark:bg-slate-900 text-sm focus:border-[#0077B6] outline-none transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-sky-950 bg-white dark:bg-slate-900 text-sm focus:border-[#0077B6] outline-none transition dark:text-slate-200"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending (Unassigned)</option>
          <option value="IN_PROGRESS">Out for Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Orders List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-sky-950">
                <th className="p-4">Order ID / Date</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Pincode</th>
                <th className="p-4">Assign Driver</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-950 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">No orders found.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const orderDate = new Date(order.createdAt).toLocaleDateString();
                  const isPaid = order.payments[0]?.status === "PAID";
                  const total = order.payments[0]?.amount || 0;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <p className="font-extrabold text-slate-400 uppercase">#{order.id.slice(0, 8)}</p>
                          {order.isScheduled && (
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-[#CAF0F8] text-[#03045E] dark:bg-sky-950 dark:text-[#00B4D8]">
                              Sub
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5" suppressHydrationWarning>{orderDate} • {order.deliveryTimeSlot}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{order.user.name}</p>
                        <p className="text-[10px] text-slate-400">{order.user.phone}</p>
                      </td>
                      <td className="p-4 font-semibold text-slate-600 dark:text-slate-400">{order.deliveryPincode}</td>
                      <td className="p-4">
                        {order.status === "DELIVERED" || order.status === "CANCELLED" ? (
                          <span className="text-slate-400 dark:text-slate-500 italic">
                            {order.deliveryPartner?.name || "None"}
                          </span>
                        ) : (
                          <select
                            value={order.deliveryPartnerId || ""}
                            onChange={(e) => handleAssignPartner(order.id, e.target.value)}
                            disabled={updatingId === order.id}
                            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800 text-xs focus:border-[#0077B6] outline-none transition max-w-[130px]"
                          >
                            <option value="">Unassigned</option>
                            {deliveryPartners.map((dp) => (
                              <option key={dp.id} value={dp.id}>{dp.name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getStatusBadge(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        {!isPaid && order.status === "DELIVERED" && (
                          <span className="block text-[9px] font-bold text-amber-500 uppercase mt-1">Payment Due</span>
                        )}
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2 h-full">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 rounded-lg border border-slate-100 dark:border-sky-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 transition"
                          title="View order"
                        >
                          <Eye size={15} />
                        </button>
                        {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "CANCELLED")}
                            disabled={updatingId === order.id}
                            className="p-1.5 rounded-lg border border-red-100 dark:border-red-950 hover:bg-red-50 text-red-500 transition"
                            title="Cancel order"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-sky-950 h-full p-6 shadow-2xl flex flex-col justify-between animate-slideIn">
            
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-sky-950 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Details</span>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    Order #{selectedOrder.id.slice(0, 8)}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-5 text-xs">
                
                {/* User info */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Customer Contact</span>
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl space-y-1.5 border border-slate-100/50 dark:border-sky-950/50">
                    <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" /> {selectedOrder.user.name}
                    </p>
                    <p className="text-slate-500 flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" /> Phone: {selectedOrder.user.phone}
                    </p>
                    <p className="text-slate-500 leading-relaxed flex items-start gap-1.5">
                      <MapPin size={13} className="mt-0.5 text-slate-400 flex-shrink-0" />
                      <span>Address: {selectedOrder.deliveryAddress} ({selectedOrder.deliveryPincode})</span>
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Bottle Count Summary</span>
                  <div className="space-y-1.5 border-b border-slate-100 dark:border-sky-950 pb-2">
                    {selectedOrder.orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 dark:text-slate-400">
                          {item.product.name} ({item.product.size}) <span className="font-bold">x{item.quantity}</span>
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ₹{(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-800 dark:text-slate-200 pt-1">
                    <span>Total Amount</span>
                    <span>₹{(selectedOrder.payments[0]?.amount || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Logistics */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Dispatch & Tracking</span>
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-sky-950/50 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Status:</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold border text-[9px] ${getStatusBadge(selectedOrder.status)}`}>
                        {getStatusText(selectedOrder.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Billing Status:</span>
                      <span className={`font-bold ${selectedOrder.payments[0]?.status === "PAID" ? "text-green-600 dark:text-green-400" : "text-amber-500"}`}>
                        {selectedOrder.payments[0]?.status === "PAID" ? "PAID" : "UNPAID"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Delivery Partner:</span>
                      <span className="font-semibold">{selectedOrder.deliveryPartner?.name || "Unassigned"}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Actions footer */}
            <div className="border-t border-slate-100 dark:border-sky-950 pt-4 space-y-2.5">
              {selectedOrder.status === "PENDING" && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, "IN_PROGRESS")}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                  Mark Out for Delivery (In Progress)
                </button>
              )}
              {selectedOrder.status === "IN_PROGRESS" && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, "DELIVERED")}
                  className="w-full py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition"
                >
                  Confirm Delivery Manually
                </button>
              )}
              {selectedOrder.status !== "DELIVERED" && selectedOrder.status !== "CANCELLED" && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, "CANCELLED")}
                  className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition"
                >
                  Cancel Order
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Place Order on Behalf Modal */}
      {showPlaceOrderModal && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-sky-950 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Place Order on Behalf of Customer
              </h3>
              <button 
                onClick={() => {
                  setShowPlaceOrderModal(false);
                  setSelectedCustomerId("");
                  setDeliveryAddress("");
                  setDeliveryPincode("");
                  setOrderItems({});
                  setIsScheduled(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {loadingModalData ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="w-6 h-6 text-[#0077B6] animate-spin" />
                <p className="text-xs text-slate-400">Loading catalog and customers...</p>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrderOnBehalf} className="space-y-4 text-xs">
                
                {/* 1. Customer Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-400 block">
                    Select Customer
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800 text-sm focus:border-[#0077B6] outline-none transition dark:text-slate-200"
                  >
                    <option value="">-- Choose a Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomerId && (
                  <>
                    {/* 2. Delivery Details (Pincode & Address) */}
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-sky-950 rounded-xl space-y-3">
                      <h4 className="font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider text-[10px]">
                        Delivery Information
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500">Delivery Pincode</label>
                          <input
                            type="text"
                            value={deliveryPincode}
                            onChange={(e) => setDeliveryPincode(e.target.value)}
                            placeholder="Optional pincode"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:border-[#0077B6]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500">Preferred Time Slot</label>
                          <select
                            value={deliveryTimeSlot}
                            onChange={(e) => setDeliveryTimeSlot(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-white dark:bg-slate-800 text-slate-755 dark:text-slate-200 outline-none"
                          >
                            <option>08:00 AM - 12:00 PM</option>
                            <option>12:00 PM - 04:00 PM</option>
                            <option>04:00 PM - 08:00 PM</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">Delivery Address</label>
                        <textarea
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-white dark:bg-slate-800 text-slate-755 dark:text-slate-200 outline-none focus:border-[#0077B6]"
                        />
                      </div>
                    </div>

                    {/* 3. Product Selection & Quantities */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider text-[10px]">
                        Select Bottled Water & Quantity
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {products.map((p) => {
                          const qty = orderItems[p.id] || 0;
                          return (
                            <div 
                              key={p.id} 
                              className={`p-3 border rounded-xl flex items-center justify-between transition ${
                                qty > 0 ? "border-[#0077B6] bg-sky-50/10" : "border-slate-100 dark:border-sky-950 bg-white dark:bg-slate-900"
                              }`}
                            >
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold bg-sky-100 text-sky-850 dark:bg-sky-950/50 dark:text-sky-400 px-1.5 py-0.5 rounded">
                                  {p.size}
                                </span>
                                <h5 className="font-bold text-slate-800 dark:text-slate-200">{p.name}</h5>
                                <p className="text-[10px] text-[#0077B6] font-bold">₹{p.pricePerUnit.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOrderItems(prev => ({
                                      ...prev,
                                      [p.id]: Math.max(0, (prev[p.id] || 0) - 1)
                                    }));
                                  }}
                                  className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 transition"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center font-bold text-slate-800 dark:text-slate-200">{qty}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOrderItems(prev => ({
                                      ...prev,
                                      [p.id]: Math.min(p.stock, (prev[p.id] || 0) + 1)
                                    }));
                                  }}
                                  className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 transition"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Scheduling options */}
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-sky-950 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-700 dark:text-slate-300">Set as Subscription (Recurring)</h4>
                          <p className="text-[10px] text-slate-400">Automatically repeat this order periodically.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isScheduled}
                          onChange={(e) => setIsScheduled(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-200"
                        />
                      </div>
                      {isScheduled && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500">Subscription Frequency</label>
                          <select
                            value={scheduleFrequency}
                            onChange={(e) => setScheduleFrequency(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                          >
                            <option value="WEEKLY">Weekly</option>
                            <option value="BIWEEKLY">Bi-weekly</option>
                            <option value="MONTHLY">Monthly</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* 5. Summary & Submit */}
                    <div className="border-t border-slate-100 dark:border-sky-950 pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-slate-400">Total Price Calculated:</p>
                        <p className="text-lg font-extrabold text-[#0077B6] dark:text-sky-400">
                          ₹{getSelectedItems().reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPlaceOrderModal(false);
                            setSelectedCustomerId("");
                            setDeliveryAddress("");
                            setDeliveryPincode("");
                            setOrderItems({});
                            setIsScheduled(false);
                          }}
                          className="px-4 py-2 border border-slate-100 dark:border-sky-950 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingOrder}
                          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md transition flex items-center justify-center"
                        >
                          {submittingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Place"}
                        </button>
                      </div>
                    </div>

                  </>
                )}

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
