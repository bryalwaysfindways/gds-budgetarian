import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, Timestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Order, Product } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import {useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Package, Clock, Truck, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Users, ShoppingBag, History, Trash2 } from 'lucide-react';
import AdminHeader from '../../components/AdminHeader';

export default function StaffDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [productCache, setProductCache] = useState<Record<string, Product>>({});
  const { user } = useAuthStore();
  const location = useLocation();
  
  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));  
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Auto-expand order if coming from notification
  useEffect(() => {
    const state = location.state as { orderId?: string };
    const orderId = state?.orderId;
    if (orderId) {
      // Wait for orders to load, then expand the specific order
      setTimeout(() => {
        setExpandedOrders(prev => ({
          ...prev,
          [orderId]: true
        }));

        // Scroll to the order
        const orderElement = document.getElementById(`order-${orderId}`);
        if (orderElement) {
          orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the order briefly
          orderElement.classList.add('ring-4', 'ring-blue-400', 'ring-opacity-50');
          setTimeout(() => {
            orderElement.classList.remove('ring-4', 'ring-blue-400', 'ring-opacity-50');
          }, 2000);
        }
      }, 100);
    }
  }, [location.state, orders]);

  const fetchProductDetails = async (productId: string): Promise<Product | null> => {
    // Check cache first
    if (productCache[productId]) {
      return productCache[productId];
    }

    try {
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        const product = { id: productSnap.id, ...productSnap.data() } as Product;
        setProductCache(prev => ({ ...prev, [productId]: product }));
        return product;
      }
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error);
    }

    return null;
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersRef = collection(db, 'orders');
      const snapshot = await getDocs(ordersRef);

      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          statusHistory: data.statusHistory?.map((h: any) => ({
            ...h,
            timestamp: h.timestamp?.toDate() || new Date()
          })) || []
        } as Order;
      });

      // Sort orders by date (newest first)
      ordersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setOrders(ordersData);

      // Prefetch product details for all order items
      const productIds = new Set<string>();
      ordersData.forEach(order => {
        order.items.forEach(item => productIds.add(item.productId));
      });

      // Fetch all products in parallel
      await Promise.all(
        Array.from(productIds).map(productId => fetchProductDetails(productId))
      );
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Create new status history entry
      const newHistoryEntry = {
        status: newStatus as any,
        timestamp: Timestamp.now(),
        updatedBy: user?.email || 'staff'
      };

      // Get existing history or initialize
      const existingHistory = order.statusHistory || [];
      const updatedHistory = [...existingHistory, newHistoryEntry];

      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
        statusHistory: updatedHistory
      });

      // Update local state
      setOrders(orders.map(o =>
        o.id === orderId
          ? {
              ...o,
              status: newStatus as any,
              updatedAt: new Date(),
              statusHistory: updatedHistory.map(h => ({
                ...h,
                timestamp: h.timestamp instanceof Timestamp ? h.timestamp.toDate() : h.timestamp
              }))
            }
          : o
      ));

      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const deleteOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const customerName = order.shippingAddress?.name || `${(order as any).firstName || ''} ${(order as any).lastName || ''}`.trim() || 'Customer';

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete this order?\n\n` +
      `Customer: ${customerName}\n` +
      `Order ID: ${orderId.substring(0, 8)}...\n` +
      `Total: ₱${order.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'orders', orderId));

      // Update local state
      setOrders(orders.filter(o => o.id !== orderId));

      // Close the expanded order if it was open
      setExpandedOrders(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });

      toast.success('Order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    }
  };

  const filteredOrders = (selectedStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedStatus))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by date (newest first)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'processing': return <Package className="w-4 h-4 text-blue-600" />;
      case 'shipped': return <Truck className="w-4 h-4 text-purple-600" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    if (status === 'processing') return 'Preparing';
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-red-50">
      {/* Header with notifications and profile */}
      <AdminHeader />

      <div className="container-fluid px-4 py-8">
        <div className="mb-8">
          <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-yellow-400 rounded-full mb-4"></div>
          <p className="text-gray-600">Welcome, {user?.name || 'Staff'}! Manage all customer orders here.</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-yellow-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-yellow-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-red-500" /> Orders Management
              </h2>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Filter by status:</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="p-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Preparing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No orders found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <div key={order.id} id={`order-${order.id}`} className="bg-white transition-all duration-200">
                  {/* Order header - always visible */}
                  <div
                    className="p-4 md:px-6 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 cursor-pointer hover:bg-yellow-50 transition-colors"
                    onClick={() => toggleOrderDetails(order.id)}
                  >
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      {expandedOrders[order.id] ? (
                        <ChevronUp className="w-5 h-5 text-red-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {order.shippingAddress?.name || `${(order as any).firstName || ''} ${(order as any).lastName || ''}`.trim() || 'Customer'}
                        </p>
                        <p className="text-sm text-gray-500">Order #{order.id.substring(0, 8)}... • {order.createdAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">₱{order.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                        <p className="text-sm text-gray-500">{order.items.length} item(s)</p>
                      </div>
                      
                      <span className={`px-3 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status || 'pending')}`}>
                        {getStatusIcon(order.status)}
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Order details - expandable */}
                  {expandedOrders[order.id] && (
                    <div className="p-4 md:px-6 pt-0 bg-yellow-50 border-t border-yellow-100">
                      {/* Order ID and Date */}
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-600">
                              <span className="font-semibold">Order ID:</span>
                              <span className="ml-2 font-mono text-xs bg-white px-2 py-1 rounded">{order.id}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              <span className="font-semibold">Order Date:</span>
                              <span className="ml-2">{order.createdAt.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Customer info */}
                      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          Customer Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="space-y-2">
                            <p>
                              <span className="text-gray-500 font-medium">Name:</span>
                              <span className="ml-2">{order.shippingAddress?.name || `${(order as any).firstName || ''} ${(order as any).lastName || ''}`.trim() || 'N/A'}</span>
                            </p>
                            <p>
                              <span className="text-gray-500 font-medium">Email:</span>
                              <span className="ml-2">{(order as any).email || 'N/A'}</span>
                            </p>
                            <p>
                              <span className="text-gray-500 font-medium">Phone:</span>
                              <span className="ml-2">{order.shippingAddress?.phone || (order as any).phone || 'N/A'}</span>
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p>
                              <span className="text-gray-500 font-medium">Address:</span>
                              <span className="ml-2">{order.shippingAddress?.street || (order as any).address || 'N/A'}</span>
                            </p>
                            <p>
                              <span className="text-gray-500 font-medium">City:</span>
                              <span className="ml-2">{order.shippingAddress?.city || (order as any).city || 'N/A'}</span>
                            </p>
                            <p>
                              <span className="text-gray-500 font-medium">Postal Code:</span>
                              <span className="ml-2">{order.shippingAddress?.postalCode || (order as any).zipCode || 'N/A'}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Payment Information */}
                      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <ShoppingBag className="w-5 h-5 text-green-600" />
                          Payment Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium">Payment Method:</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              (order as any).paymentMethod === 'cod'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {(order as any).paymentMethod === 'cod' ? '💵 Cash on Delivery' : '📱 GCash'}
                            </span>
                          </div>

                          {/* Valid ID for COD */}
                          {(order as any).paymentMethod === 'cod' && (order as any).validIdUrl && (
                            <div className="border-t pt-3 mt-3">
                              <p className="text-gray-500 font-medium mb-2">Valid ID (Uploaded):</p>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <img
                                  src={(order as any).validIdUrl}
                                  alt="Customer Valid ID"
                                  className="max-w-md w-full rounded-lg border-2 border-gray-300 cursor-pointer hover:border-blue-500 transition-colors"
                                  onClick={() => window.open((order as any).validIdUrl, '_blank')}
                                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                  💡 Click image to view full size in new tab
                                </p>
                              </div>
                            </div>
                          )}

                          {/* GCash Number */}
                          {(order as any).paymentMethod === 'gcash' && (order as any).gcashNumber && (
                            <div className="border-t pt-3 mt-3">
                              <p className="text-gray-500 font-medium">GCash Number:</p>
                              <p className="text-lg font-semibold text-blue-600 mt-1">
                                {(order as any).gcashNumber}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order items */}
                      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Package className="w-5 h-5 text-purple-600" />
                          Order Items
                        </h3>
                        <div className="divide-y divide-gray-100">
                          {order.items.map((item, index) => {
                            const product = productCache[item.productId];
                            return (
                              <div key={index} className="py-3 flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-gray-800">
                                    {product?.name || 'Loading...'}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    Quantity: <span className="font-semibold text-gray-700">{item.quantity}</span> ×
                                    <span className="ml-1">₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">ID: {item.productId.substring(0, 8)}...</p>
                                </div>
                                <p className="font-semibold text-lg">₱{(item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Order Summary with breakdown */}
                        <div className="mt-4 pt-4 border-t-2 border-gray-200 space-y-2">
                          <div className="flex justify-between text-sm">
                            <p className="text-gray-600">Subtotal:</p>
                            <p className="font-medium">₱{(order.subtotal || order.total - 99).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="flex justify-between text-sm">
                            <p className="text-gray-600">Shipping Fee:</p>
                            <p className="font-medium">₱{(order.shippingCost || 99).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-200">
                            <p className="font-bold text-lg">Total:</p>
                            <p className="font-bold text-xl text-red-600">₱{order.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      </div>

                      {/* Status History */}
                      {order.statusHistory && order.statusHistory.length > 0 && (
                        <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
                          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <History className="w-5 h-5 text-indigo-600" />
                            Status History
                          </h3>
                          <div className="space-y-3">
                            {order.statusHistory
                              .slice()
                              .sort((a, b) => {
                                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                                return timeB - timeA; // newest first
                              })
                              .map((history, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-l-4 border-indigo-400">
                                  <div className="flex-shrink-0 mt-1">
                                    {getStatusIcon(history.status)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(history.status)}`}>
                                        {getStatusLabel(history.status)}
                                      </span>
                                      {index === 0 && (
                                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-medium">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">
                                      {history.timestamp instanceof Date
                                        ? history.timestamp.toLocaleString('en-PH', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                        : new Date(history.timestamp).toLocaleString('en-PH', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                      }
                                    </p>
                                    {history.updatedBy && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Updated by: <span className="font-medium">{history.updatedBy}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Order actions */}
                      <div className="p-4 bg-white rounded-lg shadow-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-800">Update Status</h3>
                          <div className="flex items-center gap-2">
                            <select
                              value={order.status || 'pending'}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateOrderStatus(order.id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Preparing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateOrderStatus(order.id, order.status || 'pending');
                                toast.success('Order status updated');
                              }}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                            >
                              Update
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteOrder(order.id);
                              }}
                              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
