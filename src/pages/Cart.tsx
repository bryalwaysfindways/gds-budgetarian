import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';


import { useCartStore } from '../store/useCartStore';

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const cartItems = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  // Get products from cache
  let products: any[] = [];
  const cached = localStorage.getItem('products-cache');
  if (cached) {
    products = JSON.parse(cached);
  }

  // Helper to get product info
  const getProductInfo = (productId: string) => {
    return products.find((p) => String(p.id) === String(productId));
  };

  const handleUpdateQuantity = (productId: string, variantId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeItem(productId, variantId);
      toast.success('Item removed from cart');
      return;
    }
    updateQuantity(productId, variantId, newQuantity);
    toast.success('Cart updated');
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const total = subtotal ;


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {cartItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-6">Your cart is empty</p>
          <Link
            to="/products"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map(item => {
              const product = getProductInfo(item.productId);
              return (
                <div
                  key={item.productId + '-' + item.variantId}
                  className="bg-white rounded-lg shadow-md p-6 flex items-center gap-4"
                >
                  {product && product.image && (
                    <img
                      src={product.image}
                      alt={product.name || 'Product'}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold">{product?.name || `Product: ${item.productId}`}</h3>
                    <p className="text-purple-600 font-medium">
                      {product?.price !== undefined
                        ? `₱${product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                        : `₱${item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                    </p>
                    <p className="text-gray-500 text-sm">Quantity: {item.quantity}</p>
                    <p className="text-gray-500 text-sm">Variant: {item.variantId || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-4">
  <button
    className="bg-gray-200 px-3 py-1 rounded text-lg font-bold hover:bg-gray-300 disabled:opacity-50"
    onClick={() => handleUpdateQuantity(item.productId, item.variantId, item.quantity - 1)}
    disabled={item.quantity <= 1}
    aria-label="Decrease quantity"
  >
    -
  </button>
  <span className="text-lg font-semibold w-8 text-center">{item.quantity}</span>
  <button
    className="bg-gray-200 px-3 py-1 rounded text-lg font-bold hover:bg-gray-300"
    onClick={() => handleUpdateQuantity(item.productId, item.variantId, item.quantity + 1)}
    aria-label="Increase quantity"
  >
    +
  </button>
  <button
    onClick={() => removeItem(item.productId, item.variantId)}
    className="text-red-500 hover:text-red-700 ml-2"
  >
    Remove
  </button>
</div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-md p-6 h-fit">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{`₱${subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}</span>
              </div>
              
              <div className="border-t pt-2 mt-2 font-semibold text-black flex justify-between">
                <span>Total</span>
                <span>{`₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/checkout', { state: { total } })}
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors mt-6"
            >
              Proceed to Checkout
            </button>
            <Link
              to="/products"
              className="block text-center text-purple-600 hover:text-purple-700 mt-4"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart; 