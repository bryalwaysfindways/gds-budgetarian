import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, ListOrdered } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useRef, useState } from 'react';

function UserMenu({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center space-x-2 focus:outline-none"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <User className="h-6 w-6 text-gray-600" />
        <span className="text-gray-600 text-sm">{user.email}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-2 z-50 border">
          <button
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user } = useAuthStore();
  const { items } = useCartStore();
  const cartItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className="bg-yellow-500 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {(!user || (user.role !== 'admin' && user.role !== 'staff')) && (
            <Link to="/" className="flex items-center space-x-2">
              <img src="/images/logo2.png" alt="Logo" className="h-150 w-10 object-contain rounded-full" />
              <span className="text-2xl font-bold text-red-600">GDS Budgetarian</span>
            </Link>
          )}

          {/* Show Admin/Staff links based on role */}
          {user && user.role === 'admin' ? (
            <Link to="/admin/dashboard" className="text-gray-600 hover:text-primary transition-colors">
              Admin Dashboard
            </Link>
          ) : user && user.role === 'staff' ? (
            <Link to="/staff" className="text-gray-600 hover:text-primary transition-colors">
              Staff Dashboard
            </Link>
          ) : (
            <div className="hidden md:flex items-center space-x-8"></div>
          )}

          <div className="flex items-center space-x-6">
            {(!user || (user.role !== 'admin' && user.role !== 'staff')) && (
              <>
                <Link to="/orders" className="flex items-center space-x-1 text-gray-600 hover:text-primary transition-colors">
                  <ListOrdered className="h-6 w-6" />
                  <span className="hidden md:inline text-sm font-medium">Orders</span>
                </Link>
                <Link to="/cart" className="relative">
                  <ShoppingCart className="h-6 w-6 text-gray-600 hover:text-primary transition-colors" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </Link>
              </>
            )}
            <div className="relative">
              {user ? (
                <UserMenu user={user} />
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 border border-yellow-400 rounded-md transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">Login</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}