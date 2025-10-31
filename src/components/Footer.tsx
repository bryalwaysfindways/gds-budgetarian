import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-red-600 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img src="/images/logo2.png" alt="Logo" className="h-56 w-56 object-contain rounded-full" />
            <h3 className="text-xl font-semibold mb-4">GDS Budgetarian</h3>
            
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-300 hover:text-white">Home</Link></li>
              <li><Link to="/products" className="text-gray-300 hover:text-white">Products</Link></li>
              <li><Link to="/cart" className="text-gray-300 hover:text-white">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-300">
              <li>Email: info@gdsbudgetarian.com</li>
              <li>Phone: (555) 123-4567</li>
              <li>Address: 123 GDS Budgetarian</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-300">
          <p>&copy; {new Date().getFullYear()} GDS Budgetarian. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 