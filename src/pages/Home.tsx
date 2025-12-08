import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import toast from 'react-hot-toast';

const groceryCategories = [
  { name: 'Fresh', icon: '🌿' },
  { name: 'Dairy', icon: '🥛' },
  { name: 'Meat & Seafood', icon: '🥩' },
  { name: 'Bakery', icon: '🍞' },
  { name: 'Pantry Staples', icon: '🥫' },
  { name: 'Frozen Foods', icon: '❄️' },
  { name: 'Beverages', icon: '🧃' },
  { name: 'Snacks', icon: '🍪' },
  { name: 'Soup', icon: '🥘' },
  {name:'Souvenir', icon:'🎀'},
  {name:'Food', icon:'🍽️'},
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [bestSellingProducts, setBestSellingProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      
      setAllProducts(productsData);
      
      // Filter featured products
      const featured = productsData.filter(product => product.isFeatured === true);
      setFeaturedProducts(featured.length > 0 ? featured : productsData.slice(0, 4));
      
      // Get best sellers (products on sale or sort by recent)
      const bestSellers = productsData.filter(product => product.isSale === true);
      setBestSellingProducts(bestSellers.length > 0 ? bestSellers : productsData.slice(0, 4));
      
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white min-h-screen">
      {/* FoodPanda-Style Hero Banner */}
      <section className="bg-gradient-to-br from-red-500 via-red-600 to-red-700 relative overflow-hidden">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            
            {/* Left Content */}
            <div className="lg:w-1/2 text-white mb-8 lg:mb-0">
              <div className="flex items-center mb-6">
                <img 
                  src="/images/logo2.png" 
                  alt="GDS Logo" 
                  className="w-20 h-20 object-contain mr-4 bg-white rounded-full p-2"
                />
                <div>
                  <h1 className="text-4xl lg:text-5xl font-black">GDS</h1>
                  <p className="text-yellow-300 text-xl font-bold">BUDGETARIAN</p>
                </div>
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Delicious food delivered in <span className="text-yellow-300">30 minutes</span>
              </h2>
              
              <p className="text-red-100 text-lg mb-6">
                Fresh meals, snacks & more. Available 24/7 at budget-friendly prices.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Link
                  to="/products"
                  className="bg-yellow-400 hover:bg-yellow-500 text-red-800 px-8 py-4 rounded-xl font-bold text-lg transition-colors duration-300 shadow-lg hover:shadow-xl text-center"
                >
                  Order Now
                </Link>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
                  <div className="text-yellow-300 font-bold text-2xl">₱99</div>
                  <div className="text-white text-sm">Unlimited Rice</div>
                </div>
              </div>
              
              {/* Service Tags */}
              <div className="flex flex-wrap gap-2">
                {['🚚 Free Delivery', '⏰ Open for 24/7', '🍚 Unlimited Rice', '🔥 Hot & Fresh'].map((tag) => (
                  <span key={tag} className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Right Content - Floating Cards */}
            <div className="lg:w-1/2 relative">
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-white rounded-2xl p-4 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-3">
                    <span className="text-white text-xl">🍽️</span>
                  </div>
                  <h3 className="font-bold text-red-800 mb-1">Dine-In</h3>
                  <p className="text-gray-600 text-sm">Cozy atmosphere</p>
                </div>
                
                <div className="bg-white rounded-2xl p-4 shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-300 mt-8">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mb-3">
                    <span className="text-white text-xl">🚚</span>
                  </div>
                  <h3 className="font-bold text-red-800 mb-1">Online Delivery</h3>
                  <p className="text-gray-600 text-sm">Fast & reliable</p>
                </div>
                
                <div className="bg-white rounded-2xl p-4 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300 -mt-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-3">
                    <span className="text-white text-xl">🥡</span>
                  </div>
                  <h3 className="font-bold text-red-800 mb-1">Take-Out</h3>
                  <p className="text-gray-600 text-sm">Quick pickup</p>
                </div>
                
                <div className="bg-white rounded-2xl p-4 shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mb-3">
                    <span className="text-white text-xl">🛒</span>
                  </div>
                  <h3 className="font-bold text-red-800 mb-1">Packages</h3>
                  <p className="text-gray-600 text-sm">Fresh daily</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
      </section>

      {/* FoodPanda-Style Categories Section */}
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-800">List of categories</h2>
            <Link to="/products" className="text-red-600 font-medium hover:text-red-700 transition-colors">
              See all
            </Link>
          </div>
          
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-4">
            {groceryCategories.map((cat) => (
              <button
                key={cat.name}
                className="flex flex-col items-center p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group border border-gray-100 hover:border-red-200"
                onClick={() => navigate(`/products?category=${encodeURIComponent(cat.name)}`)}
              >
                <div className="w-14 h-14 bg-gradient-to-br from-red-50 to-yellow-50 rounded-xl flex items-center justify-center mb-2 group-hover:from-red-100 group-hover:to-yellow-100 transition-all duration-300">
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{cat.icon}</span>
                </div>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight group-hover:text-red-600 transition-colors">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FoodPanda-Style Featured Products */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Popular</h2>
            <Link to="/products" className="text-red-600 font-medium hover:text-red-700 transition-colors">
              See all
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-4 flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : featuredProducts.length > 0 ? featuredProducts.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group border border-gray-100 hover:border-red-200 cursor-pointer" 
                   onClick={() => navigate(`/products/${item.id}`)}>
                <div className="relative overflow-hidden">
                  <img src={item.images && item.images.length > 0 ? item.images[0] : '/placeholder.jpg'} 
                      alt={item.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3">
                    <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Popular
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ef4444" viewBox="0 0 16 16">
                      <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>
                    </svg>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 mb-2 group-hover:text-red-600 transition-colors line-clamp-2">{item.name}</h3>
                  <div className="flex items-center mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                        </svg>
                      ))}
                      <span className="text-gray-600 text-sm ml-2">4.8 (120+)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-red-600">₱{item.price?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <button 
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 shadow-sm hover:shadow-md" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/products/${item.id}`);
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex items-center mt-2 text-gray-500 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                    <span>25-35 min • Free delivery</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-4 text-center py-16 text-gray-400">No featured products found</div>
            )}
          </div>
        </div>
      </section>

     

      {/* FoodPanda-Style Today's Specials */}
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Today's specials</h2>
            <Link to="/products" className="text-red-600 font-medium hover:text-red-700 transition-colors">
              View all
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-4 flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : allProducts.length > 0 ? allProducts.slice(0, 8).map((item) => (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group border border-gray-100 hover:border-red-200 cursor-pointer"
                   onClick={() => navigate(`/products/${item.id}`)}>
                <div className="relative overflow-hidden">
                  <img src={item.images && item.images.length > 0 ? item.images[0] : '/placeholder.jpg'} 
                      alt={item.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3">
                    <span className="bg-yellow-400 text-red-800 px-2 py-1 rounded-full text-xs font-bold">
                      Special
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ef4444" viewBox="0 0 16 16">
                      <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>
                    </svg>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 mb-2 group-hover:text-red-600 transition-colors line-clamp-2">{item.name}</h3>
                  <div className="flex items-center mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                        </svg>
                      ))}
                      <span className="text-gray-600 text-sm ml-2">4.9 (85+)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-red-600">₱{item.price?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <button 
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 shadow-sm hover:shadow-md" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/products/${item.id}`);
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex items-center mt-2 text-gray-500 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                    <span>20-30 min • ₱99 unlimited rice</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-4 text-center py-16 text-gray-400">No products available at the moment</div>
            )}
          </div>
        </div>
      </section>

      {/* FoodPanda-Style Best Sellers */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Best sellers</h2>
              <p className="text-gray-600 text-sm">Most loved by customers</p>
            </div>
            <Link to="/products" className="text-red-600 font-medium hover:text-red-700 transition-colors">
              See all
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {loading ? (
              <div className="col-span-5 flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : bestSellingProducts.length > 0 ? bestSellingProducts.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group border border-gray-100 hover:border-red-200 cursor-pointer"
                onClick={() => navigate(`/products/${item.id}`)}
              >
                <div className="relative overflow-hidden">
                  <img 
                    src={item.images && item.images.length > 0 ? item.images[0] : '/placeholder.jpg'} 
                    alt={item.name} 
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      Best
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ef4444" viewBox="0 0 16 16">
                      <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>
                    </svg>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 mb-2 group-hover:text-red-600 transition-colors line-clamp-2">{item.name}</h3>
                  <div className="flex items-center mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                        </svg>
                      ))}
                      <span className="text-gray-600 text-sm ml-2">5.0 (200+)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-red-600">₱{item.price?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <button 
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 shadow-sm hover:shadow-md" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/products/${item.id}`);
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex items-center mt-2 text-gray-500 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                    <span>15-25 min • Most popular</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-5 text-center py-16 text-gray-400">No best selling products found</div>
            )}
          </div>
        </div>
      </section>

     

    </div>
  );
};

export default Home;
