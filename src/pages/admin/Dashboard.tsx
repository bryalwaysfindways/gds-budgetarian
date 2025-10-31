import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Package, Users, ShoppingBag, BarChart, Shield } from 'lucide-react';
import Products from './Products';
import Orders from './Orders';
import Customers from './Customers';
import Analytics from './Analytics';
import RoleManagement from './RoleManagement';

export default function Dashboard() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-yellow-50 to-red-50 ">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-yellow-200 p-6 shadow-lg">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Admin Dashboard</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-yellow-400 rounded-full"></div>
        </div>
        <nav className="space-y-2">
          <Link
            to="/admin/products"
            className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 font-medium ${
              isActive('/products')
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                : 'hover:bg-yellow-50 hover:text-red-600'
            }`}
          >
            <Package className="h-5 w-5" />
            <span>Products</span>
          </Link>
          <Link
            to="/admin/orders"
            className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 font-medium ${
              isActive('/orders')
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                : 'hover:bg-yellow-50 hover:text-red-600'
            }`}
          >
            <ShoppingBag className="h-5 w-5" />
            <span>Orders</span>
          </Link>
          <Link
            to="/admin/customers"
            className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 font-medium ${
              isActive('/customers')
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                : 'hover:bg-yellow-50 hover:text-red-600'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>Customers</span>
          </Link>
          <Link
            to="/admin/analytics"
            className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 font-medium ${
              isActive('/analytics')
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                : 'hover:bg-yellow-50 hover:text-red-600'
            }`}
          >
            <BarChart className="h-5 w-5" />
            <span>Analytics</span>
          </Link>
          <Link
            to="/admin/roles"
            className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 font-medium ${
              isActive('/roles')
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                : 'hover:bg-yellow-50 hover:text-red-600'
            }`}
          >
            <Shield className="h-5 w-5" />
            <span>Role Management</span>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 bg-transparent overflow-y-auto">
        <Routes>
          <Route path="/" element={<Products />} />
          <Route path="/products/*" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/roles" element={<RoleManagement />} />
        </Routes>
      </div>
    </div>
  );
}