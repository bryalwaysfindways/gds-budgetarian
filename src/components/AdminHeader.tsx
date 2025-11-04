import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Notification } from '../types';

function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Listen to notifications in real-time
  useEffect(() => {
    if (!user) return;

    // Query notifications - using orderBy only to avoid composite index requirement
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs: Notification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Client-side filter: only show notifications for admin, staff, or both
          if (data.recipientRole === 'admin' ||
              data.recipientRole === 'staff' ||
              data.recipientRole === 'both') {
            notifs.push({ id: doc.id, ...data } as Notification);
          }
        });
        console.log('Notifications loaded:', notifs.length);
        setNotifications(notifs);
      },
      (error) => {
        console.error('Error loading notifications:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await updateDoc(doc(db, 'notifications', notification.id), {
        read: true,
      });
    }

    // Navigate to appropriate route based on user role with orderId in state
    const targetRoute = user?.role === 'staff' ? '/staff' : '/admin/orders';
    navigate(targetRoute, { state: { orderId: notification.orderId } });
    setOpen(false);
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    await Promise.all(
      unreadNotifications.map(n =>
        updateDoc(doc(db, 'notifications', n.id), { read: true })
      )
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl py-2 z-50 border max-h-96 overflow-y-auto">
          <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`h-2 w-2 rounded-full ${!notification.read ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {notification.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
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

  // Get first letter of name or email
  const getInitial = () => {
    if (user.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center space-x-2 focus:outline-none hover:opacity-80 transition-opacity"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {/* Round avatar with initial */}
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
          {getInitial()}
        </div>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-50 border">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user.name || 'Admin'}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <button
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminHeader() {
  const { user } = useAuthStore();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <img src="/images/logo2.png" alt="Logo" className="h-10 w-10 object-contain rounded-full" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">GDS Budgetarian</h1>
              <p className="text-xs text-gray-500">{user?.role === 'admin' ? 'Admin' : 'Staff'} Portal</p>
            </div>
          </div>

          {/* Right side - Notifications and Profile */}
          <div className="flex items-center space-x-4">
            <NotificationDropdown />
            {user && <UserMenu user={user} />}
          </div>
        </div>
      </div>
    </header>
  );
}
