import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User, Order } from '../../types';
import { Search, Mail, Phone, X, User as UserIcon, MapPin, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

// Customer Details Modal Component
interface CustomerDetailsModalProps {
  customer: User | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ShippingAddress {
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  firstName: string;
  lastName: string;
}

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({ customer, isOpen, onClose }) => {
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Fetch shipping addresses from orders when modal opens
  useEffect(() => {
    if (isOpen && customer) {
      fetchShippingAddresses();
    }
  }, [isOpen, customer]);

  const fetchShippingAddresses = async () => {
    if (!customer) return;

    setLoadingAddresses(true);
    try {
      // Query orders for this customer
      const ordersQuery = query(collection(db, 'orders'), where('userId', '==', customer.id));
      const ordersSnapshot = await getDocs(ordersQuery);

      const addresses: ShippingAddress[] = [];
      const addressSet = new Set<string>(); // To track unique addresses

      ordersSnapshot.forEach((doc) => {
        const orderData = doc.data() as any;

        // Create a unique key for the address
        const addressKey = `${orderData.address || ''}_${orderData.city || ''}_${orderData.zipCode || ''}`.toLowerCase();

        // Only add if we haven't seen this address before
        if (!addressSet.has(addressKey) && (orderData.address || orderData.city)) {
          addressSet.add(addressKey);
          addresses.push({
            address: orderData.address || '',
            city: orderData.city || '',
            zipCode: orderData.zipCode || '',
            phone: orderData.phone || customer.phone || '',
            firstName: orderData.firstName || '',
            lastName: orderData.lastName || ''
          });
        }
      });

      setShippingAddresses(addresses);
    } catch (error) {
      console.error('Error fetching shipping addresses:', error);
      toast.error('Failed to load shipping addresses');
    } finally {
      setLoadingAddresses(false);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Customer Details</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Basic Info */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <UserIcon className="mr-2 h-5 w-5 text-blue-600" />
              Basic Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Customer ID</p>
                <p className="font-medium">{customer.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{customer.name || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{customer.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <div className="flex items-center">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${customer.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                    {customer.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contact Information */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Phone className="mr-2 h-5 w-5 text-blue-600" />
              Contact Information
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium">
                  {customer.phone || 'No phone number provided'}
                </p>
              </div>
              {customer.address && (
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">
                    {customer.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Addresses */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-blue-600" />
              Shipping Addresses
            </h3>
            {loadingAddresses ? (
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading addresses...</p>
              </div>
            ) : shippingAddresses.length > 0 ? (
              <div className="space-y-4">
                {shippingAddresses.map((address, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-800">
                        {address.firstName && address.lastName
                          ? `${address.firstName} ${address.lastName}`
                          : `Address ${index + 1}`}
                      </h4>
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Shipping</span>
                    </div>
                    <p className="text-gray-600 mt-2">
                      {address.address && <>{address.address}<br /></>}
                      {address.city && address.zipCode && (
                        <>{address.city}, {address.zipCode}</>
                      )}
                      {address.city && !address.zipCode && address.city}
                      {!address.city && address.zipCode && address.zipCode}
                    </p>
                    {address.phone && (
                      <p className="text-gray-600 mt-2">
                        <span className="font-medium">Phone:</span> {address.phone}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg text-gray-500 italic">
                No addresses on file
              </div>
            )}
          </div>

          {/* Account Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="mr-2 h-5 w-5 text-blue-600" />
              Account Details
            </h3>
            <div className="grid md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium capitalize">{customer.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Member Since</p>
                <p className="font-medium">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Customers() {
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const customersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setCustomers(customersData);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer &&
      ((customer.name && customer.name.toLowerCase().includes(search.toLowerCase())) ||
        (customer.email && customer.email.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Addresses
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-600">
                            {customer.name ? customer.name.charAt(0) : "?"}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {customer.name || <span className="italic text-gray-400">No Name</span>}
                          </div>
                          <div className="text-sm text-gray-500">
                            Member since {new Date().getFullYear()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500 mb-1">
                        <Mail className="h-4 w-4 mr-2" />
                        {customer.email || <span className="italic text-gray-400">No Email</span>}
                      </div>
                      {customer.phone && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="h-4 w-4 mr-2" />
                          {customer.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {customer.addresses && customer.addresses.length > 0 ? (
                        customer.addresses.map((address, index) => (
                          <div key={address.id || index} className="text-sm text-gray-500 mb-1">
                            {address.street ? `${address.street}, ` : ''}
                            {address.city ? `${address.city}, ` : ''}
                            {address.state ? `${address.state} ` : ''}
                            {address.postalCode || ''}
                          </div>
                        ))
                      ) : customer.address ? (
                        <span className="text-sm text-gray-500">{customer.address}</span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No addresses</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Render the modal */}
        <CustomerDetailsModal 
          customer={selectedCustomer}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </div>
  );
}