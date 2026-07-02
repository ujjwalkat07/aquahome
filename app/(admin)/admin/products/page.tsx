"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Loader2, Package, Plus, Edit, ToggleLeft, ToggleRight, X, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  size: string;
  pricePerUnit: number;
  stock: number;
  lowStockThreshold: number;
  isAvailable: boolean;
}

const productSchema = zod.object({
  name: zod.string().min(2, "Product name must be at least 2 characters"),
  size: zod.string().min(2, "Size is required (e.g. 1L, 20L)"),
  pricePerUnit: zod.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Price must be a valid positive number"
  }),
  stock: zod.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
    message: "Stock count must be a positive integer"
  }),
  lowStockThreshold: zod.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
    message: "Threshold must be a positive integer"
  }),
});

type ProductForm = zod.infer<typeof productSchema>;

export default function AdminProducts() {
  const { data: session } = useSession();
  
  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      toast.error("Failed to fetch product list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchProducts();
    }
  }, [session]);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingProduct) {
      setValue("name", editingProduct.name);
      setValue("size", editingProduct.size);
      setValue("pricePerUnit", editingProduct.pricePerUnit.toString());
      setValue("stock", editingProduct.stock.toString());
      setValue("lowStockThreshold", editingProduct.lowStockThreshold.toString());
      setShowModal(true);
    } else {
      reset();
    }
  }, [editingProduct, setValue, reset]);

  const handleSaveProduct = async (data: ProductForm) => {
    setSubmitting(true);
    try {
      const payload: any = {
        name: data.name,
        size: data.size,
        pricePerUnit: parseFloat(data.pricePerUnit),
        stock: parseInt(data.stock),
        lowStockThreshold: parseInt(data.lowStockThreshold),
      };

      if (editingProduct) {
        payload.id = editingProduct.id;
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingProduct ? "Product details updated!" : "New product added!");
        setShowModal(false);
        setEditingProduct(null);
        reset();
        fetchProducts();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save product.");
      }
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProductAvailability = async (product: Product) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          name: product.name,
          size: product.size,
          pricePerUnit: product.pricePerUnit,
          isAvailable: !product.isAvailable
        }),
      });

      if (res.ok) {
        toast.success("Availability updated successfully!");
        fetchProducts();
      }
    } catch (err) {
      toast.error("Failed to update availability.");
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
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-sky-950 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="text-[#0077B6]" />
            Stock & Inventory Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain product catalog sizes, update pricing, and adjust stock counts.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-[#0077B6] to-[#00B4D8] text-white text-xs font-bold rounded-xl shadow hover:opacity-90 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={16} /> Add Product Size
        </button>
      </div>

      {/* Grid of Product Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((product) => {
          const isLowStock = product.stock <= product.lowStockThreshold;

          return (
            <div
              key={product.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all ${
                isLowStock
                  ? "border-amber-300 dark:border-amber-900 ring-1 ring-amber-300/10 dark:bg-amber-950/5"
                  : "border-slate-100 dark:border-sky-950"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-50 dark:border-sky-950 pb-3">
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#CAF0F8] text-[#03045E] dark:bg-sky-950 dark:text-[#00B4D8]">
                      {product.size}
                    </span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mt-1">{product.name}</h3>
                  </div>
                  <span className="text-sm font-extrabold text-[#0077B6] dark:text-[#00B4D8]">
                    ₹{product.pricePerUnit.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Current Stock:</span>
                    <span className={`font-bold ${isLowStock ? "text-amber-500" : "text-slate-700 dark:text-slate-300"}`}>
                      {product.stock} bottles
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Low Stock Alert Level:</span>
                    <span className="font-semibold">{product.lowStockThreshold} bottles</span>
                  </div>
                </div>

                {/* Low Stock Warning Banner inside card */}
                {isLowStock && (
                  <div className="flex items-center gap-1.5 p-2 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                    <AlertTriangle size={12} className="flex-shrink-0 animate-pulse" />
                    <span>Inventory levels are below threshold!</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50 dark:border-sky-950/50 mt-4">
                <button
                  onClick={() => setEditingProduct(product)}
                  className="flex-1 py-2 rounded-lg border border-slate-100 dark:border-sky-950 hover:bg-slate-50 text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1"
                >
                  <Edit size={13} /> Edit Product
                </button>
                <button
                  onClick={() => toggleProductAvailability(product)}
                  className={`px-3 py-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1 ${
                    product.isAvailable
                      ? "border-green-100 text-green-600 bg-green-50/10 hover:bg-green-50"
                      : "border-slate-200 text-slate-400 bg-slate-50 hover:bg-slate-100"
                  }`}
                  title={product.isAvailable ? "Set unavailable" : "Set available"}
                >
                  {product.isAvailable ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  <span>{product.isAvailable ? "Active" : "Disabled"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-sky-950 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-sky-950 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                {editingProduct ? `Edit Catalog: ${editingProduct.name}` : "Add New Bottle Size"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                  reset();
                }}
                className="p-1 rounded-lg hover:bg-slate-50 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleSaveProduct)} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Product Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Small Bottle, Office Canister"
                  {...register("name")}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800 text-sm focus:border-[#0077B6] outline-none transition"
                />
                {errors.name && <p className="text-red-500 text-[10px] font-semibold">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Bottle Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 500ml, 1L, 20L"
                    {...register("size")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.size && <p className="text-red-500 text-[10px] font-semibold">{errors.size.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Price per Unit (₹)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2.50"
                    {...register("pricePerUnit")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.pricePerUnit && <p className="text-red-500 text-[10px] font-semibold">{errors.pricePerUnit.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Inventory Stock Count</label>
                  <input
                    type="text"
                    placeholder="e.g. 100"
                    {...register("stock")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.stock && <p className="text-red-500 text-[10px] font-semibold">{errors.stock.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Low Stock Alert Threshold</label>
                  <input
                    type="text"
                    placeholder="e.g. 15"
                    {...register("lowStockThreshold")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-sky-950 bg-slate-50/50 dark:bg-slate-800 text-sm focus:border-[#0077B6] outline-none transition"
                  />
                  {errors.lowStockThreshold && <p className="text-red-500 text-[10px] font-semibold">{errors.lowStockThreshold.message}</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-sky-950">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    reset();
                  }}
                  className="flex-1 py-2.5 font-bold text-slate-500 border border-slate-100 dark:border-sky-950 hover:bg-slate-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#0077B6] to-[#00B4D8] text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
