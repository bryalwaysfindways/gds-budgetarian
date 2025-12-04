import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Order, Product } from '../../types';
import { getAuth } from 'firebase/auth';
import { Banknote, ShoppingBag, Users, TrendingUp, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

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
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Update stats when filter changes
  useEffect(() => {
    if (allOrders.length === 0) return;
    let filtered = allOrders;
    if (filterMonth !== 'all' || filterYear !== 'all') {
      filtered = allOrders.filter(order => {
        const date = order.createdAt && typeof order.createdAt === 'object' && 'seconds' in order.createdAt && typeof (order.createdAt as { seconds?: unknown }).seconds === 'number'
          ? new Date((order.createdAt as { seconds: number }).seconds * 1000)
          : order.createdAt ? new Date(order.createdAt) : null;
        if (!date) return false;
        const m = date.getMonth();
        const y = date.getFullYear();
        return (filterMonth === 'all' || m === Number(filterMonth)) &&
               (filterYear === 'all' || y === Number(filterYear));
      });
    }
    setStats(s => ({
      ...s,
      totalRevenue: filtered.reduce((sum, o) => sum + (typeof o.total === 'number' ? o.total : 0), 0),
      totalOrders: filtered.length
    }));
  }, [filterMonth, filterYear, allOrders]);

  const fetchAnalytics = async () => {
    try {
      // Fetch orders
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      setAllOrders(orders);

      // Fetch customers (exclude current user)
      const customersSnapshot = await getDocs(collection(db, 'users'));
      const customers = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Only count users with role === 'user' and not the current user
      const totalCustomers = customers.filter(u => {
        const user = u as { id: string; role?: string };
        return (!currentUserId || user.id !== currentUserId) && user.role === 'user';
      }).length;

      // Fetch products
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const products = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      const totalProducts = products.length;

      // Calculate statistics
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const recentOrders = orders
        .sort((a, b) => {
          const dateA = a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt && typeof (a.createdAt as { seconds?: unknown }).seconds === 'number'
            ? new Date((a.createdAt as { seconds: number }).seconds * 1000)
            : a.createdAt ? new Date(a.createdAt) : null;
          const dateB = b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt && typeof (b.createdAt as { seconds?: unknown }).seconds === 'number'
            ? new Date((b.createdAt as { seconds: number }).seconds * 1000)
            : b.createdAt ? new Date(b.createdAt) : null;
          return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
        })
        .slice(0, 5);

      // Calculate top products
      const productSales = new Map<string, number>();
      orders.forEach(order => {
        if (Array.isArray(order.items)) {
          order.items.forEach(item => {
            const currentCount = productSales.get(item.productId) || 0;
            productSales.set(item.productId, currentCount + item.quantity);
          });
        }
      });

      const topProducts = products
        .map(product => ({
          ...product,
          totalSold: productSales.get(product.id) || 0,
        }))
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5);

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        totalCustomers,
        totalProducts,
        recentOrders,
        topProducts,
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  // Get unique months/years for dropdowns
  const monthOptions = Array.from(new Set(
    allOrders
      .map(order => {
        const date = order.createdAt && typeof order.createdAt === 'object' && 'seconds' in order.createdAt && typeof (order.createdAt as { seconds?: unknown }).seconds === 'number'
          ? new Date((order.createdAt as { seconds: number }).seconds * 1000)
          : order.createdAt ? new Date(order.createdAt) : null;
        return date ? date.getMonth() : null;
      })
      .filter((m): m is number => m !== null)
  ));
  const yearOptions = Array.from(new Set(
    allOrders
      .map(order => {
        const date = order.createdAt && typeof order.createdAt === 'object' && 'seconds' in order.createdAt && typeof (order.createdAt as { seconds?: unknown }).seconds === 'number'
          ? new Date((order.createdAt as { seconds: number }).seconds * 1000)
          : order.createdAt ? new Date(order.createdAt) : null;
        return date ? date.getFullYear() : null;
      })
      .filter((y): y is number => y !== null)
  ));

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const exportToExcel = () => {
    try {
      // Filter orders based on current month/year selection
      let filteredOrders = allOrders;
      if (filterMonth !== 'all' || filterYear !== 'all') {
        filteredOrders = allOrders.filter(order => {
          const date = order.createdAt && typeof order.createdAt === 'object' && 'seconds' in order.createdAt && typeof (order.createdAt as { seconds?: unknown }).seconds === 'number'
            ? new Date((order.createdAt as { seconds: number }).seconds * 1000)
            : order.createdAt ? new Date(order.createdAt) : null;
          if (!date) return false;
          const m = date.getMonth();
          const y = date.getFullYear();
          return (filterMonth === 'all' || m === Number(filterMonth)) &&
                 (filterYear === 'all' || y === Number(filterYear));
        });
      }

      // Create Summary Sheet
      const summaryData = [
        ['GDS Budgetarian - Sales Report'],
        [''],
        ['Report Period:', filterMonth === 'all' && filterYear === 'all' ? 'All Time' :
          `${filterMonth !== 'all' ? monthNames[Number(filterMonth)] : 'All Months'} ${filterYear !== 'all' ? filterYear : ''}`],
        ['Generated On:', new Date().toLocaleString()],
        [''],
        ['SUMMARY'],
        ['Total Revenue', `₱${stats.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`],
        ['Total Orders', stats.totalOrders],
        ['Total Customers', stats.totalCustomers],
        ['Total Products', stats.totalProducts],
        ['Average Order Value', stats.totalOrders > 0 ? `₱${(stats.totalRevenue / stats.totalOrders).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00'],
      ];

      // Create Orders Detail Sheet
      const ordersData = [
        ['Order ID', 'Date', 'Customer Name', 'Email', 'Phone', 'Address', 'Payment Method', 'Status', 'Subtotal', 'Shipping', 'Total', 'Items Count']
      ];

      filteredOrders.forEach(order => {
        const date = order.createdAt && typeof order.createdAt === 'object' && 'seconds' in order.createdAt && typeof (order.createdAt as { seconds?: unknown }).seconds === 'number'
          ? new Date((order.createdAt as { seconds: number }).seconds * 1000)
          : order.createdAt ? new Date(order.createdAt) : null;

        ordersData.push([
          order.id,
          date ? date.toLocaleDateString() : 'N/A',
          order.shippingAddress?.name || order.firstName && order.lastName ? `${order.firstName} ${order.lastName}` : 'N/A',
          (order as any).email || 'N/A',
          order.shippingAddress?.phone || (order as any).phone || 'N/A',
          order.shippingAddress ? `${order.shippingAddress.street}, ${order.shippingAddress.city}` : 'N/A',
          (order as any).paymentMethod || 'N/A',
          order.status || 'pending',
          order.subtotal || 0,
          order.shippingCost || 0,
          order.total || 0,
          order.items?.length || 0
        ]);
      });

      // Create Product Sales Sheet
      const productSalesMap = new Map<string, { name: string, quantity: number, revenue: number }>();

      filteredOrders.forEach(order => {
        if (Array.isArray(order.items)) {
          order.items.forEach(item => {
            const current = productSalesMap.get(item.productId) || { name: '', quantity: 0, revenue: 0 };
            productSalesMap.set(item.productId, {
              name: current.name || `Product ${item.productId.substring(0, 8)}`,
              quantity: current.quantity + item.quantity,
              revenue: current.revenue + (item.price * item.quantity)
            });
          });
        }
      });

      const productSalesData = [
        ['Product ID', 'Product Name', 'Units Sold', 'Total Revenue']
      ];

      Array.from(productSalesMap.entries())
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .forEach(([productId, data]) => {
          productSalesData.push([
            productId,
            data.name,
            data.quantity,
            data.revenue
          ]);
        });

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Add Summary sheet
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Add Orders sheet
      const wsOrders = XLSX.utils.aoa_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');

      // Add Product Sales sheet
      const wsProducts = XLSX.utils.aoa_to_sheet(productSalesData);
      XLSX.utils.book_append_sheet(wb, wsProducts, 'Product Sales');

      // Generate filename with date
      const fileName = `GDS_Budgetarian_Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);

      toast.success('Excel file exported successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
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
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end mb-6">
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Month</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
          >
            <option value="all">All</option>
            {monthOptions.sort((a, b) => a - b).map(m => (
              <option key={m} value={m}>{monthNames[m]}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
          >
            <option value="all">All</option>
            {yearOptions.sort((a, b) => b - a).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-5 md:p-6 flex items-center gap-4 border-l-4 border-purple-500">
          <div className="bg-purple-100 p-3 rounded-full flex-shrink-0">
            <Banknote className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-gray-500 text-xs font-semibold uppercase mb-1">Total Revenue</div>
            <div className="text-lg md:text-xl font-bold text-gray-900 truncate">₱{stats.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-500 mb-1 font-semibold uppercase">Total Orders</p>
              <p className="text-xl md:text-2xl font-bold">{stats.totalOrders}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-500 mb-1 font-semibold uppercase">Total Customers</p>
              <p className="text-xl md:text-2xl font-bold">{stats.totalCustomers}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full flex-shrink-0">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-500 mb-1 font-semibold uppercase">Total Products</p>
              <p className="text-xl md:text-2xl font-bold">{stats.totalProducts}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-4 md:p-5 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">Recent Orders</h2>
          </div>
          <div className="p-4 md:p-5">
            <div className="space-y-3 md:space-y-4">
              {stats.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base truncate">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs md:text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-medium text-sm md:text-base">₱{typeof order.total === 'number' ? order.total.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : ''}</p>
                    <p className={`text-xs md:text-sm font-semibold ${
                      order.status === 'delivered' ? 'text-green-600' :
                      order.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {typeof order.status === 'string' && order.status.length > 0
  ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
  : 'Unknown'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-4 md:p-5 border-b bg-gradient-to-r from-yellow-50 to-red-50">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">Top Products</h2>
          </div>
          <div className="p-4 md:p-5">
            <div className="space-y-3 md:space-y-4">
              {stats.topProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center flex-1 min-w-0">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base truncate">{product.name}</p>
                      <p className="text-xs md:text-sm text-gray-500">₱{typeof product.price === 'number' ? product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : ''}</p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-medium text-sm md:text-base">{product.totalSold} sold</p>
                    <p className="text-xs md:text-sm text-gray-500">
                      ₱{typeof product.price === 'number' && typeof product.totalSold === 'number' ? (product.price * product.totalSold).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : ''}
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