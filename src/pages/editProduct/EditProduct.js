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
    if (productEdit) {
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
      setSelectedBank(productEdit.bank || "");
      setSelectedWarehouse(productEdit.warehouse || "");
      setShippingType(productEdit.shippingType || "");
      setSelectedSupplier(productEdit.supplier || "");
    }
  }, [productEdit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProduct({ ...product, [name]: value });
  };

  const handleImageChange = (e) => {
    setProductImage(e.target.files[0]);
    setImagePreview(URL.createObjectURL(e.target.files[0]));
  };

  const handleBankChange = (event) => setSelectedBank(event.target.value);
  const handleWarehouseChange = (event) => setSelectedWarehouse(event.target.value);
  const handleShippingTypeChange = (event) => {
    setShippingType(event.target.value);
    if (event.target.value === "international") {
      setSelectedWarehouse("");
    }
  };

  const handleSupplierChange = (event) => setSelectedSupplier(event.target.value);
  const handlePaymentMethodChange = (event) => {
    setPaymentMethod(event.target.value);
    if (event.target.value === "cash") {
      setChequeDate("");
      setSelectedBank("");
    }
  };

  const saveProduct = async () => {
    // Console log each field to see what's populated and what’s not
    console.log("Product Name:", product.name);
    console.log("Product Category:", product.category);
    console.log("Product Quantity:", product.quantity);
    console.log("Product Price:", product.price);
    console.log("Shipping Type:", shippingType);
    console.log("Selected Warehouse:", selectedWarehouse);
    console.log("Payment Method:", paymentMethod);
    console.log("Cheque Date:", chequeDate);
    console.log("Selected Bank:", selectedBank);
    console.log("Selected Supplier:", selectedSupplier);

    // Validate fields based on conditions
    if (!product.name) {
      toast.error("Please enter a product name");
      return;
    }
    if (!product.category) {
      toast.error("Please enter a product category");
      return;
    }
    if (!product.quantity) {
      toast.error("Please enter a product quantity");
      return;
    }
    if (!product.price) {
      toast.error("Please enter a product price");
      return;
    }
    if (!shippingType) {
      toast.error("Please select a shipping type");
      return;
    }
    if (shippingType === "local" && !selectedWarehouse) {
      toast.error("Please select a warehouse for local shipping");
      return;
    }
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }
    if (paymentMethod === "cheque" && !chequeDate) {
      toast.error("Please enter a cheque date");
      return;
    }
    if (paymentMethod === "online" && !selectedBank) {
      toast.error("Please select a bank for online payment");
      return;
    }
    if (!selectedSupplier) {
      toast.error("Please select a supplier");
      return;
    }

    const formData = new FormData();
    formData.append("name", product.name);
    formData.append("category", product.category);
    formData.append("quantity", product.quantity);
    formData.append("price", product.price);
    formData.append("shippingType", shippingType); // Add shipping type
    formData.append("supplier", selectedSupplier); // Add supplier
    formData.append("warehouse", selectedWarehouse);
    formData.append("paymentMethod", paymentMethod);
    formData.append("chequeDate", chequeDate);
    formData.append("bank", selectedBank);
    if (productImage) {
      formData.append("image", productImage);
    }
    formData.append("status", false);

    await dispatch(updateProduct({ id, formData }));
    await dispatch(getProducts());
    navigate("/dashboard");
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
// fine