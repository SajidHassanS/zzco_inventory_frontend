import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Loader from "../../components/loader/Loader";
import ProductForm from "../../components/product/productForm/ProductForm";
import {
  getProduct,
  getProducts,
  selectIsLoading,
  selectProduct,
  updateProduct,
} from "../../redux/features/product/productSlice";
import { getWarehouses } from "../../redux/features/WareHouse/warehouseSlice";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { getSuppliers } from "../../redux/features/supplier/supplierSlice";
import { toast } from "react-toastify";

const EditProduct = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isLoading = useSelector(selectIsLoading);
  const productEdit = useSelector(selectProduct);

  const [product, setProduct] = useState({
    name: "",
    category: "",
    quantity: "",
    price: "",
  });
  const [productImage, setProductImage] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [shippingType, setShippingType] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");

  const banks = useSelector((state) => state.bank.banks);
  const warehouses = useSelector((state) => state.warehouse.warehouses);
  const suppliers = useSelector((state) => state.supplier.suppliers);

  useEffect(() => {
    dispatch(getProduct(id));
    dispatch(getBanks());
    dispatch(getWarehouses());
    dispatch(getSuppliers());
  }, [dispatch, id]);

  useEffect(() => {
    if (!productEdit) return;

    const asId = (v) => (v && typeof v === "object" ? v._id : v || "");

    setProduct({
      name: productEdit.name || "",
      category: productEdit.category || "",
      quantity: productEdit.quantity || "",
      price: productEdit.price || "",
    });

    setImagePreview(productEdit.image ? `${productEdit.image.filePath}` : null);
    setDescription(productEdit.description || "");
    setPaymentMethod(productEdit.paymentMethod || "");
    setChequeDate(productEdit.chequeDate || "");

    // force IDs to strings
    setSelectedBank(asId(productEdit.bank));
    setSelectedWarehouse(asId(productEdit.warehouse));
    setShippingType(productEdit.shippingType || "");
    setSelectedSupplier(asId(productEdit.supplier));
  }, [productEdit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProduct((p) => ({ ...p, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // 🟢 ensure select states are strings
  const handleBankChange = (e) => setSelectedBank(String(e.target.value || ""));
  const handleWarehouseChange = (e) =>
    setSelectedWarehouse(String(e.target.value || ""));
  const handleSupplierChange = (e) =>
    setSelectedSupplier(String(e.target.value || ""));

  const handleShippingTypeChange = (e) => {
    const val = String(e.target.value || "");
    setShippingType(val);
    if (val === "international") setSelectedWarehouse("");
  };

  const handlePaymentMethodChange = (e) => {
    const val = String(e.target.value || "");
    setPaymentMethod(val);
    if (val === "cash") {
      setChequeDate("");
      setSelectedBank("");
    }
  };

  const saveProduct = async () => {
    // validations
    if (!product.name) return toast.error("Please enter a product name");
    if (!product.category) return toast.error("Please enter a product category");
    if (!product.quantity) return toast.error("Please enter a product quantity");
    if (!product.price) return toast.error("Please enter a product price");
    if (!shippingType) return toast.error("Please select a shipping type");
    if (shippingType === "local" && !selectedWarehouse)
      return toast.error("Please select a warehouse for local shipping");
    if (!paymentMethod) return toast.error("Please select a payment method");
    if (paymentMethod === "cheque" && !chequeDate)
      return toast.error("Please enter a cheque date");
    if (paymentMethod === "online" && !selectedBank)
      return toast.error("Please select a bank for online payment");
    if (!selectedSupplier) return toast.error("Please select a supplier");

    const formData = new FormData();
    formData.append("name", product.name);
    formData.append("category", product.category);
    formData.append("quantity", product.quantity);
    formData.append("price", product.price);
    formData.append("shippingType", shippingType);
    formData.append("supplier", String(selectedSupplier)); // string id

    if (shippingType === "local" && selectedWarehouse) {
      formData.append("warehouse", String(selectedWarehouse)); // string id
    }

    formData.append("paymentMethod", paymentMethod);
    if (chequeDate) formData.append("chequeDate", chequeDate);
    if (selectedBank) formData.append("bank", String(selectedBank)); // string id
    if (productImage) formData.append("image", productImage);
    formData.append("status", "false");

    console.log("FormData being sent:", [...formData.entries()]);

    try {
      await dispatch(updateProduct({ id, formData })).unwrap(); // throws on reject
      await dispatch(getProducts());
      navigate("/dashboard");
    } catch (err) {
      console.error("Update failed:", err);
      // toast handled by slice; stay on page
    }
  };

  return (
    <div>
      {isLoading && <Loader />}
      <h3 className="--mt">Edit Product</h3>
      <ProductForm
        product={product}
        productImage={productImage}
        imagePreview={imagePreview}
        description={description}
        paymentMethod={paymentMethod}
        setDescription={setDescription}
        handleInputChange={handleInputChange}
        handleImageChange={handleImageChange}
        handlePaymentMethodChange={handlePaymentMethodChange}
        saveProduct={saveProduct}
        banks={banks}
        selectedBank={selectedBank}
        handleBankChange={handleBankChange}
        chequeDate={chequeDate}
        setChequeDate={setChequeDate}
        warehouses={warehouses}
        selectedWarehouse={selectedWarehouse}
        handleWarehouseChange={handleWarehouseChange}
        shippingType={shippingType}
        handleShippingTypeChange={handleShippingTypeChange}
        suppliers={suppliers}
        selectedSupplier={selectedSupplier}
        handleSupplierChange={handleSupplierChange}
      />
    </div>
  );
};

export default EditProduct;
