import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Grid,
  CircularProgress,
  Tooltip,
  Alert,
  TextField
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Undo as ReturnIcon,
  CheckCircle as CompleteIcon,
  Store as SupplierIcon,
  Person as CustomerIcon,
  AttachMoney as MoneyIcon,
  Inventory as StockIcon,
  FilterList as FilterIcon
} from "@mui/icons-material";
import {
  getReturnProducts,
  getReturnSummary,
  processRefund,
  deleteReturnProduct,
  RESET_RETURN_STATE
} from "../../redux/features/return/returnProductSlice";
import { getBanks } from "../../redux/features/Bank/bankSlice"; // ✅ FIXED PATH

const ReturnProductList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const { returnProducts, summary, isLoading, isError, message } = useSelector(
    (state) => state.returnProduct
  );
  const { banks } = useSelector((state) => state.bank);

  // Local state
  const [tabValue, setTabValue] = useState(0); // 0 = All, 1 = To Supplier, 2 = From Customer
  const [deleteId, setDeleteId] = useState(null);
  const [processRefundDialog, setProcessRefundDialog] = useState(null);
  const [refundPaymentMethod, setRefundPaymentMethod] = useState("cash");
  const [selectedBank, setSelectedBank] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Load data
  useEffect(() => {
    dispatch(getReturnProducts());
    dispatch(getReturnSummary());
    dispatch(getBanks());

    return () => {
      dispatch(RESET_RETURN_STATE());
    };
  }, [dispatch]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Filter returns based on tab and search
  const filteredReturns = (returnProducts || []).filter((r) => {
    // Tab filter
    if (tabValue === 1 && r.returnType !== "to_supplier") return false;
    if (tabValue === 2 && r.returnType !== "from_customer") return false;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        r.productName?.toLowerCase().includes(search) ||
        r.supplierName?.toLowerCase().includes(search) ||
        r.customerName?.toLowerCase().includes(search) ||
        r.warehouseName?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  // Handle delete
  const handleDelete = () => {
    if (deleteId) {
      dispatch(deleteReturnProduct(deleteId));
      setDeleteId(null);
    }
  };

  // Handle process refund
  const handleProcessRefund = () => {
    if (processRefundDialog) {
      dispatch(
        processRefund({
          id: processRefundDialog._id,
          paymentMethod: refundPaymentMethod,
          bankId: refundPaymentMethod === "online" ? selectedBank : null
        })
      );
      setProcessRefundDialog(null);
      setRefundPaymentMethod("cash");
      setSelectedBank("");
    }
  };

  // Open process refund dialog
  const openRefundDialog = (returnItem) => {
    setProcessRefundDialog(returnItem);
    setRefundPaymentMethod(returnItem.refundPaymentMethod || "cash");
    setSelectedBank(returnItem.refundBankId || "");
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ReturnIcon fontSize="large" />
          Return Products
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate("/add-return-product")}
        >
          Add Return
        </Button>
      </Box>

      {/* Error Alert */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* To Supplier Summary */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: "primary.light", color: "primary.contrastText" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <SupplierIcon />
                <Typography variant="h6">Returns TO Supplier</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">Total Returns</Typography>
                  <Typography variant="h5">{summary?.toSupplier?.count || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Total Quantity</Typography>
                  <Typography variant="h5">{summary?.toSupplier?.totalQuantity || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Refund Received</Typography>
                  <Typography variant="h6" sx={{ color: "success.light" }}>
                    Rs {(summary?.toSupplier?.completedRefunds || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Refund Pending</Typography>
                  <Typography variant="h6" sx={{ color: "warning.light" }}>
                    Rs {(summary?.toSupplier?.pendingRefunds || 0).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* From Customer Summary */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: "secondary.light", color: "secondary.contrastText" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <CustomerIcon />
                <Typography variant="h6">Returns FROM Customer</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">Total Returns</Typography>
                  <Typography variant="h5">{summary?.fromCustomer?.count || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Total Quantity</Typography>
                  <Typography variant="h5">{summary?.fromCustomer?.totalQuantity || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Refund Paid</Typography>
                  <Typography variant="h6" sx={{ color: "error.light" }}>
                    Rs {(summary?.fromCustomer?.completedRefunds || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Refund Pending</Typography>
                  <Typography variant="h6" sx={{ color: "warning.light" }}>
                    Rs {(summary?.fromCustomer?.pendingRefunds || 0).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label={`All Returns (${returnProducts?.length || 0})`} />
          <Tab
            icon={<SupplierIcon fontSize="small" />}
            iconPosition="start"
            label={`To Supplier (${returnProducts?.filter((r) => r.returnType === "to_supplier").length || 0})`}
          />
          <Tab
            icon={<CustomerIcon fontSize="small" />}
            iconPosition="start"
            label={`From Customer (${returnProducts?.filter((r) => r.returnType === "from_customer").length || 0})`}
          />
        </Tabs>
      </Paper>

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by product, supplier, customer, or warehouse..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <FilterIcon sx={{ mr: 1, color: "text.secondary" }} />
          }}
          size="small"
        />
      </Box>

      {/* Returns Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Supplier/Customer</TableCell>
              <TableCell>Warehouse</TableCell>
              <TableCell align="center">Qty</TableCell>
              <TableCell align="right">Refund Amount</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredReturns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary">No return products found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredReturns.map((item) => (
                <TableRow key={item._id} hover>
                  <TableCell>{formatDate(item.returnDate || item.createdAt)}</TableCell>
                  <TableCell>
                    {item.returnType === "to_supplier" ? (
                      <Chip
                        icon={<SupplierIcon fontSize="small" />}
                        label="To Supplier"
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      <Chip
                        icon={<CustomerIcon fontSize="small" />}
                        label="From Customer"
                        color="secondary"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.productName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.category}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {item.returnType === "to_supplier" ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <SupplierIcon fontSize="small" color="primary" />
                        {item.supplierName || "N/A"}
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <CustomerIcon fontSize="small" color="secondary" />
                        {item.customerName || "N/A"}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{item.warehouseName}</TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={<StockIcon fontSize="small" />}
                      label={item.returnQuantity}
                      size="small"
                      color={item.returnType === "to_supplier" ? "warning" : "success"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      color={item.returnType === "to_supplier" ? "success.main" : "error.main"}
                      fontWeight="medium"
                    >
                      Rs {(item.refundAmount || 0).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {item.refundStatus === "completed" ? (
                      <Chip
                        icon={<CompleteIcon fontSize="small" />}
                        label={item.returnType === "to_supplier" ? "Received" : "Paid"}
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        label="Pending"
                        color="warning"
                        size="small"
                        onClick={() => openRefundDialog(item)}
                        sx={{ cursor: "pointer" }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 150 }} noWrap>
                      {item.returnReason}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {item.refundStatus !== "completed" && (
                        <Tooltip title="Process Refund">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => openRefundDialog(item)}
                          >
                            <MoneyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteId(item._id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ✅ FIXED: Delete Confirmation Dialog (inline instead of ConfirmDialog component) */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Return</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this return? This will reverse all stock and balance changes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Process Refund Dialog */}
      <Dialog open={!!processRefundDialog} onClose={() => setProcessRefundDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {processRefundDialog?.returnType === "to_supplier"
            ? "Receive Refund from Supplier"
            : "Pay Refund to Customer"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              {processRefundDialog?.returnType === "to_supplier" ? (
                <>
                  <strong>Supplier Return:</strong> Rs{" "}
                  {(processRefundDialog?.refundAmount || 0).toLocaleString()} will be ADDED to your{" "}
                  {refundPaymentMethod === "cash" ? "Cash" : "Bank"} balance.
                </>
              ) : (
                <>
                  <strong>Customer Return:</strong> Rs{" "}
                  {(processRefundDialog?.refundAmount || 0).toLocaleString()} will be DEDUCTED from your{" "}
                  {refundPaymentMethod === "cash" ? "Cash" : "Bank"} balance.
                </>
              )}
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Product
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {processRefundDialog?.productName} x {processRefundDialog?.returnQuantity}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  {processRefundDialog?.returnType === "to_supplier" ? "Supplier" : "Customer"}
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {processRefundDialog?.returnType === "to_supplier"
                    ? processRefundDialog?.supplierName
                    : processRefundDialog?.customerName}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={refundPaymentMethod}
                    onChange={(e) => setRefundPaymentMethod(e.target.value)}
                    label="Payment Method"
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="online">Online (Bank Transfer)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {refundPaymentMethod === "online" && (
                <Grid item xs={12}>
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
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcessRefundDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={processRefundDialog?.returnType === "to_supplier" ? "success" : "error"}
            onClick={handleProcessRefund}
            disabled={refundPaymentMethod === "online" && !selectedBank}
          >
            {processRefundDialog?.returnType === "to_supplier" ? "Receive Refund" : "Pay Refund"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReturnProductList;
 