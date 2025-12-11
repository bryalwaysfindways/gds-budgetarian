import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import toast from "react-hot-toast";
import {
  Package,
  TrendingUp,
  Banknote,
  ShoppingCart,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  X,
  Trash2,
} from "lucide-react";
import { Order, Product } from "../../types";

interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
}

interface DailyOrders {
  date: string;
  orders: Order[];
  revenue: number;
  count: number;
}

interface OrderProduct {
  product: Product | null;
  quantity: number;
  price: number;
}
// ✅ NEW HELPER: decide what to show for "customer"
// Priority:
// 1) order.email
// 2) order.shippingAddress.email
// 3) order.shippingAddress.name
// 4) firstName + lastName
// 5) "Customer" as last fallback
const getOrderCustomerLabel = (order: Order): string => {
  const o: any = order; // allow flexible fields coming from Firestore

  return (
    o.email || // 1. email saved on order
    o.shippingAddress?.email || // 2. email inside shippingAddress
    o.shippingAddress?.name || // 3. full name on shippingAddress
    (o.firstName || o.lastName // 4. combine first/last name
      ? `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim()
      : "") ||
    "Customer" // 5. only if everything else is missing
  );
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersRef = collection(db, "orders");
      const snapshot = await getDocs(ordersRef);

      const ordersData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Order;
      });

      ordersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = async (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
    setLoadingProducts(true);

    try {
      // Fetch all products for this order
      const productsData: OrderProduct[] = await Promise.all(
        order.items.map(async (item) => {
          try {
            const productRef = doc(db, "products", item.productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
              return {
                product: {
                  id: productSnap.id,
                  ...productSnap.data(),
                } as Product,
                quantity: item.quantity,
                price: item.price,
              };
            }
            return {
              product: null,
              quantity: item.quantity,
              price: item.price,
            };
          } catch (error) {
            console.error(`Error fetching product ${item.productId}:`, error);
            return {
              product: null,
              quantity: item.quantity,
              price: item.price,
            };
          }
        })
      );

      setOrderProducts(productsData);
    } catch (error) {
      console.error("Error fetching order products:", error);
      toast.error("Failed to load order products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
    setOrderProducts([]);
  };

  // Calculate overall statistics
  const getOverallStats = (): OrderStats => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      processing: orders.filter((o) => o.status === "processing").length,
      shipped: orders.filter((o) => o.status === "shipped").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    };
  };

  // Get today's orders
  const getTodayOrders = (): Order[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });
  };

  // Get this week's orders (Monday to Sunday)
  const getWeeklyOrders = (): Order[] => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 (Sunday) to 6 (Saturday)
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Calculate offset to get to Monday

    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= monday && orderDate <= sunday;
    });
  };

  // Group orders by date for the current month
  const getDailyOrdersForMonth = (): DailyOrders[] => {
    const monthOrders = orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return (
        orderDate.getMonth() === selectedMonth &&
        orderDate.getFullYear() === selectedYear
      );
    });

    const groupedByDate: { [key: string]: Order[] } = {};

    monthOrders.forEach((order) => {
      const dateKey = new Date(order.createdAt).toLocaleDateString("en-PH");
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(order);
    });

    return Object.entries(groupedByDate)
      .map(([date, orders]) => ({
        date,
        orders,
        count: orders.length,
        revenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleDeleteOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering order click

    if (
      !window.confirm(
        "Are you sure you want to delete this order? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingOrderId(orderId);
    try {
      await deleteDoc(doc(db, "orders", orderId));
      setOrders(orders.filter((order) => order.id !== orderId));
      toast.success("Order deleted successfully");
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const stats = getOverallStats();
  const todayOrders = getTodayOrders();
  const weeklyOrders = getWeeklyOrders();
  const dailyOrders = getDailyOrdersForMonth();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "processing":
        return <Package className="w-4 h-4" />;
      case "shipped":
        return <Truck className="w-4 h-4" />;
      case "delivered":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Orders Overview
        </h1>
        <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-yellow-400 rounded-full"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Orders</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {stats.total}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                ₱
                {stats.totalRevenue.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Banknote className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">
                Pending Orders
              </p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {stats.pending}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Delivered</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {stats.delivered}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => setViewMode("daily")}
              className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                viewMode === "daily"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Today's Orders
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                viewMode === "weekly"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Weekly View
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                viewMode === "monthly"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Monthly View
            </button>
          </div>

          {viewMode === "monthly" && (
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Today's Orders View */}
      {viewMode === "daily" && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-yellow-50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-red-500" />
              Today's Orders (
              {new Date().toLocaleDateString("en-PH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              )
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-6">
              <div className="bg-white px-3 sm:px-4 py-2 rounded-lg shadow-sm">
                <p className="text-xs sm:text-sm text-gray-500">Total Orders</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800">
                  {todayOrders.length}
                </p>
              </div>
              <div className="bg-white px-3 sm:px-4 py-2 rounded-lg shadow-sm">
                <p className="text-xs sm:text-sm text-gray-500">
                  Today's Revenue
                </p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  ₱
                  {todayOrders
                    .reduce((sum, o) => sum + o.total, 0)
                    .toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {todayOrders.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No orders today yet</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {todayOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer active:scale-[0.98]"
                  onClick={() => handleOrderClick(order)}
                >
                  {/* Mobile/Tablet Layout */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="bg-red-100 p-3 rounded-full flex-shrink-0">
                      <Package className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-base mb-1">
                        {getOrderCustomerLabel(order)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Order #{order.id.substring(0, 8)}... •{" "}
                        {order.createdAt.toLocaleTimeString("en-PH")}
                      </p>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-xl text-gray-800">
                        ₱
                        {order.total.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.items.length} item(s)
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full ${getStatusColor(
                        order.status || "pending"
                      )}`}
                    >
                      {getStatusIcon(order.status || "pending")}
                      {order.status?.charAt(0).toUpperCase() +
                        (order.status?.slice(1) || "Pending")}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteOrder(order.id, e)}
                    disabled={deletingOrderId === order.id}
                    className="w-full py-2 px-4 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    {deletingOrderId === order.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Order
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly View */}
      {viewMode === "weekly" && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-yellow-50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-red-500" />
              This Week's Orders (
              {(() => {
                const now = new Date();
                const currentDay = now.getDay();
                const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
                const monday = new Date(now);
                monday.setDate(now.getDate() + mondayOffset);
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                return `${monday.toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                })} - ${sunday.toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}`;
              })()}
              )
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-6">
              <div className="bg-white px-3 sm:px-4 py-2 rounded-lg shadow-sm">
                <p className="text-xs sm:text-sm text-gray-500">Total Orders</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800">
                  {weeklyOrders.length}
                </p>
              </div>
              <div className="bg-white px-3 sm:px-4 py-2 rounded-lg shadow-sm">
                <p className="text-xs sm:text-sm text-gray-500">
                  Weekly Revenue
                </p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  ₱
                  {weeklyOrders
                    .reduce((sum, o) => sum + o.total, 0)
                    .toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {weeklyOrders.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No orders this week</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {weeklyOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer active:scale-[0.98]"
                  onClick={() => handleOrderClick(order)}
                >
                  {/* Mobile/Tablet Layout */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-base mb-1">
                        {getOrderCustomerLabel(order)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Order #{order.id.substring(0, 8)}... •{" "}
                        {order.createdAt.toLocaleDateString("en-PH")}{" "}
                        {order.createdAt.toLocaleTimeString("en-PH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-xl text-gray-800">
                        ₱
                        {order.total.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.items.length} item(s)
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full ${getStatusColor(
                        order.status || "pending"
                      )}`}
                    >
                      {getStatusIcon(order.status || "pending")}
                      {order.status?.charAt(0).toUpperCase() +
                        (order.status?.slice(1) || "Pending")}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteOrder(order.id, e)}
                    disabled={deletingOrderId === order.id}
                    className="w-full py-2 px-4 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    {deletingOrderId === order.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Order
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly View */}
      {viewMode === "monthly" && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-yellow-50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-red-500" />
              {monthNames[selectedMonth]} {selectedYear} - Daily Breakdown
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-6">
              <div className="bg-white px-3 sm:px-4 py-2 rounded-lg shadow-sm">
                <p className="text-xs sm:text-sm text-gray-500">Total Orders</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800">
                  {dailyOrders.reduce((sum, day) => sum + day.count, 0)}
                </p>
              </div>
              <div className="bg-white px-3 sm:px-4 py-2 rounded-lg shadow-sm">
                <p className="text-xs sm:text-sm text-gray-500">
                  Monthly Revenue
                </p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  ₱
                  {dailyOrders
                    .reduce((sum, day) => sum + day.revenue, 0)
                    .toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {dailyOrders.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No orders this month</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {dailyOrders.map((day, index) => (
                <div key={index} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {day.date}
                        </p>
                        <p className="text-sm text-gray-500">
                          {day.count} order(s)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-green-600">
                        ₱
                        {day.revenue.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Orders for this day */}
                  <div className="space-y-3">
                    {day.orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer active:scale-[0.98]"
                        onClick={() => handleOrderClick(order)}
                      >
                        {/* Mobile/Tablet Layout */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="bg-purple-100 p-2 rounded-full flex-shrink-0">
                            <Package className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm mb-1">
                              {getOrderCustomerLabel(order)}
                            </p>
                            <p className="text-xs text-gray-500">
                              #{order.id.substring(0, 8)}... •{" "}
                              {order.createdAt.toLocaleTimeString("en-PH", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Order Details */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-bold text-lg text-gray-800">
                              ₱
                              {order.total.toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.items.length} item(s)
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full ${getStatusColor(
                              order.status || "pending"
                            )}`}
                          >
                            {getStatusIcon(order.status || "pending")}
                            {order.status?.charAt(0).toUpperCase() +
                              (order.status?.slice(1) || "Pending")}
                          </span>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteOrder(order.id, e)}
                          disabled={deletingOrderId === order.id}
                          className="w-full py-2 px-4 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
                        >
                          {deletingOrderId === order.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              Delete Order
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Order Details
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Order #{selectedOrder.id.substring(0, 8)}... •{" "}
                  {selectedOrder.createdAt.toLocaleDateString("en-PH")}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Customer Info */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Customer Information
                </h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Name</p>
                    <p className="font-medium">
                      {getOrderCustomerLabel(selectedOrder)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium">
                      {(selectedOrder as any).phone || "N/A"}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-500">Address</p>
                    <p className="font-medium">
                      {(selectedOrder as any).address || "N/A"}
                      {(selectedOrder as any).city &&
                        `, ${(selectedOrder as any).city}`}
                      {(selectedOrder as any).zipCode &&
                        ` ${(selectedOrder as any).zipCode}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Products */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Order Items ({selectedOrder.items.length})
                </h3>

                {loadingProducts ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading products...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orderProducts.map((item, index) => (
                      <div
                        key={index}
                        className="flex gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        {item.product?.images && item.product.images[0] && (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">
                            {item.product?.name || "Product not found"}
                          </h4>
                          {item.product?.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {item.product.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-4">
                            <span className="text-sm text-gray-500">
                              Quantity:{" "}
                              <span className="font-semibold text-gray-700">
                                {item.quantity}
                              </span>
                            </span>
                            <span className="text-sm text-gray-500">
                              Price:{" "}
                              <span className="font-semibold text-gray-700">
                                ₱
                                {item.price.toLocaleString("en-PH", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-800">
                            ₱
                            {(item.quantity * item.price).toLocaleString(
                              "en-PH",
                              { minimumFractionDigits: 2 }
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4">
                <div className="space-y-2 max-w-md ml-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">
                      ₱
                      {(
                        selectedOrder.subtotal || selectedOrder.total - 99
                      ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="font-bold text-xl text-red-600">
                      ₱
                      {selectedOrder.total.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Status */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">
                    Current Status:
                  </span>
                  <span
                    className={`px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold rounded-full ${getStatusColor(
                      selectedOrder.status || "pending"
                    )}`}
                  >
                    {getStatusIcon(selectedOrder.status || "pending")}
                    {selectedOrder.status?.charAt(0).toUpperCase() +
                      (selectedOrder.status?.slice(1) || "Pending")}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  <p>
                    Payment Method:{" "}
                    <span className="font-medium capitalize">
                      {(selectedOrder as any).paymentMethod || "N/A"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t p-6 flex justify-end bg-gray-50">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
