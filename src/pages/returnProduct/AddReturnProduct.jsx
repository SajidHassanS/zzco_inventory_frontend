import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Alert,
  Divider,
  CircularProgress,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Paper,
  Chip
} from "@mui/material";
import {
  Undo as ReturnIcon,
  Store as SupplierIcon,
  Person as CustomerIcon,
  Inventory as ProductIcon,
  ArrowBack as BackIcon
} from "@mui/icons-material";
import {
  getAvailableProducts,
  getCustomersWithSales,
  getCustomerSales,
  createReturnToSupplier,
  createReturnFromCustomer,
  RESET_RETURN_STATE,
  CLEAR_CUSTOMER_SALES
} from "../../redux/features/return/returnProductSlice";
import { getBanks } from "../../redux/features/Bank/bankSlice"; // ✅ FIXED PATH

// Return reasons
const SUPPLIER_RETURN_REASONS = [
  "Defective Product",
  "Wrong Item Received",
  "Expired Product",
  "Quality Issue",
  "Overstock Return",
  "Damaged in Transit",
  "Other"
];

const CUSTOMER_RETURN_REASONS = [
  "Customer Return",
  "Changed Mind",
  "Wrong Size/Model",
  "Defective Product",
  "Not as Described",
  "Damaged in Transit",
  "Quality Issue",
  "Other"
];

const AddReturnProduct = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const { availableProducts, customersWithSales, customerSales, isLoading, isSuccess, isError, message } = useSelector(
    (state) => state.returnProduct
  );
  const { banks } = useSelector((state) => state.bank);

  // Tab state (0 = To Supplier, 1 = From Customer)
  const [tabValue, setTabValue] = useState(0);

  // Common form state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [description, setDescription] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);

  // Supplier return specific
  const [selectedSupplier, setSelectedSupplier] = useState("");

  // Customer return specific
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [refundPaymentMethod, setRefundPaymentMethod] = useState("cash");
  const [selectedBank, setSelectedBank] = useState("");
  const [processRefundNow, setProcessRefundNow] = useState(true);

  // Calculated values
  const [availableStock, setAvailableStock] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [refundAmount, setRefundAmount] = useState(0);

  // ✅ FIXED: Reset form with useCallback
  const resetForm = useCallback(() => {
    setSelectedProduct(null);
    setSelectedWarehouse("");
    setReturnQuantity("");
    setReturnReason("");
    setDescription("");
    setReturnDate(new Date().toISOString().split("T")[0]);
    setSelectedSupplier("");
    setSelectedCustomer(null);
    setSelectedSale(null);
    setRefundPaymentMethod("cash");
    setSelectedBank("");
    setProcessRefundNow(true);
    setAvailableStock(0);
    setUnitCost(0);
    setRefundAmount(0);
    dispatch(CLEAR_CUSTOMER_SALES());
  }, [dispatch]);

  // Load initial data
  useEffect(() => {
    dispatch(getAvailableProducts());
    dispatch(getCustomersWithSales());
    dispatch(getBanks());

    return () => {
      dispatch(RESET_RETURN_STATE());
    };
  }, [dispatch]);

  // Load customer sales when customer selected
  useEffect(() => {
    if (selectedCustomer) {
      dispatch(getCustomerSales(selectedCustomer._id));
    } else {
      dispatch(CLEAR_CUSTOMER_SALES());
    }
  }, [selectedCustomer, dispatch]);

  // Reset form on success
  useEffect(() => {
    if (isSuccess) {
      resetForm();
      dispatch(RESET_RETURN_STATE());
    }
  }, [isSuccess, dispatch, resetForm]); // ✅ FIXED: Added resetForm to dependencies

  // Update warehouse options when product selected (Supplier return)
  useEffect(() => {
    if (selectedProduct && tabValue === 0) {
      // Auto-select supplier
      if (selectedProduct.supplierId) {
        setSelectedSupplier(selectedProduct.supplierId);
      }
      // Reset warehouse
      setSelectedWarehouse("");
      setAvailableStock(0);
      setUnitCost(selectedProduct.unitCost || 0);
    }
  }, [selectedProduct, tabValue]);

  // Update stock when warehouse selected
  useEffect(() => {
    if (selectedProduct && selectedWarehouse) {
      const warehouse = selectedProduct.warehouses?.find(
        (w) => String(w.warehouseId) === String(selectedWarehouse)
      );
      setAvailableStock(warehouse?.quantity || 0);
    }
  }, [selectedProduct, selectedWarehouse]);

// Update from selected sale (Customer return) 
useEffect(() => {
  if (selectedSale && tabValue === 1) {
    // ✅ Calculate actual sale price from the sale record
    const actualSalePrice = selectedSale.stockSold > 0 
      ? selectedSale.totalSaleAmount / selectedSale.stockSold 
      : selectedSale.product?.unitPrice || 0;
    
    setUnitCost(actualSalePrice);
    setSelectedWarehouse(selectedSale.warehouseId || "");
    setAvailableStock(selectedSale.stockSold || 0);
  }
}, [selectedSale, tabValue]);

  // Calculate refund amount
  useEffect(() => {
    const qty = parseInt(returnQuantity) || 0;
    setRefundAmount(qty * unitCost);
  }, [returnQuantity, unitCost]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    resetForm();
  };

  // Handle submit for Supplier Return
  const handleSupplierReturnSubmit = (e) => {
    e.preventDefault();

    if (!selectedProduct || !selectedWarehouse || !returnQuantity || !description || !returnReason) {
      return;
    }

    const qty = parseInt(returnQuantity);
    if (qty <= 0 || qty > availableStock) {
      return;
    }

    const returnData = {
      productId: selectedProduct._id,
      warehouseId: selectedWarehouse,
      supplierId: selectedSupplier || selectedProduct.supplierId,
      returnQuantity: qty,
      description,
      returnReason,
      returnDate,
      refundAmount
    };

    dispatch(createReturnToSupplier(returnData));
  };

  // Handle submit for Customer Return
  const handleCustomerReturnSubmit = (e) => {
    e.preventDefault();

    if (!selectedCustomer || !selectedSale || !returnQuantity || !description || !returnReason) {
      return;
    }

    const qty = parseInt(returnQuantity);
    if (qty <= 0 || qty > availableStock) {
      return;
    }

    if (refundPaymentMethod === "online" && !selectedBank) {
      return;
    }

    const returnData = {
      productId: selectedSale.product._id,
      warehouseId: selectedWarehouse || selectedSale.warehouseId,
      customerId: selectedCustomer._id,
      saleId: selectedSale._id,
      returnQuantity: qty,
      description,
      returnReason,
      returnDate,
      refundAmount,
      refundPaymentMethod,
      refundBankId: refundPaymentMethod === "online" ? selectedBank : null,
      processRefundNow: refundPaymentMethod !== "credit" ? processRefundNow : false
    };

    dispatch(createReturnFromCustomer(returnData));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => navigate("/return-products")}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ReturnIcon fontSize="large" />
          Add Return
        </Typography>
      </Box>

      {/* Error Alert */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            icon={<SupplierIcon />}
            label="Return TO Supplier"
            iconPosition="start"
            sx={{ py: 2 }}
          />
          <Tab
            icon={<CustomerIcon />}
            label="Return FROM Customer"
            iconPosition="start"
            sx={{ py: 2 }}
          />
        </Tabs>
      </Paper>

      {/* Tab 0: Return TO Supplier */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="primary" gutterBottom>
                Return Product TO Supplier
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Stock will DECREASE • Supplier owes you refund • Your cash/bank INCREASES when refund received
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <form onSubmit={handleSupplierReturnSubmit}>
              <Grid container spacing={3}>
                {/* Product Selection */}
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={availableProducts || []}
                    getOptionLabel={(option) => `${option.name} (Stock: ${option.totalQuantity})`}
                    value={selectedProduct}
                    onChange={(e, value) => setSelectedProduct(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Product"
                        required
                        placeholder="Search product..."
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option._id}>
                        <Box>
                          <Typography variant="body1">{option.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Stock: {option.totalQuantity} | Price: Rs {option.unitCost}
                          </Typography>
                        </Box>
                      </li>
                    )}
                  />
                </Grid>

                {/* Warehouse Selection */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Select Warehouse</InputLabel>
                    <Select
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value)}
                      label="Select Warehouse"
                      disabled={!selectedProduct}
                    >
                      {selectedProduct?.warehouses?.map((wh) => (
                        <MenuItem key={wh.warehouseId} value={wh.warehouseId}>
                          {wh.warehouseName} (Stock: {wh.quantity})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Supplier (Auto-selected) */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Supplier"
                    value={selectedProduct?.supplierName || "N/A"}
                    disabled
                    InputProps={{
                      startAdornment: <SupplierIcon sx={{ mr: 1, color: "text.secondary" }} />
                    }}
                  />
                </Grid>

                {/* Return Quantity */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Return Quantity"
                    type="number"
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(e.target.value)}
                    required
                    inputProps={{ min: 1, max: availableStock }}
                    helperText={`Available: ${availableStock}`}
                    error={parseInt(returnQuantity) > availableStock}
                  />
                </Grid>

                {/* Return Reason */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Return Reason</InputLabel>
                    <Select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      label="Return Reason"
                    >
                      {SUPPLIER_RETURN_REASONS.map((reason) => (
                        <MenuItem key={reason} value={reason}>
                          {reason}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Return Date */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Return Date"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Description */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    placeholder="Describe the reason for return..."
                  />
                </Grid>

                {/* Summary */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: "grey.100" }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Unit Cost
                        </Typography>
                        <Typography variant="h6">Rs {unitCost.toLocaleString()}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Quantity
                        </Typography>
                        <Typography variant="h6">{returnQuantity || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Expected Refund
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          Rs {refundAmount.toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Chip
                          label="Stock will DECREASE"
                          color="warning"
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Submit Button */}
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    disabled={isLoading || !selectedProduct || !selectedWarehouse || !returnQuantity}
                    startIcon={isLoading ? <CircularProgress size={20} /> : <ReturnIcon />}
                  >
                    {isLoading ? "Processing..." : "Create Return to Supplier"}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 1: Return FROM Customer */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="secondary" gutterBottom>
                Return Product FROM Customer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Stock will INCREASE • You owe customer refund • Your cash/bank DECREASES when refund paid
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <form onSubmit={handleCustomerReturnSubmit}>
              <Grid container spacing={3}>
                {/* Customer Selection */}
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={customersWithSales || []}
                    getOptionLabel={(option) => `${option.username} (${option.phone || "No phone"})`}
                    value={selectedCustomer}
                    onChange={(e, value) => {
                      setSelectedCustomer(value);
                      setSelectedSale(null);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Customer"
                        required
                        placeholder="Search customer..."
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option._id}>
                        <Box>
                          <Typography variant="body1">{option.username}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Sales: {option.totalSales} | Total: Rs {option.totalAmount?.toLocaleString()}
                          </Typography>
                        </Box>
                      </li>
                    )}
                  />
                </Grid>

                {/* Sale Selection */}
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={customerSales || []}
                    getOptionLabel={(option) =>
                      `${option.product?.name || "Unknown"} - ${option.stockSold} pcs - Rs ${option.totalSaleAmount?.toLocaleString()}`
                    }
                    value={selectedSale}
                    onChange={(e, value) => setSelectedSale(value)}
                    disabled={!selectedCustomer}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Sale (Purchase)"
                        required
                        placeholder="Select which sale to return..."
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option._id}>
                        <Box>
                          <Typography variant="body1">
                            {option.product?.name || "Unknown Product"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Qty: {option.stockSold} | Amount: Rs {option.totalSaleAmount?.toLocaleString()} |{" "}
                            {new Date(option.saleDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </li>
                    )}
                  />
                </Grid>

                {/* Product Info (Auto-filled) */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Product"
                    value={selectedSale?.product?.name || ""}
                    disabled
                    InputProps={{
                      startAdornment: <ProductIcon sx={{ mr: 1, color: "text.secondary" }} />
                    }}
                  />
                </Grid>

                {/* Warehouse */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Warehouse"
                    value={selectedSale?.warehouseName || ""}
                    disabled
                  />
                </Grid>

                {/* Return Quantity */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Return Quantity"
                    type="number"
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(e.target.value)}
                    required
                    inputProps={{ min: 1, max: availableStock }}
                    helperText={`Max returnable: ${availableStock}`}
                    error={parseInt(returnQuantity) > availableStock}
                  />
                </Grid>

                {/* Return Reason */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Return Reason</InputLabel>
                    <Select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      label="Return Reason"
                    >
                      {CUSTOMER_RETURN_REASONS.map((reason) => (
                        <MenuItem key={reason} value={reason}>
                          {reason}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Refund Payment Method */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Refund Payment Method</InputLabel>
                    <Select
                      value={refundPaymentMethod}
                      onChange={(e) => setRefundPaymentMethod(e.target.value)}
                      label="Refund Payment Method"
                    >
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="online">Online (Bank Transfer)</MenuItem>
                      <MenuItem value="credit">Credit (Add to Customer Balance)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Bank Selection (if online) */}
                {refundPaymentMethod === "online" && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Select Bank</InputLabel>
                      <Select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        label="Select Bank"
                      >
                        {(banks || []).map((bank) => (
                          <MenuItem key={bank._id} value={bank._id}>
                            {bank.bankName} (Balance: Rs {bank.balance?.toLocaleString()})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {/* Process Refund Now Checkbox */}
                {refundPaymentMethod !== "credit" && (
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={processRefundNow}
                          onChange={(e) => setProcessRefundNow(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Process refund now (deduct from cash/bank immediately)"
                    />
                  </Grid>
                )}

                {/* Return Date */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Return Date"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Description */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    placeholder="Describe the reason for return..."
                  />
                </Grid>

                {/* Summary */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: "grey.100" }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Unit Price
                        </Typography>
                        <Typography variant="h6">Rs {unitCost.toLocaleString()}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Quantity
                        </Typography>
                        <Typography variant="h6">{returnQuantity || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Refund Amount
                        </Typography>
                        <Typography variant="h6" color="error.main">
                          Rs {refundAmount.toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Chip
                          label="Stock will INCREASE"
                          color="success"
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Submit Button */}
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="secondary"
                    size="large"
                    fullWidth
                    disabled={isLoading || !selectedCustomer || !selectedSale || !returnQuantity}
                    startIcon={isLoading ? <CircularProgress size={20} /> : <ReturnIcon />}
                  >
                    {isLoading ? "Processing..." : "Create Return from Customer"}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AddReturnProduct;