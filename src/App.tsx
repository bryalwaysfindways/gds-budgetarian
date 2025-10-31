// Using React without JSX directly in this file
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Login from './pages/Login';
import Registration from './pages/Registration';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import StaffDashboard from './pages/staff/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AuthProvider from './components/AuthProvider';

function AppLayout() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/registration';
  const isAdmin = location.pathname.startsWith('/admin');
  const isStaff = location.pathname.startsWith('/staff');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!hideNavbar && <Navbar />}
      <main className={`flex-grow ${isAdmin || isStaff ? 'w-full p-0' : 'container mx-auto px-4 py-8'}`}>
        <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registration" element={<Registration />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/*"
                element={
                  <ProtectedRoute staffOnly>
                    <StaffDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
      {!hideNavbar && !isAdmin && !isStaff && <Footer />}
      <Toaster position="top-center" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </Router>
  );
}

export default App;