// Orders.tsx - List all placed orders from Firestore
import React, { useEffect, useState } from 'react';
import ReviewModal from '../components/ReviewModal';
import toast from 'react-hot-toast';
import { db } from '../lib/firebase';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData, addDoc, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { Clock, Package, Truck, CheckCircle, AlertCircle, History as HistoryIcon, Eye, X, Trash2 } from 'lucide-react';

interface StatusHistory {
  status: string;
  timestamp: any;
  updatedBy?: string;
}

interface Order {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  paymentMethod: string;
  gcashNumber?: string;
  subtotal: number;
  shipping: number;
  total: number;
  isDelivered: boolean;
  isReceived?: boolean; // Track if order has been received
  status?: string; // Add status field
  statusHistory?: StatusHistory[]; // Track status changes
  createdAt?: { seconds: number; nanoseconds: number };
  items?: Array<{productId: string, productName: string, quantity: number, price: number}>;
}

const Orders: React.FC = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'processing': return <Package className="w-4 h-4 text-blue-600" />;
      case 'shipped': return <Truck className="w-4 h-4 text-purple-600" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

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

  const getStatusLabel = (status: string) => {
    if (status === 'processing') return 'Preparing';
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  useEffect(() => {
    if (!user?.id) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.id));
        const querySnapshot = await getDocs(ordersQuery);
        const fetched: Order[] = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];
        setOrders(fetched);
        setError(null);
      } catch (err) {
        setError('Failed to fetch orders.');
      }
      setLoading(false);
    };

    fetchOrders();
  }, [user]);

  function formatPeso(amount: number) {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  }
  function formatDate(ts?: { seconds: number; nanoseconds: number }) {
    if (!ts) return '';
    const date = new Date(ts.seconds * 1000);
    return date.toLocaleString('en-PH');
  }

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;

    setCancelling(true);
    try {
      await deleteDoc(doc(db, 'orders', orderToCancel.id));
      setOrders(prevOrders => prevOrders.filter(o => o.id !== orderToCancel.id));
      toast.success('Order cancelled successfully');
      setCancelConfirmOpen(false);
      setOrderToCancel(null);
    } catch (err) {
      console.error('Error cancelling order:', err);
      toast.error('Failed to cancel order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      {!user?.id ? (
        <div className="text-red-500">Please log in to view your orders.</div>
      ) : loading ? (
        <div>Loading orders...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : orders.length === 0 ? (
        <div>No orders found.</div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 mb-8">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Order ID</p>
                    <p className="text-sm font-mono font-semibold text-gray-800 break-all">#{order.id.substring(0, 8)}...</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {getStatusIcon(order.status || 'pending')}
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status || 'pending')}`}>
                      {getStatusLabel(order.status || 'pending')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-semibold">{order.firstName} {order.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="text-sm font-bold text-red-600">{formatPeso(order.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedOrderForDetails(order);
                        setDetailsModalOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition"
                    >
                      <Eye className="w-4 h-4" />
                      Details
                    </button>

                    {order.status === 'pending' && (
                      <button
                        onClick={() => {
                          setOrderToCancel(order);
                          setCancelConfirmOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                        title="Cancel and delete this order"
                      >
                        <Trash2 className="w-4 h-4" />
                        Cancel
                      </button>
                    )}
                  </div>

                  {order.status === 'delivered' && (
                    order.isReceived ? (
                      <button
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setReviewModalOpen(true);
                        }}
                      >
                        Review
                      </button>
                    ) : (
                      <button
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                        onClick={async () => {
                          try {
                            const orderRef = doc(db, 'orders', order.id);
                            await updateDoc(orderRef, { isReceived: true });
                            setOrders(prevOrders =>
                              prevOrders.map(o =>
                                o.id === order.id ? { ...o, isReceived: true } : o
                              )
                            );
                          } catch (err) {
                            console.error('Error marking order as received:', err);
                            alert('Failed to update order status. Please try again.');
                          }
                        }}
                      >
                        Receive
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md text-sm">
            <thead>
              <tr className="bg-purple-600 text-white">
                <th className="py-1.5 px-2 font-semibold rounded-tl-lg">Order ID</th>
                <th className="py-1.5 px-2 font-semibold">Name</th>
                <th className="py-1.5 px-2 font-semibold">Email</th>
                <th className="py-1.5 px-2 font-semibold">Phone</th>
                <th className="py-1.5 px-2 font-semibold">Address</th>
                <th className="py-1.5 px-2 font-semibold">Payment</th>
                <th className="py-1.5 px-2 font-semibold">Subtotal</th>
                <th className="py-1.5 px-2 font-semibold">Shipping</th>
                <th className="py-1.5 px-2 font-semibold">Total</th>
                <th className="py-1.5 px-2 font-semibold">Status</th>
                <th className="py-1.5 px-2 font-semibold rounded-tr-lg">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <React.Fragment key={order.id}>
                  <tr className="hover:bg-gray-100">
                  <td className="py-1 px-2 border-b text-xs break-all">{order.id}</td>
                  <td className="py-1 px-2 border-b whitespace-nowrap">{order.firstName} {order.lastName}</td>
                  <td className="py-1 px-2 border-b whitespace-nowrap">{order.email}</td>
                  <td className="py-1 px-2 border-b whitespace-nowrap">{order.phone}</td>
                  <td className="py-1 px-2 border-b whitespace-nowrap">{order.address}, {order.city} {order.zipCode}</td>
                  <td className="py-1 px-2 border-b capitalize">
                    {order.paymentMethod}
                    {order.paymentMethod === 'gcash' && order.gcashNumber && (
                      <span className="text-xs text-gray-500 ml-1">({order.gcashNumber})</span>
                    )}
                  </td>
                  <td className="py-1 px-2 border-b">{formatPeso(order.subtotal)}</td>
                  <td className="py-1 px-2 border-b">{formatPeso(order.shipping)}</td>
                  <td className="py-1 px-2 border-b font-bold">{formatPeso(order.total)}</td>
                  <td className="py-1 px-2 border-b">
                    <div className="flex flex-col items-start gap-1">
                      {/* Current Status */}
                      <div className="flex items-center gap-1">
                        {getStatusIcon(order.status || 'pending')}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status || 'pending')}`}>
                          {getStatusLabel(order.status || 'pending')}
                        </span>
                      </div>

                      {/* View History Button */}
                      {order.statusHistory && order.statusHistory.length > 1 && (
                        <button
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                        >
                          <HistoryIcon className="w-3 h-3" />
                          {expandedOrderId === order.id ? 'Hide' : 'View'} History
                        </button>
                      )}

                      {/* Cancel Button for Pending Orders */}
                      {order.status === 'pending' && (
                        <button
                          className="mt-1 px-3 py-0.5 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition flex items-center gap-1"
                          onClick={() => {
                            setOrderToCancel(order);
                            setCancelConfirmOpen(true);
                          }}
                          title="Cancel and delete this order"
                        >
                          <Trash2 className="w-3 h-3" />
                          Cancel
                        </button>
                      )}

                      {/* Action Buttons */}
                      {order.status === 'delivered' && (
                        order.isReceived ? (
                          <button
                            className="mt-1 px-3 py-0.5 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setReviewModalOpen(true);
                            }}
                          >
                            Review
                          </button>
                        ) : (
                          <button
                            className="mt-1 px-3 py-0.5 rounded bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition"
                            onClick={async () => {
                              try {
                                const orderRef = doc(db, 'orders', order.id);
                                await updateDoc(orderRef, { isReceived: true });

                                // Update local state with the received status
                                setOrders(prevOrders =>
                                  prevOrders.map(o =>
                                    o.id === order.id ? { ...o, isReceived: true } : o
                                  )
                                );
                              } catch (err) {
                                console.error('Error marking order as received:', err);
                                alert('Failed to update order status. Please try again.');
                              }
                            }}
                          >
                            Receive Order
                          </button>
                        )
                      )}
                    </div>
                  </td>
                    <td className="py-1 px-2 border-b text-xs whitespace-nowrap">{formatDate(order.createdAt)}</td>
                  </tr>
                  {/* Status History Row */}
                  {expandedOrderId === order.id && order.statusHistory && order.statusHistory.length > 0 && (
                    <tr>
                      <td colSpan={11} className="p-0 bg-indigo-50">
                      <div className="p-4">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <HistoryIcon className="w-4 h-4 text-indigo-600" />
                          Order Status History
                        </h4>
                        <div className="space-y-2">
                          {order.statusHistory
                            .slice()
                            .sort((a, b) => {
                              const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
                              const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
                              return timeB - timeA; // newest first
                            })
                            .map((history, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border-l-4 border-indigo-400 shadow-sm">
                                <div className="flex-shrink-0 mt-1">
                                  {getStatusIcon(history.status)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
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
                                    {history.timestamp?.seconds
                                      ? new Date(history.timestamp.seconds * 1000).toLocaleString('en-PH', {
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
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      {/* Order Details Modal for Mobile */}
      {detailsModalOpen && selectedOrderForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Order Details</h2>
              <button
                onClick={() => {
                  setDetailsModalOpen(false);
                  setSelectedOrderForDetails(null);
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Order ID */}
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Order ID</p>
                <p className="text-sm font-mono font-semibold text-gray-800 break-all">{selectedOrderForDetails.id}</p>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs text-gray-600 mb-2">Status</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedOrderForDetails.status || 'pending')}
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedOrderForDetails.status || 'pending')}`}>
                    {getStatusLabel(selectedOrderForDetails.status || 'pending')}
                  </span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-3">Customer Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{selectedOrderForDetails.firstName} {selectedOrderForDetails.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-xs break-all">{selectedOrderForDetails.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{selectedOrderForDetails.phone}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-3">Delivery Address</h3>
                <p className="text-sm text-gray-700">
                  {selectedOrderForDetails.address}, {selectedOrderForDetails.city} {selectedOrderForDetails.zipCode}
                </p>
              </div>

              {/* Payment Details */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-3">Payment Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium capitalize">{selectedOrderForDetails.paymentMethod}</span>
                  </div>
                  {selectedOrderForDetails.paymentMethod === 'gcash' && selectedOrderForDetails.gcashNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">GCash Number:</span>
                      <span className="font-medium">{selectedOrderForDetails.gcashNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatPeso(selectedOrderForDetails.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="font-medium">{formatPeso(selectedOrderForDetails.shipping)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-base">
                    <span className="text-gray-800">Total:</span>
                    <span className="text-red-600">{formatPeso(selectedOrderForDetails.total)}</span>
                  </div>
                </div>
              </div>

              {/* Order Date */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-2">Order Date</h3>
                <p className="text-sm text-gray-600">{formatDate(selectedOrderForDetails.createdAt)}</p>
              </div>

              {/* Status History */}
              {selectedOrderForDetails.statusHistory && selectedOrderForDetails.statusHistory.length > 1 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <HistoryIcon className="w-4 h-4 text-indigo-600" />
                    Status History
                  </h3>
                  <div className="space-y-2">
                    {selectedOrderForDetails.statusHistory
                      .slice()
                      .sort((a, b) => {
                        const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
                        const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
                        return timeB - timeA;
                      })
                      .map((history, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-indigo-50 rounded-lg">
                          <div className="flex-shrink-0 mt-1">
                            {getStatusIcon(history.status)}
                          </div>
                          <div className="flex-1 text-xs">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(history.status)}`}>
                                {getStatusLabel(history.status)}
                              </span>
                              {index === 0 && (
                                <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-medium">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600">
                              {history.timestamp?.seconds
                                ? new Date(history.timestamp.seconds * 1000).toLocaleString('en-PH', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : new Date(history.timestamp).toLocaleString('en-PH', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                              }
                            </p>
                            {history.updatedBy && (
                              <p className="text-gray-500 mt-0.5">
                                By: {history.updatedBy}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedOrderForDetails.status === 'delivered' && (
                <div className="border-t pt-4">
                  {selectedOrderForDetails.isReceived ? (
                    <button
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                      onClick={() => {
                        setSelectedOrderId(selectedOrderForDetails.id);
                        setReviewModalOpen(true);
                        setDetailsModalOpen(false);
                      }}
                    >
                      Write a Review
                    </button>
                  ) : (
                    <button
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                      onClick={async () => {
                        try {
                          const orderRef = doc(db, 'orders', selectedOrderForDetails.id);
                          await updateDoc(orderRef, { isReceived: true });
                          setOrders(prevOrders =>
                            prevOrders.map(o =>
                              o.id === selectedOrderForDetails.id ? { ...o, isReceived: true } : o
                            )
                          );
                          setSelectedOrderForDetails({ ...selectedOrderForDetails, isReceived: true });
                        } catch (err) {
                          console.error('Error marking order as received:', err);
                          alert('Failed to update order status. Please try again.');
                        }
                      }}
                    >
                      Mark as Received
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {reviewModalOpen && selectedOrderId && (
        <ReviewModal
          open={reviewModalOpen}
          orderId={selectedOrderId}
          order={orders.find(o => o.id === selectedOrderId)}
          onClose={() => setReviewModalOpen(false)}
          onSubmit={async ({ rating, description, order }) => {
            if (!order) return;
            try {
              const { id: orderId, ...orderFields } = order;
              // Debug: log order
              console.log('Submitting review for order:', order);
              // If order.items exists and is an array, create a review for each product
              if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                for (const item of order.items) {
                  await addDoc(collection(db, 'reviews'), {
                    orderId,
                    productId: item.productId,
                    productName: item.productName,
                    userId: order.userId,
                    userName: order.firstName + ' ' + order.lastName,
                    rating,
                    description,
                    createdAt: new Date(),
                    ...orderFields,
                  });
                }
              } else {
                // Fallback: create a review for the whole order
                await addDoc(collection(db, 'reviews'), {
                  orderId,
                  userId: order.userId,
                  userName: order.firstName + ' ' + order.lastName,
                  rating,
                  description,
                  createdAt: new Date(),
                  ...orderFields,
                });
              }
              alert('Review submitted!');
            } catch (err) {
              console.error('Failed to submit review:', err);
              alert('Failed to submit review.');
            }
            setReviewModalOpen(false);
          }}
        />
      )}

      {/* Cancel Order Confirmation Modal */}
      {cancelConfirmOpen && orderToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            {/* Modal Header */}
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Cancel Order
              </h2>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              <p className="text-gray-700 mb-2">
                Are you sure you want to cancel this order?
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Order ID: <span className="font-mono font-semibold">{orderToCancel.id.substring(0, 12)}...</span>
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-red-800 mb-2 font-semibold">⚠️ This action cannot be undone</p>
                <p className="text-xs text-red-700">
                  The order will be permanently deleted and staff/admin will not be able to process it.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setCancelConfirmOpen(false);
                  setOrderToCancel(null);
                }}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {cancelling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Yes, Cancel Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
