import React, { useState, useRef, useEffect, Fragment } from "react";
import { useSelector, useDispatch } from "react-redux";
import AddCustomerModal from "../Models/AddCustomer"; // Import the new component

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
import { getWarehouses } from "../../redux/features/WareHouse/warehouseSlice"; // Add this import
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";

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
    bankID: "", // Track selected bank
    warehouseID: "",
    status: false
  });
  const [openModal, setOpenModal] = useState(false); // State to control modal visibility
  const [customers, setCustomers] = useState([]); // Assuming you have a state for customers
  const [errors, setErrors] = useState({}); // State to hold validation errors
  const selectedProduct = products.find(product => product._id === sale.productID) || {};

  const handleOpenModal = () => {
    setOpenModal(true); // Open the modal
  };

  const handleCloseModal = () => {
    setOpenModal(false); // Close the modal
  };
  const [open, setOpen] = useState(true);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const cancelButtonRef = useRef(null);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
 
  const API_URL = `${BACKEND_URL}api`;

  const banks = useSelector((state) => state.bank.banks);
  const warehouses = useSelector((state) => state.warehouse.warehouses);

  useEffect(() => {
    dispatch(getBanks());
    dispatch(getWarehouses());
  }, [dispatch]);

  // Handling Input Change for input fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Parse numbers only for numeric fields
    const numericFields = ["stockSold", "totalSaleAmount"];
    const parsedValue = numericFields.includes(name) ? parseInt(value, 10) || 0 : value;

    setSale((prevSale) => ({
      ...prevSale,
      [name]: parsedValue,
    }));

    const selectedProduct = products.find((product) => product._id === (name === "productID" ? value : sale.productID));

    // Validate stockSold
    if (name === "stockSold" && selectedProduct) {
      const maxStock = selectedProduct.quantity;
      if (parsedValue < 0 || parsedValue > maxStock) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          stockSold: `Stock Sold must be between 0 and ${maxStock}.`,
        }));
      } else {
        setErrors((prevErrors) => ({ ...prevErrors, stockSold: "" }));
      }
    }

    // Validate totalSaleAmount
    if (name === "totalSaleAmount" && parsedValue <= 0) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        totalSaleAmount: "Total Sale Amount must be greater than 0.",
      }));
    } else if (name === "totalSaleAmount") {
      setErrors((prevErrors) => ({ ...prevErrors, totalSaleAmount: "" }));
    }

    // Auto-fill saleDate when Cash or Credit is selected
    if (name === "paymentMethod" && (value === "cash" || value === "credit")) {
      setSale((prevSale) => ({
        ...prevSale,
        saleDate: new Date().toISOString().split("T")[0], // Get current date
      }));
    }
  };

  // Handle Image Change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // POST Data
  const addSale = () => {
    const formData = new FormData();
    const totalAmount = sale.totalSaleAmount * sale.stockSold;
    formData.append("productID", sale.productID);
    formData.append("customerID", sale.customerID);
    formData.append("stockSold", sale.stockSold);
    formData.append("saleDate", sale.saleDate);
    formData.append("totalSaleAmount", totalAmount);
    formData.append("paymentMethod", sale.paymentMethod);
    formData.append("warehouseID", sale.warehouseID);
    formData.append("status", sale.status);
    if (errors.stockSold || errors.totalSaleAmount) {
      toast.error("Please fix the validation errors before submitting.");
      return;
    }
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

    axios
      .post(`${API_URL}/sales/`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((response) => {
        toast.success(response.data.message);
        handlePageUpdate();
        addSaleModalSetting();
        setOpen(false);
      })
      .catch((error) => {
        console.error("Error:", error);
        toast.error(
          error.response?.data?.message || "Failed to add sale. Please try again."
        );
      });
  };

const refreshCustomers = (newCustomer) => {
  // Add the new customer to the list
  setCustomers((prevCustomers) => [...prevCustomers, newCustomer]);

  // Automatically select the newly created customer
  setSale((prevSale) => ({
    ...prevSale,
    customerID: newCustomer._id, // Set the new customer as selected
  }));
};


const handleAddNewCustomer = (newCustomer) => {
  // Assuming the newCustomer object has _id property
  setSale((prevSale) => ({
    ...prevSale,
    customerID: newCustomer._id, // Automatically select the newly added customer
  }));
  
  // Optionally, refresh the customer list if needed (if you're maintaining a customer list state)
  fetchCustomerData(); // Make sure this function fetches the latest customer list
};


  return (
    <Fragment>
      <ToastContainer />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
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
          <form>
            <Grid container spacing={2}>
              {/* Product Selection */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="productID-label">Product Name</InputLabel>
                  <Select
                    labelId="productID-label"
                    id="productID"
                    name="productID"
                    value={sale.productID}
                    onChange={handleInputChange}
                    label="Product Name"
                  >
                    <MenuItem value="">
                      <em>Select Product</em>
                    </MenuItem>
                    {products.map((product) => (
                      <MenuItem key={product._id} value={product._id}>
                        {product.name}
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
                  placeholder={`0 - ${selectedProduct ? selectedProduct.quantity : 0}`}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.stockSold} // Show error state for stockSold
                  helperText={errors.stockSold} // Show error message for stockSold
                />
              </Grid>

              {/* Store Selection */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="storeID-label">Customer Name</InputLabel>
                  <Select
                    labelId="storeID-label"
                    id="storeID"
                    name="customerID"
                    value={sale.customerID}
                    onChange={handleInputChange}
                    label="Customer"
                  >
                    <MenuItem value="addNew" onClick={handleOpenModal} style={{ backgroundColor: 'silver' }}>
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
              {/* Total Sale Amount */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Total Sale Amount"
                  type="number"
                  name="totalSaleAmount"
                  value={sale.totalSaleAmount}
                  onChange={handleInputChange}
                  placeholder="299"
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.totalSaleAmount} // Show error state for totalSaleAmount
                  helperText={errors.totalSaleAmount} // Show error message for totalSaleAmount
                />
              </Grid>
              {/* Payment Method Selection */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
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
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="online">Online</MenuItem>
                    <MenuItem value="cheque">Cheque</MenuItem>
                    <MenuItem value="credit">Credit</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {/* Bank Selection for Cash Payment */}
              {(sale.paymentMethod === "online" || sale.paymentMethod === "cheque") && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
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
              )}
              {/* Cheque Date */}
              {sale.paymentMethod === "cheque" && (
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
                  />
                </Grid>
              )}
              {/* Image Upload */}
              {(sale.paymentMethod === "cheque" || sale.paymentMethod === "online") && (
                <Grid item xs={12}>
                  <TextField
                    type="file"
                    label="Upload Image"
                    name="image"
                    onChange={handleImageChange}
                    fullWidth
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
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
              )}
              {/* Warehouse Selection */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
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
                  disabled={sale.paymentMethod === "cash" || sale.paymentMethod === "credit"} // Disable when cash or credit
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" onClick={addSale}>
            Add Sale
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              addSaleModalSetting();
              setOpen(false);
            }}
            ref={cancelButtonRef}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
<AddCustomerModal
  open={openModal}
  handleClose={handleCloseModal}
  refreshCustomers={refreshCustomers} // Ensure this is passed
  handleAddNewCustomer={handleAddNewCustomer}  // Add this line
/>

    </Fragment>
  );
}
