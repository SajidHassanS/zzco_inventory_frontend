// ✅ Updated: Added isOwnInventory toggle for optional supplier/payment
import React, { Fragment, useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Loader from "../../components/loader/Loader";
import { getProducts } from "../../redux/features/product/productSlice";
import { getCash } from "../../redux/features/cash/cashSlice";

import ProductForm from "../../components/product/productForm/ProductForm";
import {
  createProduct,
  selectIsLoading
} from "../../redux/features/product/productSlice";
import Modal from "@mui/material/Modal";
import Supplier from "../Supplier/Supplier";
import { getWarehouses } from "../../redux/features/WareHouse/warehouseSlice";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { getSuppliers } from "../../redux/features/supplier/supplierSlice";
import { toast, ToastContainer } from "react-toastify";
import {
  Grid,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  FormControlLabel,
  Switch,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import AddSupplierModal from "../../components/Models/addSupplierModel";
import AddWareHouseModal from "../../components/Models/AddWareHouse";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const API_URL = `${BACKEND_URL}api/suppliers`;

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(3, 0),
  backgroundColor: theme.palette.background.default
}));

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3)
}));

const steps = ["Product Details", "Shipping & Payment", "Review"];

const initialState = {
  name: "",
  category: "",
  quantity: "",
  price: "",
  description: "",
  status: false
};

const AddProduct = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const products = useSelector(state => state.product.products);
  const [showStepper, setShowStepper] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    dispatch(getProducts());
  }, [dispatch]);

  const handleAddProductClick = () => {
    setOpenModal(true);
    setActiveStep(0);
  };

  const [product, setProduct] = useState(initialState);
  const [productImage, setProductImage] = useState("");
  const [paymentProofImage, setPaymentProofImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [paymentImagePreview, setPaymentImagePreview] = useState(null);
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [shippingType, setShippingType] = useState("local");
  const [supplier, setSupplier] = useState({ id: "", name: "" });
  const [activeStep, setActiveStep] = useState(0);
  
  // ✅ NEW: Track if this is own inventory (no supplier/payment)
  const [isOwnInventory, setIsOwnInventory] = useState(false);
  
  const [openSupplierModal, setOpenSupplierModal] = useState(false);
  const [openWareHouseModal, setOpenWareHosueModal] = useState(false);
  const handleOpenModal = () => setOpenSupplierModal(true);
  const handleCloseModal = () => setOpenSupplierModal(false);
  const handleOpenModalwarehouse = () => setOpenWareHosueModal(true);
  const handleCloseModalwarehouse = () => setOpenWareHosueModal(false);
  const isLoading = useSelector(selectIsLoading);
  const banks = useSelector(state => state.bank.banks);
  const warehouses = useSelector(state => state.warehouse.warehouses);
  const suppliers = useSelector(state => state.supplier.suppliers);
  const [openImageModal, setOpenImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const inflightRef = useRef(false);

  useEffect(() => {
    dispatch(getBanks());
    dispatch(getWarehouses());
    dispatch(getSuppliers());
  }, [dispatch]);

  const handleOpenSupplierModal = () => setOpenSupplierModal(true);
  const handleCloseSupplierModal = () => setOpenSupplierModal(false);

  const handleProductImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePaymentImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymentProofImage(file);
      setPaymentImagePreview(URL.createObjectURL(file));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "price" || name === "quantity") {
      const num = value === "" ? "" : Number(value);
      setProduct((p) => ({ ...p, [name]: num }));
    } else {
      setProduct((p) => ({ ...p, [name]: value }));
    }
  };

  const handleImageClick = imageUrl => {
    setSelectedImage(imageUrl);
    setOpenImageModal(true);
  };

  const handleSupplierChange = event => {
    const selectedSupplier = suppliers.find(s => s._id === event.target.value);
    if (selectedSupplier) {
      setSupplier({ id: selectedSupplier._id, name: selectedSupplier.username });
    }
  };

  const handleImageChange = e => {
    const file = e.target.files[0];
    if (file) {
      setProductImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleNext = () => {
    if (submitting) return;
    setActiveStep(prevActiveStep => prevActiveStep + 1);
  };

  const handleBack = () => {
    if (submitting) return;
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  };

  // ✅ UPDATED: Only record supplier transaction if NOT own inventory
  const recordSupplierTransaction = async () => {
    if (!supplier.id || !product.price || !product.quantity) {
      toast.error("Supplier, price, or quantity missing.");
      return;
    }

    const price = Number(product.price) || 0;
    const qty = Number(product.quantity) || 0;
    const transactionAmount = price * qty;
    if (transactionAmount <= 0) {
      toast.error("Invalid price/quantity");
      return;
    }

    const transactionData = new FormData();
    transactionData.append("name", product.name);
    transactionData.append("amount", transactionAmount);
    transactionData.append("paymentMethod", paymentMethod);
    transactionData.append("type", "debit");
    transactionData.append("description", `Purchased ${product.quantity} x ${product.name}`);

    if (paymentMethod === "cheque") {
      transactionData.append("chequeDate", chequeDate);
    }

    if ((paymentMethod === "online" || paymentMethod === "cheque") && selectedBank) {
      transactionData.append("bankId", selectedBank);
    }

    if (paymentProofImage && (paymentMethod === "cheque" || paymentMethod === "online")) {
      transactionData.append("image", paymentProofImage);
    }

    try {
      const res = await axios.post(
        `${API_URL}/${supplier.id}/transaction`,
        transactionData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true
        }
      );

      if (res.status === 201) {
        toast.success("Supplier transaction recorded.");
        const quantity = product?.quantity || 0;
        const name = product?.name || "Unknown Product";
        const supplierName = supplier?.name || supplier?.username || "Unknown Supplier";

        if (paymentMethod === "cash") {
          await axios.post(`${BACKEND_URL}api/cash/add`, {
            balance: transactionAmount,
            type: "deduct",
            description: `Cash payment for ${quantity} x ${name} to ${supplierName}`
          }, {
            withCredentials: true
          });

          toast.success("Cash deducted successfully.");
          await dispatch(getCash()).unwrap();
        } else if (paymentMethod === "online") {
          await axios.post(`${BACKEND_URL}api/banks/${selectedBank}/transaction`, {
            amount: transactionAmount,
            type: "subtract",
            description: `Online payment for ${product.quantity} x ${product.name} to ${supplier.name}`
          }, {
            withCredentials: true
          });

          toast.success("Bank balance updated (online).");
          await dispatch(getBanks()).unwrap();
        } else if (paymentMethod === "cheque") {
          toast.info("Cheque will be deducted when cashed out.");
        }
      }
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error(error.response?.data?.message || "Transaction failed.");
    }
  };

  const saveProduct = async () => {
    const formData = new FormData();
    Object.keys(product).forEach(key => formData.append(key, product[key]));
    formData.append("shippingType", shippingType);

    if (shippingType === "local") {
      if (selectedWarehouse && selectedWarehouse !== "addNew") {
        formData.append("warehouse", selectedWarehouse);
      } else {
        toast.error("Please select a valid warehouse or create one.");
        return;
      }
    }

    // ✅ Only append supplier and payment fields if NOT own inventory
    if (!isOwnInventory) {
      formData.append("paymentMethod", paymentMethod);
      formData.append("chequeDate", chequeDate);
      formData.append("bank", selectedBank);
      formData.append("supplier", supplier.id);
    }

    if (productImage) {
      formData.append("image", productImage);
    }

    const res = await dispatch(createProduct(formData));
    if (res.payload && !res.error) {
      toast.success(isOwnInventory ? "Own inventory added successfully" : "Product added successfully");
      return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (submitting || inflightRef.current) return;

    const qty = Number(product.quantity) || 0;
    const price = Number(product.price) || 0;
    if (qty <= 0 || price <= 0) {
      toast.error("Quantity and Price must be greater than 0.");
      return;
    }

    // ✅ Validate supplier/payment only if NOT own inventory
    if (!isOwnInventory) {
      if (!supplier.id) {
        toast.error("Please select a supplier for purchases.");
        return;
      }
      if (!paymentMethod) {
        toast.error("Please select a payment method for purchases.");
        return;
      }
    }

    try {
      setSubmitting(true);
      inflightRef.current = true;

      const ok = await saveProduct();
      if (!ok) return;

      // ✅ Only record supplier transaction if NOT own inventory
      if (!isOwnInventory) {
        await recordSupplierTransaction();
      }

      await Promise.all([
        dispatch(getProducts()).unwrap(),
        dispatch(getBanks()).unwrap(),
        dispatch(getCash()).unwrap(),
      ]);

      setOpenModal(false);
      navigate("/dashboard");
    } catch (err) {
      console.error("Submit failed:", err);
      toast.error(err?.response?.data?.message || "Submit failed");
    } finally {
      setSubmitting(false);
      inflightRef.current = false;
    }
  };

  const getStepContent = step => {
    switch (step) {
      case 0:
        return (
          <StyledCard>
            <CardContent>
              <Grid container spacing={3}>
                {/* ✅ NEW: Toggle for Own Inventory */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isOwnInventory}
                        onChange={(e) => setIsOwnInventory(e.target.checked)}
                        disabled={submitting}
                      />
                    }
                    label="This is my own inventory (no supplier/payment needed)"
                  />
                  {isOwnInventory && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      You're adding your own inventory. Supplier and payment details won't be required, and no financial transactions will be recorded.
                    </Alert>
                  )}
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Product Name"
                    name="name"
                    value={product.name}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Category"
                    name="category"
                    value={product.category}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    name="quantity"
                    type="number"
                    value={product.quantity}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Price"
                    name="price"
                    type="number"
                    value={product.price}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    name="description"
                    type="string"
                    label="Description"
                    value={product.description}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                </Grid>

                <Grid item xs={12}>
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="product-image-file"
                    type="file"
                    onChange={handleProductImageChange}
                    disabled={submitting}
                  />
                  <label htmlFor="product-image-file">
                    <Button variant="contained" component="span" disabled={submitting}>
                      Upload Product Image
                    </Button>
                  </label>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ marginTop: 10, maxWidth: "100%", maxHeight: 200 }}
                    />
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </StyledCard>
        );
      case 1:
        return (
          <StyledCard>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={submitting}>
                    <InputLabel>Shipping Type</InputLabel>
                    <Select
                      value={shippingType}
                      onChange={e => setShippingType(e.target.value)}
                      label="Shipping Type"
                    >
                      <MenuItem value="local">Local</MenuItem>
                      <MenuItem value="international">International</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {shippingType === "local" && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={submitting}>
                      <InputLabel>Warehouse</InputLabel>
                      <Select
                        value={selectedWarehouse}
                        onChange={e => setSelectedWarehouse(e.target.value)}
                        label="Warehouse"
                      >
                        {warehouses.map(warehouse => (
                          <MenuItem key={warehouse._id} value={warehouse._id}>
                            {warehouse.name}
                          </MenuItem>
                        ))}
                        <MenuItem
                          value="addNew"
                          onClick={handleOpenModalwarehouse}
                          style={{ backgroundColor: "silver" }}
                        >
                          Add New WareHouse
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {/* ✅ UPDATED: Show payment/supplier fields only if NOT own inventory */}
                {!isOwnInventory && (
                  <>
                
<Grid item xs={12} sm={6}>
  <FormControl fullWidth disabled={submitting}>
    <InputLabel>Payment Method</InputLabel>
    <Select
      value={paymentMethod}
      onChange={e => setPaymentMethod(e.target.value)}
      label="Payment Method"
    >
      {/* <MenuItem value="cash">Cash</MenuItem>
      <MenuItem value="cheque">Cheque</MenuItem>
      <MenuItem value="online">Online</MenuItem> */}
      <MenuItem value="credit">Credit</MenuItem>
    </Select>
  </FormControl>
</Grid>

{/* {paymentMethod === "cheque" && (
  <Grid item xs={12} sm={6}>
    <TextField
      fullWidth
      label="Cheque Date"
      type="date"
      value={chequeDate}
      onChange={e => setChequeDate(e.target.value)}
      InputLabelProps={{ shrink: true }}
      disabled={submitting}
    />
  </Grid>
)} */}

{/* {(paymentMethod === "cheque" || paymentMethod === "online") && (
  <Grid item xs={12}>
    <input
      accept="image/*"
      style={{ display: "none" }}
      id="payment-image-file"
      type="file"
      onChange={handlePaymentImageChange}
      disabled={submitting}
    />
    <label htmlFor="payment-image-file">
      <Button variant="contained" component="span" disabled={submitting}>
        Upload {paymentMethod === "cheque" ? "Cheque" : "Payment"} Image
      </Button>
    </label>
    {paymentImagePreview && (
      <img
        src={paymentImagePreview}
        alt="Preview"
        style={{ marginTop: 10, maxWidth: "100%", maxHeight: 200 }}
      />
    )}
  </Grid>
)} */}

{/* {(paymentMethod === "online" || paymentMethod === "cheque") && (
  <Grid item xs={12} sm={6}>
    <FormControl fullWidth disabled={submitting}>
      <InputLabel>Bank</InputLabel>
      <Select
        value={selectedBank}
        onChange={e => setSelectedBank(e.target.value)}
        label="Bank"
      >
        {banks.map(bank => (
          <MenuItem key={bank._id} value={bank._id}>
            {bank.bankName}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Grid>
)} */}

                    <Grid item xs={12} sm={6} display="flex" flexDirection="row" justifyContent="space-between">
                      <FormControl fullWidth disabled={submitting}>
                        <InputLabel>Supplier</InputLabel>
                        <Select
                          value={supplier.id}
                          onChange={handleSupplierChange}
                          label="Supplier"
                        >
                          {suppliers.map(s => (
                            <MenuItem key={s._id} value={s._id}>
                              {s.username}
                            </MenuItem>
                          ))}
                          <MenuItem
                            value="addNew"
                            onClick={handleOpenModal}
                            style={{ backgroundColor: "silver" }}
                          >
                            Add New Supplier
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </StyledCard>
        );
      case 2:
        return (
          <StyledCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Review your product details
              </Typography>
              <Typography>Name: {product.name}</Typography>
              <Typography>Category: {product.category}</Typography>
              <Typography>Price: ${product.price}</Typography>
              <Typography>Description: {product.description}</Typography>
              <Typography>Quantity: {product.quantity}</Typography>
              <Typography>Shipping Type: {shippingType}</Typography>
              {!isOwnInventory && (
                <>
                  <Typography>Payment Method: {paymentMethod}</Typography>
                  <Typography>Supplier: {supplier.name}</Typography>
                </>
              )}
              {isOwnInventory && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This is your own inventory - no supplier or payment will be recorded.
                </Alert>
              )}
            </CardContent>
          </StyledCard>
        );
      default:
        return "Unknown step";
    }
  };

  return (
    <Container maxWidth="md">
      <StyledPaper elevation={3}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddProductClick}
        >
          Add Product
        </Button>
        <Typography variant="h4" gutterBottom align="center">
          Existing Products
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Created Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map(product => (
              <TableRow key={product._id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{product.price}</TableCell>
                <TableCell>{product.description}</TableCell>
                <TableCell>{product.quantity}</TableCell>
                <TableCell>
                  {new Date(product.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledPaper>

      <Modal
        open={openModal}
        onClose={submitting ? undefined : () => setOpenModal(false)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StyledPaper
          elevation={2}
          sx={{
            width: "80%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            opacity: submitting ? 0.9 : 1,
          }}
        >
          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box mt={4}>{getStepContent(activeStep)}</Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              p: 2,
              borderTop: "1px solid #ddd",
              backgroundColor: "white",
              gap: 1
            }}
          >
            <Button disabled={activeStep === 0 || submitting} onClick={handleBack} sx={{ mr: 1 }}>
              Back
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
              disabled={submitting}
              startIcon={submitting && activeStep === steps.length - 1 ? <CircularProgress size={18} /> : null}
            >
              {activeStep === steps.length - 1 ? "Submit" : "Next"}
            </Button>
            <Button onClick={() => setOpenModal(false)} sx={{ ml: 1 }} disabled={submitting}>
              Close
            </Button>
          </Box>
        </StyledPaper>
      </Modal>

      {isLoading && <Loader />}
      <AddSupplierModal
        open={openSupplierModal}
        handleClose={handleCloseModal}
        onSuccess={newSupplier => {
          dispatch(getSuppliers());
          setSupplier({ id: newSupplier._id, name: newSupplier.username });
        }}
      />

      <AddWareHouseModal
        open={openWareHouseModal}
        onClose={handleCloseModalwarehouse}
        onSuccess={newWarehouse => {
          dispatch(getWarehouses());
          setSelectedWarehouse(newWarehouse._id);
        }}
      />

      <ToastContainer />
    </Container>
  );
};

export default AddProduct;
