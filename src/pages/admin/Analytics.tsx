import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Order, Product } from "../../types";
import { getAuth } from "firebase/auth";
import {
  Banknote,
  ShoppingBag,
  Users,
  TrendingUp,
  FileDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

export default function Analytics() {
  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    recentOrders: [] as Order[],
    topProducts: [] as (Product & { totalSold: number })[],
  });

  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // ✅ helper: convert createdAt (Date | Timestamp | string | undefined) → Date | null
  const toDate = (raw: any): Date | null => {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw === "object" && "seconds" in raw && typeof raw.seconds === "number") {
      return new Date(raw.seconds * 1000);
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  // ✅ recompute stats when filters change (and still ignore cancelled orders)
  useEffect(() => {
    if (allOrders.length === 0) return;

    // 1. filter by month/year
    let filtered = allOrders;
    if (filterMonth !== "all" || filterYear !== "all") {
      filtered = allOrders.filter((order) => {
        const date = toDate(order.createdAt as any);
        if (!date) return false;
        const m = date.getMonth();
        const y = date.getFullYear();
        return (
          (filterMonth === "all" || m === Number(filterMonth)) &&
          (filterYear === "all" || y === Number(filterYear))
        );
      });
    }

    // 2. ✅ exclude cancelled orders from revenue & order count
    const nonCancelled = filtered.filter(
      (o) => (o as any).status !== "cancelled"
    );

    setStats((s) => ({
      ...s,
      totalRevenue: nonCancelled.reduce(
        (sum, o) => sum + (typeof o.total === "number" ? o.total : 0),
        0
      ),
      totalOrders: nonCancelled.length,
    }));
  }, [filterMonth, filterYear, allOrders]);

  const fetchAnalytics = async () => {
    try {
      // Fetch orders
      const ordersSnapshot = await getDocs(collection(db, "orders"));
      const orders = ordersSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Order)
      );
      setAllOrders(orders);

      // Fetch customers (exclude current user)
      const customersSnapshot = await getDocs(collection(db, "users"));
      const customers = customersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any), // ✅ keep TS happy, we know data has "role"
      }));

      const totalCustomers = customers.filter((u) => {
        const user = u as { id: string; role?: string };
        return (
          (!currentUserId || user.id !== currentUserId) &&
          user.role === "user"
        );
      }).length;

      // Fetch products
      const productsSnapshot = await getDocs(collection(db, "products"));
      const products = productsSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Product)
      );
      const totalProducts = products.length;

      // ✅ Only delivered / non-cancelled revenue is counted
      const nonCancelled = orders.filter(
        (o) => (o as any).status !== "cancelled"
      );
      const totalRevenue = nonCancelled.reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );

      // Recent orders (can still show cancelled; this is only for the list)
      const recentOrders = orders
        .slice()
        .sort((a, b) => {
          const dateA = toDate(a.createdAt as any);
          const dateB = toDate(b.createdAt as any);
          return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
        })
        .slice(0, 5);

      // Top products – based on all non-cancelled orders (so cancelled sales do not count)
      const productSales = new Map<string, number>();
      nonCancelled.forEach((order) => {
        if (Array.isArray(order.items)) {
          order.items.forEach((item) => {
            const currentCount = productSales.get(item.productId) || 0;
            productSales.set(item.productId, currentCount + item.quantity);
          });
        }
      });

      const topProducts = products
        .map((product) => ({
          ...product,
          totalSold: productSales.get(product.id) || 0,
        }))
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5);

      setStats({
        totalRevenue,
        totalOrders: nonCancelled.length,
        totalCustomers,
        totalProducts,
        recentOrders,
        topProducts,
      });
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  // Get unique months/years for dropdowns
  const monthOptions = Array.from(
    new Set(
      allOrders
        .map((order) => {
          const date = toDate(order.createdAt as any);
          return date ? date.getMonth() : null;
        })
        .filter((m): m is number => m !== null)
    )
  );

  const yearOptions = Array.from(
    new Set(
      allOrders
        .map((order) => {
          const date = toDate(order.createdAt as any);
          return date ? date.getFullYear() : null;
        })
        .filter((y): y is number => y !== null)
    )
  );

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const exportToExcel = () => {
    try {
      // 1) filter orders by month/year
      let filteredOrders = allOrders;
      if (filterMonth !== "all" || filterYear !== "all") {
        filteredOrders = allOrders.filter((order) => {
          const date = toDate(order.createdAt as any);
          if (!date) return false;
          const m = date.getMonth();
          const y = date.getFullYear();
          return (
            (filterMonth === "all" || m === Number(filterMonth)) &&
            (filterYear === "all" || y === Number(filterYear))
          );
        });
      }

      // ✅ 2) exclude cancelled orders from export calculations
      const exportableOrders = filteredOrders.filter(
        (o) => (o as any).status !== "cancelled"
      );

      // SUMMARY SHEET (uses stats already filtered by hook; here we only need them for doc)
      const summaryData = [
        ["GDS Budgetarian - Sales Report"],
        [""],
        [
          "Report Period:",
          filterMonth === "all" && filterYear === "all"
            ? "All Time"
            : `${filterMonth !== "all" ? monthNames[Number(filterMonth)] : "All Months"} ${
                filterYear !== "all" ? filterYear : ""
              }`,
        ],
        ["Generated On:", new Date().toLocaleString()],
        [""],
        ["SUMMARY"],
        [
          "Total Revenue",
          `₱${stats.totalRevenue.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
          })}`,
        ],
        ["Total Orders", stats.totalOrders],
        ["Total Customers", stats.totalCustomers],
        ["Total Products", stats.totalProducts],
        [
          "Average Order Value",
          stats.totalOrders > 0
            ? `₱${(
                stats.totalRevenue / stats.totalOrders
              ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
            : "₱0.00",
        ],
      ];

      // ORDERS SHEET
      const ordersData: any[][] = [
        [
          "Order ID",
          "Date",
          "Customer Name",
          "Email",
          "Phone",
          "Address",
          "Payment Method",
          "Status",
          "Subtotal",
          "Shipping",
          "Total",
          "Items Count",
        ],
      ];

      exportableOrders.forEach((order) => {
        const o: any = order; // ✅ cast so we can access flexible fields
        const d = toDate(order.createdAt as any);
        const dateStr = d ? d.toLocaleDateString() : "N/A";

        const customerName =
          o.customerName ||
          o.shippingAddress?.name ||
          (o.firstName || o.lastName
            ? `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim()
            : "N/A");

        const phone =
          o.shippingAddress?.phone || o.phone || "N/A";

        const address = o.shippingAddress
          ? `${o.shippingAddress.street ?? ""}, ${
              o.shippingAddress.city ?? ""
            }`.trim() || "N/A"
          : o.address || "N/A";

        ordersData.push([
          order.id,
          dateStr,
          customerName || "N/A",
          o.email || "N/A",
          phone,
          address,
          o.paymentMethod || "N/A",
          o.status || "pending",
          o.subtotal || 0,
          o.shippingCost || 0,
          o.total || 0,
          Array.isArray(o.items) ? o.items.length : 0,
        ]);
      });

      // PRODUCT SALES SHEET – based only on non-cancelled exportable orders
      const productSalesMap = new Map<
        string,
        { name: string; quantity: number; revenue: number }
      >();

      exportableOrders.forEach((order) => {
        const o: any = order;
        if (Array.isArray(o.items)) {
          o.items.forEach((item: any) => {
            const current =
              productSalesMap.get(item.productId) || {
                name: "",
                quantity: 0,
                revenue: 0,
              };
            productSalesMap.set(item.productId, {
              name:
                current.name ||
                (item.name as string) ||
                `Product ${item.productId.substring(0, 8)}`,
              quantity: current.quantity + item.quantity,
              revenue: current.revenue + item.price * item.quantity,
            });
          });
        }
      });

      const productSalesData: any[][] = [
        ["Product ID", "Product Name", "Units Sold", "Total Revenue"],
      ];

      Array.from(productSalesMap.entries())
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .forEach(([productId, data]) => {
          productSalesData.push([
            productId,
            data.name,
            data.quantity,
            data.revenue,
          ]);
        });

      // WORKBOOK
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(summaryData),
        "Summary"
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(ordersData),
        "Orders"
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(productSalesData),
        "Product Sales"
      );

      const fileName = `GDS_Budgetarian_Sales_Report_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success("Excel file exported successfully!");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export Excel file");
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Analytics Dashboard</h1>
        <button
          onClick={exportToExcel}
          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-md"
        >
          <FileDown className="h-5 w-5" />
          <span>Export to Excel</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end mb-6">
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Month
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">All</option>
            {monthOptions
              .sort((a, b) => a - b)
              .map((m) => (
                <option key={m} value={m}>
                  {monthNames[m]}
                </option>
              ))}
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Year
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="all">All</option>
            {yearOptions
              .sort((a, b) => b - a)
              .map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-5 md:p-6 flex items-center gap-4 border-l-4 border-purple-500">
          <div className="bg-purple-100 p-3 rounded-full flex-shrink-0">
            <Banknote className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-gray-500 text-xs font-semibold uppercase mb-1">
              Total Revenue
            </div>
            <div className="text-lg md:text-xl font-bold text-gray-900 truncate">
              ₱
              {stats.totalRevenue.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-500 mb-1 font-semibold uppercase">
                Total Orders
              </p>
              <p className="text-xl md:text-2xl font-bold">
                {stats.totalOrders}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-500 mb-1 font-semibold uppercase">
                Total Customers
              </p>
              <p className="text-xl md:text-2xl font-bold">
                {stats.totalCustomers}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full flex-shrink-0">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-500 mb-1 font-semibold uppercase">
                Total Products
              </p>
              <p className="text-xl md:text-2xl font-bold">
                {stats.totalProducts}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-4 md:p-5 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">
              Recent Orders
            </h2>
          </div>
          <div className="p-4 md:p-5">
            <div className="space-y-3 md:space-y-4">
              {stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base truncate">
                      #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs md:text-sm text-gray-500">
                      {toDate(order.createdAt as any)?.toLocaleDateString() ??
                        "Invalid Date"}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-medium text-sm md:text-base">
                      ₱
                      {typeof order.total === "number"
                        ? order.total.toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                          })
                        : ""}
                    </p>
                    <p
                      className={`text-xs md:text-sm font-semibold ${
                        (order as any).status === "delivered"
                          ? "text-green-600"
                          : (order as any).status === "cancelled"
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {typeof (order as any).status === "string" &&
                      (order as any).status.length > 0
                        ? (order as any).status.charAt(0).toUpperCase() +
                          (order as any).status.slice(1)
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-4 md:p-5 border-b bg-gradient-to-r from-yellow-50 to-red-50">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">
              Top Products
            </h2>
          </div>
          <div className="p-4 md:p-5">
            <div className="space-y-3 md:space-y-4">
              {stats.topProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base truncate">
                        {product.name}
                      </p>
                      <p className="text-xs md:text-sm text-gray-500">
                        ₱
                        {typeof product.price === "number"
                          ? product.price.toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                            })
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-medium text-sm md:text-base">
                      {product.totalSold} sold
                    </p>
                    <p className="text-xs md:text-sm text-gray-500">
                      ₱
                      {typeof product.price === "number" &&
                      typeof product.totalSold === "number"
                        ? (product.price * product.totalSold).toLocaleString(
                            "en-PH",
                            { minimumFractionDigits: 2 }
                          )
                        : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
