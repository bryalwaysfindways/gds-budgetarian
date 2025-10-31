export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'staff';
  addresses: Address[];
  phone?: string; // Add optional phone field
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  tags: string[];
  variants: ProductVariant[];
  inventory: number;
  isSale?: boolean;
  isFeatured?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  inventory: number;
  price: number;
}

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  shippingMethod: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  id: string;
  type: 'billing' | 'shipping';
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}