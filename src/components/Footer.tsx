import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-red-600 text-white py-8 md:py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center md:items-start">
            <img src="/images/logo2.png" alt="Logo" className="h-32 w-32 md:h-56 md:w-56 object-contain rounded-full mb-4" />
            <h3 className="text-xl font-semibold">GDS Budgetarian</h3>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-300 hover:text-white transition">Home</Link></li>
              <li><Link to="/products" className="text-gray-300 hover:text-white transition">Products</Link></li>
              <li><Link to="/cart" className="text-gray-300 hover:text-white transition">Cart</Link></li>
            </ul>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-xl font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-300 text-sm md:text-base">
              <li>Email: info@gdsbudgetarian.com</li>
              <li>Phone: 09075626970 / 09565280198</li>
              <li>Laurel, Aguada Ozamis City</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-red-500 text-center text-gray-200">
          <p className="text-sm">&copy; {new Date().getFullYear()} GDS Budgetarian. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 