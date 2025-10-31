import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Order } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { Package, Clock, Truck, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function StaffDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const { user } = useAuthStore();
  
  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));  
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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
        } as Order;
      });
      
      // Sort orders by date (newest first)
      ordersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus as any, updatedAt: new Date() } 
          : order
      ));
      
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-red-50">
      <div className="container-fluid px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Staff Dashboard</h1>
          <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-yellow-400 rounded-full"></div>
          <p className="mt-4 text-gray-600">Welcome, {user?.name}! Manage all customer orders here.</p>
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
                  <option value="processing">Processing</option>
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
                <div key={order.id} className="bg-white">
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
                        <p className="font-medium text-gray-900">Order #{order.id.substring(0, 8)}...</p>
                        <p className="text-sm text-gray-500">{order.createdAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">₱{order.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                        <p className="text-sm text-gray-500">{order.items.length} item(s)</p>
                      </div>
                      
                      <span className={`px-3 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status || 'pending')}`}>
                        {getStatusIcon(order.status)}
                        {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Order details - expandable */}
                  {expandedOrders[order.id] && (
                    <div className="p-4 md:px-6 pt-0 bg-yellow-50 border-t border-yellow-100">
                      {/* Customer info */}
                      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-2">Customer Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <p><span className="text-gray-500">Name:</span> {order.shippingAddress?.name || 'N/A'}</p>
                            <p><span className="text-gray-500">Phone:</span> {order.shippingAddress?.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <p><span className="text-gray-500">Address:</span> {`${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}`}</p>
                            <p><span className="text-gray-500">State/Postal:</span> {`${order.shippingAddress?.state || ''} ${order.shippingAddress?.postalCode || ''}`}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Order items */}
                      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-2">Order Items</h3>
                        <div className="divide-y divide-gray-100">
                          {order.items.map((item, index) => (
                            <div key={index} className="py-2 flex justify-between items-center">
                              <div>
                                <p className="font-medium">Product ID: {item.productId.substring(0, 8)}...</p>
                                <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                              </div>
                              <p className="font-medium">₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
                          <p className="font-semibold">Total</p>
                          <p className="font-semibold text-red-600">₱{order.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      
                      {/* Order actions */}
                      <div className="p-4 bg-white rounded-lg shadow-sm flex items-center justify-between">
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
                            <option value="processing">Processing</option>
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
