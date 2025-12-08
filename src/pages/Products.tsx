import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useProducts, ProductsProvider } from '../ProductsContext';

interface Product {
  id?: string;
  name?: string;
  price?: number;
  category?: string;
  image?: string;
  images?: string[];
  description?: string;
  rating?: number;
  reviews?: number;
}

// import Firestore
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
// DUMMY_PRODUCTS removed

import { useLocation } from 'react-router-dom';

const Products: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const location = useLocation();

  // On mount, check for category in query params
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [location.search]);
  const { setSelectedProduct } = useProducts();
  const [sortBy, setSortBy] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const { user } = useAuthStore();

  const categories = ['All', 'Fresh', 'Dairy', 'Meat & Seafood', 'Bakery', 'Pantry Staples', 'Frozen Foods', 'Beverages', 'Snacks', 'Soup', 'Souvenir', 'Food'];

  // Caching logic
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      // Check cache
      const cached = localStorage.getItem('products-cache');
      const cacheTime = localStorage.getItem('products-cache-time');
      const now = Date.now();
      if (cached && cacheTime && now - parseInt(cacheTime) < 5 * 60 * 1000) {
        setFetchedProducts(JSON.parse(cached));
        setLoading(false);
        return;
      }
      // Fetch from Firestore
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const products: Product[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name ?? '',
            price: typeof data.price === 'number' ? data.price : Number(data.price ?? 0),
            category: data.category ?? '',
            image: data.image ?? '',
            images: Array.isArray(data.images) ? data.images : undefined,
            description: data.description ?? '',
            rating: typeof data.rating === 'number' ? data.rating : Number(data.rating ?? 0),
            reviews: typeof data.reviews === 'number' ? data.reviews : Number(data.reviews ?? 0),
          };
        });
        console.log('Fetched products:', products);
        setFetchedProducts(products);
        setErrorMsg('');
        localStorage.setItem('products-cache', JSON.stringify(products));
        localStorage.setItem('products-cache-time', now.toString());
      } catch (error) {
        console.error('Error fetching products from Firestore:', error);
        setFetchedProducts([]);
        setErrorMsg('Failed to fetch products from the database. Please check your internet connection or try again later.');
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filteredProducts = fetchedProducts.filter(product =>
    (selectedCategory === '' ||
      selectedCategory === 'All' ||
      (typeof product.category === 'string' && product.category === selectedCategory)) &&
    (typeof product.name === 'string' &&
      product.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') {
      const priceA = typeof a.price === 'number' ? a.price : 0;
      const priceB = typeof b.price === 'number' ? b.price : 0;
      return priceA - priceB;
    }
    if (sortBy === 'price-desc') {
      const priceA = typeof a.price === 'number' ? a.price : 0;
      const priceB = typeof b.price === 'number' ? b.price : 0;
      return priceB - priceA;
    }
    if (sortBy === 'rating') {
      const ratingA = typeof a.rating === 'number' ? a.rating : 0;
      const ratingB = typeof b.rating === 'number' ? b.rating : 0;
      return ratingB - ratingA;
    }
    return 0;
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedCategory, sortBy, searchQuery]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[40vh]">Loading products...</div>;
  }

  return (
    <>


      <div className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">Our Products</h1>
            <p className="text-gray-600">Discover our exclusive products</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <i className="fas fa-search absolute right-3 top-2.5 text-gray-400" />
            </div>
            <select
              className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="">Sort by</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Rating: High to Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedProducts.map(product => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="group"
              onClick={() => setSelectedProduct(product)}
            >
              <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="relative h-64">
                  <img
                    src={product.images && product.images.length > 0 ? product.images[0] : product.image || '/images/placeholder.jpg'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {user && (
                    <button className="absolute top-3 right-3 bg-white text-gray-600 p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors">
                      <i className="fas fa-heart" />
                    </button>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{product.name}</h3>
                    <div className="flex items-center">
                      <i className="fas fa-star text-yellow-400" />
                      <span className="ml-1 text-sm text-gray-600">{product.rating}</span>
                      <span className="ml-1 text-sm text-gray-400">({product.reviews})</span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {typeof product.price === 'number' && !isNaN(product.price)
                      ? `₱${product.price.toFixed(2)}`
                      : 'No price'}
                  </p>
                  <p className="text-gray-500 text-sm mb-4">{product.description}</p>
                  {user && user.role === 'admin' ? (
  <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
    Add Additional Quantity
  </button>
) : (
  <button className="w-full bg-yellow-500 text-white py-2 rounded-lg hover:bg-red-700 transition-colors">
    Add to Cart
  </button>
)}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {errorMsg && (
          <div className="text-center py-8">
            <p className="text-red-600 text-lg font-semibold">{errorMsg}</p>
          </div>
        )}
        {sortedProducts.length === 0 && !errorMsg && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

const ProductsPageWithProvider = () => (
  <ProductsProvider>
    <Products />
  </ProductsProvider>
);

export default ProductsPageWithProvider;