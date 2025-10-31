import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product } from '../../types';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

const groceryCategories = [
  { name: 'Fresh Produce', icon: '🥬' },
  { name: 'Dairy & Eggs', icon: '🥛' },
  { name: 'Meat & Seafood', icon: '🥩' },
  { name: 'Bakery', icon: '🍞' },
  { name: 'Pantry Staples', icon: '🥫' },
  { name: 'Frozen Foods', icon: '❄️' },
  { name: 'Beverages', icon: '🧃' },
  { name: 'Snacks', icon: '🍪' },
  { name: 'Household', icon: '🧹' },
  {name:'personal care', icon:'🧴'},
  {name:'food', icon:'🍽️'},
];

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [product, setProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    tags: [],
    images: [],
    isSale: false,
    isFeatured: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const docRef = doc(db, 'products', id!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProduct({ id, ...docSnap.data() } as Product);
      }
    } catch (error) {
      toast.error('Failed to fetch product');
      navigate('/admin/products');
    }
  };

  const handleAddImage = () => {
    if (imageUrl.trim()) {
      setProduct((prev) => ({
        ...prev,
        images: [...(prev.images || []), imageUrl.trim()],
      }));
      setImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setProduct((prev) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!product.name || product.name.trim().length < 2) newErrors.name = 'Name is required (min 2 characters)';
    if (!product.description || product.description.trim().length < 10) newErrors.description = 'Description is required (min 10 characters)';
    if (product.price === undefined || product.price === null || isNaN(Number(product.price)) || Number(product.price) <= 0) newErrors.price = 'Price must be greater than 0';
    if (!product.category) newErrors.category = 'Category is required';
    if (!Array.isArray(product.images) || product.images.length === 0) newErrors.images = 'At least one image is required';
    if (product.tags && Array.isArray(product.tags) && product.tags.some(tag => tag.length < 2)) newErrors.tags = 'All tags must be at least 2 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const productData = {
        ...product,
        price: Number(product.price),
        isSale: !!product.isSale,
        isFeatured: !!product.isFeatured,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (id) {
        const docRef = doc(db, 'products', id);
        await setDoc(docRef, productData);
        toast.success('Product updated successfully');
      } else {
        const productsRef = collection(db, 'products');
        const newDocRef = doc(productsRef);
        await setDoc(newDocRef, productData);
        toast.success('Product created successfully');
      }

      navigate('/admin/products');
    } catch (error) {
      console.error('Error creating/updating product:', error);
      toast.error(id ? 'Failed to update product' : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-red-50">
      <div className="container-fluid px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {id ? 'Edit Product' : 'Add New Product'}
            </h1>
            <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-yellow-400 rounded-full"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-yellow-200 overflow-hidden">
          <div className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={product.name}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 ${errors.name ? 'border-red-500' : 'border-yellow-300 hover:border-yellow-400'}`}
              required
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={product.description}
              onChange={(e) =>
                setProduct({ ...product, description: e.target.value })
              }
              rows={4}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 ${errors.description ? 'border-red-500' : 'border-yellow-300 hover:border-yellow-400'}`}
              required
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <input
              type="number"
              value={product.price}
              onChange={(e) =>
                setProduct({ ...product, price: Number(e.target.value) })
              }
              min="0"
              step="0.01"
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 ${errors.price ? 'border-red-500' : 'border-yellow-300 hover:border-yellow-400'}`}
              required
            />
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
  value={product.category}
  onChange={(e) => setProduct({ ...product, category: e.target.value })}
  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 ${errors.category ? 'border-red-500' : 'border-yellow-300 hover:border-yellow-400'}`}
  required
>
  <option value="">Select Category</option>
  {groceryCategories.map((cat) => (
    <option key={cat.name} value={cat.name}>
      {cat.icon} {cat.name}
    </option>
  ))}
</select>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={!!product.isSale}
                onChange={e => setProduct({ ...product, isSale: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Is Sale</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={!!product.isFeatured}
                onChange={e => setProduct({ ...product, isFeatured: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Is Featured</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={product.tags?.join(', ')}
              onChange={(e) =>
                setProduct({
                  ...product,
                  tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
                })
              }
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 ${errors.tags ? 'border-red-500' : 'border-yellow-300 hover:border-yellow-400'}`}
            />
            {errors.tags && <p className="text-red-500 text-xs mt-1">{errors.tags}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images
            </label>
            <div className="flex flex-wrap gap-4 mb-4">
              {product.images?.map((url, index) => (
                <div
                  key={index}
                  className="relative w-24 h-24 border rounded-lg overflow-hidden"
                >
                  <img
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Enter image URL"
                className="flex-1 p-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 hover:border-yellow-400"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Add Image
              </button>
            </div>
            {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="px-6 py-3 border-2 border-yellow-400 text-yellow-600 rounded-lg hover:bg-yellow-50 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
            >
              {loading ? 'Saving...' : id ? 'Update Product' : 'Create Product'}
            </button>
          </div>
          </div>
        </form>
      </div>
    </div>
  );
}