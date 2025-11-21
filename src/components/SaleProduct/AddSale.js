// src/components/SaleProduct/AddSale.jsx
import React, { useState, useRef, useEffect, Fragment } from "react";
import { useSelector, useDispatch } from "react-redux";
import AddCustomerModal from "../Models/AddCustomer";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Grid,
  Box,
} from "@mui/material";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { getWarehouses } from "../../redux/features/WareHouse/warehouseSlice";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
const supplierNameOf = (p) =>
  p?.supplier?.username || p?.supplier?.name || "Unknown supplier";

const shippingLabelOf = (p) =>
  String(p?.shippingType || "").toLowerCase() === "local"
    ? "Local"
    : "International";

const formatPrice = (n) => {
  const num = Number(n) || 0;
  return new Intl.NumberFormat("en-PK").format(num); // Rs formatting
};

export default function AddSale({
  addSaleModalSetting,
  products,
  customer,
  fetchCustomerData,
  handlePageUpdate,
}) {
  const dispatch = useDispatch();

  const [sale, setSale] = useState({
    productID: "",
    customerID: "",
    stockSold: "",
    saleDate: "",
    totalSaleAmount: "",
    paymentMethod: "",
    chequeDate: "",
    bankID: "",
    warehouseID: "",
    status: false,
  });

  const [openModal, setOpenModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [open, setOpen] = useState(true);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const cancelButtonRef = useRef(null);

  // NEW: submit lock
  const [submitting, setSubmitting] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api`;

  const banks = useSelector((state) => state.bank.banks);
  const warehouses = useSelector((state) => state.warehouse.warehouses);

  useEffect(() => {
    dispatch(getBanks());
    dispatch(getWarehouses());
  }, [dispatch]);

  const selectedProduct =
    products.find((p) => p._id === sale.productID) || null;

  // ---------- Input handlers ----------
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Make numeric fields stay "" when empty, otherwise be numbers
    const numericFields = ["stockSold", "totalSaleAmount"];
    const parsedValue = numericFields.includes(name)
      ? value === "" // keep empty
        ? ""
        : Number(value)
      : value;

    setSale((prevSale) => ({
      ...prevSale,
      [name]: parsedValue,
    }));

    const selectedProd =
      products.find((product) => product._id === (name === "productID" ? value : sale.productID)) ||
      null;

    // Validate stockSold against available quantity
    if (name === "stockSold" && selectedProd) {
      const maxStock = Number(selectedProd.quantity ?? 0);
      if (parsedValue === "" || parsedValue <= 0 || parsedValue > maxStock) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          stockSold: `Stock Sold must be between 1 and ${maxStock}.`,
        }));
      } else {
        setErrors((prevErrors) => ({ ...prevErrors, stockSold: "" }));
      }
    }

    // Validate totalSaleAmount
    if (name === "totalSaleAmount") {
      if (parsedValue === "" || Number(parsedValue) <= 0) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          totalSaleAmount: "Total Sale Amount must be greater than 0.",
        }));
      } else {
        setErrors((prevErrors) => ({ ...prevErrors, totalSaleAmount: "" }));
      }
    }

    // Auto-fill saleDate when Cash or Credit is selected
    if (name === "paymentMethod" && (value === "cash" || value === "credit")) {
      setSale((prevSale) => ({
        ...prevSale,
        saleDate: new Date().toISOString().split("T")[0],
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // ---------- Validation ----------
  const validateRequired = () => {
    const errs = {};

    if (!sale.productID) errs.productID = "Select a product";
    if (!sale.customerID) errs.customerID = "Select a customer";

    if (sale.stockSold === "" || Number(sale.stockSold) <= 0) {
      errs.stockSold = "Enter quantity > 0";
    } else if (selectedProduct && Number(sale.stockSold) > Number(selectedProduct.quantity ?? 0)) {
      errs.stockSold = `Cannot exceed available stock (${selectedProduct.quantity}).`;
    }

    if (sale.totalSaleAmount === "" || Number(sale.totalSaleAmount) <= 0) {
      errs.totalSaleAmount = "Enter amount > 0";
    }

    if (!sale.paymentMethod) errs.paymentMethod = "Select payment method";

    // saleDate: required for online/cheque; for cash/credit we auto-set, but keep a fallback below
    if ((sale.paymentMethod === "online" || sale.paymentMethod === "cheque") && !sale.saleDate) {
      errs.saleDate = "Select sale date";
    }

    if ((sale.paymentMethod === "online" || sale.paymentMethod === "cheque") && !sale.bankID) {
      errs.bankID = "Select bank";
    }

    if (sale.paymentMethod === "cheque" && !sale.chequeDate) {
      errs.chequeDate = "Select cheque date";
    }

    if (!sale.warehouseID) errs.warehouseID = "Select warehouse";

    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  // ---------- Submit ----------
  const addSale = async () => {
    // simple guard against double clicks
    if (submitting) return;

    if (!validateRequired()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      // totalSaleAmount in your table is currently TOTAL (unitPrice * qty)
      const totalAmount = Number(sale.totalSaleAmount) * Number(sale.stockSold);

      // Ensure saleDate exists (fallback for cash/credit)
      const saleDate = sale.saleDate || new Date().toISOString().split("T")[0];

      formData.append("productID", sale.productID);
      formData.append("customerID", sale.customerID);
      formData.append("stockSold", String(sale.stockSold));
      formData.append("saleDate", saleDate);
      formData.append("totalSaleAmount", String(totalAmount));
      formData.append("paymentMethod", sale.paymentMethod);
      formData.append("warehouseID", sale.warehouseID);
      formData.append("status", String(sale.status));

      if (sale.paymentMethod === "cheque") {
        formData.append("chequeDate", sale.chequeDate);
        formData.append("bankID", sale.bankID);
      }
      if (sale.paymentMethod === "online") {
        formData.append("bankID", sale.bankID);
      }
      if (image) {
        formData.append("image", image);
      }

      const response = await axios.post(`${API_URL}/sales/`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(response.data?.message || "Sale added!");
      handlePageUpdate?.();
      addSaleModalSetting?.();
      setOpen(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to add sale. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Customer modal helpers ----------
  const normalizeCustomer = (payload) => {
    // Accept direct object, {data}, or {customer}
    return payload?.data ?? payload?.customer ?? payload ?? null;
  };

  const refreshCustomers = (maybeCustomer) => {
    const newCustomer = normalizeCustomer(maybeCustomer);
    if (!newCustomer || !newCustomer._id) return;

    setSale((prev) => ({ ...prev, customerID: newCustomer._id }));
    // refresh the list so it appears in the select options
    fetchCustomerData?.();
  };

  const handleAddNewCustomer = (maybeCustomer) => {
    const newCustomer = normalizeCustomer(maybeCustomer);
    if (!newCustomer || !newCustomer._id) {
      toast.error("Couldn't get the new customer from the modal.");
      return;
    }
    setSale((prev) => ({ ...prev, customerID: newCustomer._id }));
    fetchCustomerData?.();
    setOpenModal(false);
  };

  return (
    <Fragment>
      <ToastContainer />

      <Dialog
        open={open}
        onClose={() => (!submitting ? setOpen(false) : null)}
        fullWidth
        maxWidth="sm"
        ref={cancelButtonRef}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Box ml={1}>Add Sale</Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* prevent Enter key from submitting twice */}
          <form onSubmit={(e) => e.preventDefault()}>
            <Grid container spacing={2}>
              {/* Product Selection */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal" error={!!errors.productID} disabled={submitting}>
                  <InputLabel id="productID-label">Product Name</InputLabel>
                 <Select
  labelId="productID-label"
  id="productID"
  name="productID"
  value={sale.productID}
  onChange={handleInputChange}
  label="Product Name"
  // 👇 ensure the closed select shows the full label, not just name
  renderValue={(selectedId) => {
    if (!selectedId) return "";
    const p = products.find((x) => x._id === selectedId);
    if (!p) return "";
    return `${p.name} — ${supplierNameOf(p)} — ${shippingLabelOf(p)} — ${formatPrice(p.price)}`;
  }}
>
  <MenuItem value="">
    <em>Select Product</em>
  </MenuItem>

  {products.map((p) => (
    <MenuItem key={p._id} value={p._id}>
      {`${p.name} — ${supplierNameOf(p)} — ${shippingLabelOf(p)} — ${formatPrice(p.price)}`}
    </MenuItem>
  ))}
</Select>

                </FormControl>
              </Grid>

              {/* Stock Sold */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Stock Sold"
                  type="number"
                  name="stockSold"
                  value={sale.stockSold}
                  onChange={handleInputChange}
                  placeholder={`1 - ${selectedProduct ? selectedProduct.quantity : 0}`}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.stockSold}
                  helperText={errors.stockSold}
                  disabled={submitting}
                />
              </Grid>

              {/* Customer Selection */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal" error={!!errors.customerID} disabled={submitting}>
                  <InputLabel id="storeID-label">Customer Name</InputLabel>
                  <Select
                    labelId="storeID-label"
                    id="storeID"
                    name="customerID"
                    value={sale.customerID}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "addNew") {
                        setOpenModal(true);
                        return;
                      }
                      handleInputChange(e);
                    }}
                    label="Customer"
                  >
                    <MenuItem value="addNew" style={{ backgroundColor: "silver" }}>
                      Add New Customer
                    </MenuItem>
                    {customer.map((store) => (
                      <MenuItem key={store._id} value={store._id}>
                        {store.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Total Sale Amount (unit price) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Unit Price (Rs)"
                  type="number"
                  name="totalSaleAmount"
                  value={sale.totalSaleAmount}
                  onChange={handleInputChange}
                  placeholder="e.g., 299"
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.totalSaleAmount}
                  helperText={errors.totalSaleAmount}
                  disabled={submitting}
                />
              </Grid>

         
<Grid item xs={12} sm={6}>
  <FormControl fullWidth margin="normal" error={!!errors.paymentMethod} disabled={submitting}>
    <InputLabel id="paymentMethod-label">Payment Method</InputLabel>
    <Select
      labelId="paymentMethod-label"
      id="paymentMethod"
      name="paymentMethod"
      value={sale.paymentMethod}
      onChange={handleInputChange}
      label="Payment Method"
    >
      <MenuItem value="">
        <em>Select Payment Method</em>
      </MenuItem>
      {/* <MenuItem value="cash">Cash</MenuItem>
      <MenuItem value="online">Online</MenuItem>
      <MenuItem value="cheque">Cheque</MenuItem> */}
      <MenuItem value="credit">Credit</MenuItem>
    </Select>
  </FormControl>
</Grid>

{/* Bank (for online/cheque) */}
{/* {(sale.paymentMethod === "online" || sale.paymentMethod === "cheque") && (
  <Grid item xs={12} sm={6}>
    <FormControl fullWidth margin="normal" error={!!errors.bankID} disabled={submitting}>
      <InputLabel id="bankID-label">Bank Name</InputLabel>
      <Select
        labelId="bankID-label"
        id="bankID"
        name="bankID"
        value={sale.bankID}
        onChange={handleInputChange}
        label="Bank Name"
      >
        <MenuItem value="">
          <em>Select Bank</em>
        </MenuItem>
        {banks.map((bank) => (
          <MenuItem key={bank._id} value={bank._id}>
            {bank.bankName}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Grid>
)} */}

{/* Cheque Date (for cheque) */}
{/* {sale.paymentMethod === "cheque" && (
  <Grid item xs={12} sm={6}>
    <TextField
      fullWidth
      label="Cheque Date"
      type="date"
      name="chequeDate"
      value={sale.chequeDate}
      onChange={handleInputChange}
      InputLabelProps={{ shrink: true }}
      margin="normal"
      error={!!errors.chequeDate}
      helperText={errors.chequeDate}
      disabled={submitting}
    />
  </Grid>
)} */}

{/* Image Upload (for online/cheque) */}
{/* {(sale.paymentMethod === "cheque" || sale.paymentMethod === "online") && (
  <Grid item xs={12}>
    <TextField
      type="file"
      label="Upload Image"
      name="image"
      onChange={handleImageChange}
      fullWidth
      margin="normal"
      InputLabelProps={{ shrink: true }}
      disabled={submitting}
    />
    {imagePreview && (
      <img
        src={imagePreview}
        alt="Preview"
        style={{
          width: "100%",
          maxHeight: "300px",
          marginTop: "16px",
          objectFit: "cover",
        }}
      />
    )}
  </Grid>
)} */}

              {/* Warehouse */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal" error={!!errors.warehouseID} disabled={submitting}>
                  <InputLabel id="warehouseID-label">Warehouse</InputLabel>
                  <Select
                    labelId="warehouseID-label"
                    id="warehouseID"
                    name="warehouseID"
                    value={sale.warehouseID}
                    onChange={handleInputChange}
                    label="Warehouse"
                  >
                    <MenuItem value="">
                      <em>Select Warehouse</em>
                    </MenuItem>
                    {warehouses.map((warehouse) => (
                      <MenuItem key={warehouse._id} value={warehouse._id}>
                        {warehouse.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Sales Date */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Sales Date"
                  type="date"
                  id="saleDate"
                  name="saleDate"
                  value={sale.saleDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  margin="normal"
                  disabled={submitting || sale.paymentMethod === "cash" || sale.paymentMethod === "credit"}
                  error={!!errors.saleDate}
                  helperText={errors.saleDate}
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>

        <DialogActions>
          <Button variant="contained" color="primary" onClick={addSale} disabled={submitting}>
            {submitting ? "Adding…" : "Add Sale"}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              if (!submitting) {
                addSaleModalSetting?.();
                setOpen(false);
              }
            }}
            ref={cancelButtonRef}
            disabled={submitting}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <AddCustomerModal
        open={openModal}
        handleClose={() => setOpenModal(false)}
        refreshCustomers={refreshCustomers}
        handleAddNewCustomer={handleAddNewCustomer}
      />
    </Fragment>
  );
}
