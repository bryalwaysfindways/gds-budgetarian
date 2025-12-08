// Checkout page with full validation and error display for all fields. 
// ✅ CHANGED: Payment is now Cash on Delivery (COD) ONLY.
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { db, storage } from "../lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useCartStore } from "../store/useCartStore";
import { createNewOrderNotification } from "../lib/notifications";

interface FormData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  paymentMethod: "cod";

  isDelivered: boolean;
  validIdUrl?: string;
}

import { useAuthStore } from "../store/useAuthStore";

const Checkout: React.FC = () => {
  const location = useLocation();
  const passedTotal = location.state?.total;
  const { user } = useAuthStore();
  const clearCart = useCartStore((state) => state.clearCart);
  const cartItems = useCartStore((state) => state.items);
  const navigate = useNavigate();

  // Calculate cart summary with the passed total from Cart page
  const subtotal = cartItems.reduce(
    (sum: any, item: any) => sum + item.price * item.quantity,
    0
  );

  const cartSummary = {
    subtotal,
    total: subtotal,
  };
  const [formData, setFormData] = useState<FormData>({
    userId: user?.id || "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
    paymentMethod: "cod",

    isDelivered: false,
    validIdUrl: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validIdFile, setValidIdFile] = useState<File | null>(null);
  const [uploadingId, setUploadingId] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, or GIF)");
      e.target.value = ""; // Reset input
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 5MB");
      e.target.value = ""; // Reset input
      return;
    }

    setValidIdFile(file);
    setUploadingId(true);

    try {
      console.log("Starting upload for user:", user?.id);
      console.log("File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // Upload to Firebase Storage
      const fileName = `${user?.id}-${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `valid-ids/${fileName}`);

      console.log("Uploading to storage path:", `valid-ids/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, file);
      console.log("Upload completed:", uploadResult);

      const downloadURL = await getDownloadURL(storageRef);
      console.log("Download URL obtained:", downloadURL);

      setFormData((prev) => ({ ...prev, validIdUrl: downloadURL }));
      setErrors((prev) => ({ ...prev, validId: "" })); // Clear any previous errors
      toast.success("Valid ID uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      console.error("Error code:", error?.code);
      console.error("Error message:", error?.message);

      let errorMessage = "Failed to upload ID. Please try again.";
      if (error?.code === "storage/unauthorized") {
        errorMessage = "Permission denied. Please contact support.";
      } else if (error?.message) {
        errorMessage = `Upload failed: ${error.message}`;
      }

      toast.error(errorMessage);
      setValidIdFile(null);
      setFormData((prev) => ({ ...prev, validIdUrl: "" }));
      e.target.value = ""; // Reset input so user can try again
    } finally {
      setUploadingId(false);
    }
  };

  // Simple validators
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^09\d{9}$/.test(phone);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!validateEmail(formData.email))
      newErrors.email = "Invalid email address";
    if (!formData.phone) newErrors.phone = "Phone number is required";
    else if (!validatePhone(formData.phone))
      newErrors.phone = "Invalid phone (must be 11 digits, start with 09)";
    if (!formData.address) newErrors.address = "Address is required";
    if (!formData.city) newErrors.city = "City is required";

    if (!formData.zipCode) newErrors.zipCode = "ZIP Code is required";

    if (!formData.validIdUrl) {
      newErrors.validId = "Valid ID is required for Cash on Delivery";
    }
    return newErrors;
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const foundErrors = validate();
    setErrors(foundErrors);
    if (Object.keys(foundErrors).length > 0) {
      toast.error("Please fix the errors in the form.");
      return;
    }
    setSubmitting(true);
    try {
      // Get product IDs from cart
      const cartItems = useCartStore.getState().items;
      let productIds: string[] = [];
      if (Array.isArray(cartItems) && cartItems.length > 0) {
        productIds = cartItems.map(
          (item: any) => item.productId || item.id || item._id || ""
        );
      }
      // Use the calculated cart summary values for consistency
      const { subtotal, total } = cartSummary;
      const orderData: any = {
        ...formData,
        userId: user?.id || "",
        isDelivered: false,
        productIds: productIds.length === 1 ? productIds[0] : productIds, // string if single, array if multiple
        items: cartItems,
        subtotal,
        total,
        status: "pending",
        createdAt: Timestamp.now(),
        statusHistory: [
          {
            status: "pending",
            timestamp: Timestamp.now(),
            updatedBy: "system",
          },
        ],
      };

      // Include validIdUrl only if COD is selected
      if (formData.validIdUrl) {
        orderData.validIdUrl = formData.validIdUrl;
      }

      const docRef = await addDoc(collection(db, "orders"), orderData);

      // Create notification for admin/staff
      await createNewOrderNotification(docRef.id, orderData);

      clearCart();
      toast.success("Order placed successfully!");
      navigate("/");
    } catch (err) {
      console.error("Error placing order:", err);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to format as Philippine Peso
  function formatPeso(amount: number) {
    return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  }

  // If user is not logged in, show alert and do not render the checkout form
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center max-w-lg mx-auto">
          <strong className="font-bold">Login Required: </strong>
          <span className="block sm:inline">
            You must be logged in to proceed to checkout.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  aria-invalid={!!errors.firstName}
                  aria-describedby={
                    errors.firstName ? "firstName-error" : undefined
                  }
                  className={`w-full border rounded-lg px-4 py-2 ${
                    errors.firstName ? "border-red-500" : ""
                  }`}
                />
                {errors.firstName && (
                  <p id="firstName-error" className="text-red-500 text-sm mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  aria-invalid={!!errors.lastName}
                  aria-describedby={
                    errors.lastName ? "lastName-error" : undefined
                  }
                  className={`w-full border rounded-lg px-4 py-2 ${
                    errors.lastName ? "border-red-500" : ""
                  }`}
                />
                {errors.lastName && (
                  <p id="lastName-error" className="text-red-500 text-sm mt-1">
                    {errors.lastName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={`w-full border rounded-lg px-4 py-2 ${
                    errors.email ? "border-red-500" : ""
                  }`}
                />
                {errors.email && (
                  <p id="email-error" className="text-red-500 text-sm mt-1">
                    {errors.email}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  className={`w-full border rounded-lg px-4 py-2 ${
                    errors.phone ? "border-red-500" : ""
                  }`}
                />
                {errors.phone && (
                  <p id="phone-error" className="text-red-500 text-sm mt-1">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  aria-invalid={!!errors.address}
                  aria-describedby={
                    errors.address ? "address-error" : undefined
                  }
                  className={`w-full border rounded-lg px-4 py-2 ${
                    errors.address ? "border-red-500" : ""
                  }`}
                />
                {errors.address && (
                  <p id="address-error" className="text-red-500 text-sm mt-1">
                    {errors.address}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    aria-invalid={!!errors.city}
                    aria-describedby={errors.city ? "city-error" : undefined}
                    className={`w-full border rounded-lg px-4 py-2 ${
                      errors.city ? "border-red-500" : ""
                    }`}
                  />
                  {errors.city && (
                    <p id="city-error" className="text-red-500 text-sm mt-1">
                      {errors.city}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    required
                    aria-invalid={!!errors.zipCode}
                    aria-describedby={
                      errors.zipCode ? "zipCode-error" : undefined
                    }
                    className={`w-full border rounded-lg px-4 py-2 ${
                      errors.zipCode ? "border-red-500" : ""
                    }`}
                  />
                  {errors.zipCode && (
                    <p id="zipCode-error" className="text-red-500 text-sm mt-1">
                      {errors.zipCode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">
                  Payment Method
                </label>

                {/* ✅ CHANGED: removed radio buttons so the small circle disappears */}
                {/* We just show a text badge saying the only method is COD */}
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold">
                    Cash on Delivery (COD)
                  </span>
                </div>
              </div>

              {/* ✅ KEEP: COD valid ID section – this still works because paymentMethod is always 'cod' */}
              {formData.paymentMethod === "cod" && (
                <div>
                  <label className="block text-gray-700 mb-2">
                    Upload Valid ID <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-600 mb-2">
                    Please upload a clear photo of your valid government-issued
                    ID (e.g., Driver's License, Passport, National ID)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className={`w-full border rounded-lg px-4 py-2 ${
                      errors.validId ? "border-red-500" : ""
                    }`}
                    disabled={uploadingId}
                  />
                  {uploadingId && (
                    <p className="text-blue-600 text-sm mt-2 flex items-center">
                      <svg
                        className="animate-spin h-4 w-4 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Uploading...
                    </p>
                  )}
                  {formData.validIdUrl && !uploadingId && (
                    <div className="mt-2">
                      <p className="text-green-600 text-sm flex items-center">
                        <svg
                          className="h-4 w-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                        ID uploaded successfully
                      </p>
                      <img
                        src={formData.validIdUrl}
                        alt="Valid ID"
                        className="mt-2 max-w-xs rounded-lg border"
                      />
                    </div>
                  )}
                  {errors.validId && (
                    <p id="validId-error" className="text-red-500 text-sm mt-1">
                      {errors.validId}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={
              submitting ||
              uploadingId ||
              (formData.paymentMethod === "cod" && !formData.validIdUrl)
            }
          >
            {submitting
              ? "Placing Order..."
              : uploadingId
              ? "Uploading ID..."
              : "Place Order"}
          </button>
        </form>
        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 h-fit">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2 text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPeso(cartSummary.subtotal)}</span>
            </div>

            <div className="border-t pt-2 mt-2 font-semibold text-black flex justify-between">
              <span>Total</span>
              <span>{formatPeso(cartSummary.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
