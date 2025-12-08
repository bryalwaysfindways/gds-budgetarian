import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product } from '../../types';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadImage, deleteImage, validateImageFile } from '../../lib/imageUpload';

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

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    setFetchingProduct(true);
    try {
      const docRef = doc(db, 'products', id!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProduct({ id, ...docSnap.data() } as Product);
      } else {
        toast.error('Product not found');
        navigate('/admin/products');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to fetch product');
      navigate('/admin/products');
    } finally {
      setFetchingProduct(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate all files first
    const validationErrors: string[] = [];
    const validFiles: File[] = [];

    Array.from(files).forEach((file) => {
      const validation = validateImageFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        validationErrors.push(`${file.name}: ${validation.error}`);
      }
    });

    // Show validation errors
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join('\n'));
    }

    // Upload valid files
    if (validFiles.length > 0) {
      setUploading(true);
      setUploadProgress(0);

      try {
        const uploadPromises = validFiles.map((file) =>
          uploadImage(file, 'products', (progress) => {
            setUploadProgress(progress);
          })
        );

        const urls = await Promise.all(uploadPromises);

        setProduct((prev) => ({
          ...prev,
          images: [...(prev.images || []), ...urls],
        }));

        toast.success(`${urls.length} image(s) uploaded successfully`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload images');
      } finally {
        setUploading(false);
        setUploadProgress(0);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleRemoveImage = async (index: number, imageUrl: string) => {
    // Remove from product images array
    setProduct((prev) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index),
    }));

    // Delete from Firebase Storage (only if it's a Firebase Storage URL)
    if (imageUrl.includes('firebasestorage.googleapis.com')) {
      try {
        await deleteImage(imageUrl);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
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
        updatedAt: new Date(),
      };

      if (id) {
        // Editing existing product - preserve createdAt
        const docRef = doc(db, 'products', id);
        await setDoc(docRef, {
          ...productData,
          // Keep original createdAt from fetched product
          createdAt: product.createdAt || new Date(),
        });
        toast.success('Product updated successfully');
      } else {
        // Creating new product - set createdAt
        const productsRef = collection(db, 'products');
        const newDocRef = doc(productsRef);
        await setDoc(newDocRef, {
          ...productData,
          createdAt: new Date(),
        });
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

  // Show loading spinner while fetching product data in edit mode
  if (fetchingProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading product data...</p>
        </div>
      </div>
    );
  }

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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Images
            </label>

            {/* Image Preview Grid */}
            {product.images && product.images.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-4">
                {product.images.map((url, index) => (
                  <div
                    key={index}
                    className="relative w-32 h-32 border-2 border-yellow-200 rounded-lg overflow-hidden group hover:border-red-400 transition-all duration-200"
                  >
                    <img
                      src={url}
                      alt={`Product ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index, url)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <p className="text-white text-xs text-center">Image {index + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* File Upload Area */}
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed border-yellow-300 rounded-lg p-6 text-center hover:border-red-400 transition-all duration-200 bg-yellow-50/30 ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
                disabled={uploading}
              />
              <div className="flex flex-col items-center space-y-3">
                {uploading ? (
                  <>
                    <Upload className="h-12 w-12 text-red-400 animate-bounce" />
                    <div className="w-full max-w-xs">
                      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-500 to-yellow-400 h-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Uploading... {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-12 w-12 text-red-400" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700">
                        Click to upload images or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF or WebP (max 5MB per image)
                      </p>
                    </div>
                    <div
                      className="mt-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                    >
                      Select Images
                    </div>
                  </>
                )}
              </div>
            </div>
            {errors.images && <p className="text-red-500 text-xs mt-2">{errors.images}</p>}
            {product.images && product.images.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {product.images.length} image(s) added
              </p>
            )}
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