// src/pages/Sales.jsx
import React, { useState, useEffect } from "react";
import AddSale from "../../components/SaleProduct/AddSale";
import { useDispatch, useSelector } from "react-redux";
import { getProducts } from "../../redux/features/product/productSlice";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { selectIsLoggedIn } from "../../redux/features/auth/authSlice";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Container,
  TablePagination,
  CircularProgress,
  Grid,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

import axios from "axios";

// ——— API base ———
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}api`;
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});
const token = localStorage.getItem("jwt");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

function Sales() {
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [sales, setAllSalesData] = useState([]);
  const [customer, setAllCustomer] = useState([]);
  const [banks, setBanks] = useState([]);
  const [warehouses, setWarehouses] = useState([]); // keep as array
  const [updatePage, setUpdatePage] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  // View dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editSale, setEditSale] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");

  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();

  const isLoggedIn = useSelector(selectIsLoggedIn);
  const { products, isLoading: isProductsLoading, isError, message } = useSelector(
    (state) => state.product
  );

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(getProducts());
    }
    if (isError) {
      console.log(message);
    }
  }, [isLoggedIn, isError, message, dispatch]);

  useEffect(() => {
    if (isLoggedIn) {
      setLoading(true);
      Promise.all([
        fetchSalesData(),
        fetchCustomerData(),
        fetchBankData(),
        fetchWarehouseData(),
      ])
        .then(() => setLoading(false))
        .catch(() => setLoading(false));
    }
  }, [isLoggedIn, updatePage]);

  const fetchCustomerData = async () => {
    try {
      const response = await api.get("/customers/allcustomer");
      setAllCustomer(response.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchSalesData = async () => {
    try {
      const response = await api.get("/sales");
      setAllSalesData(response.data);
    } catch (error) {
      console.error("Error fetching sales:", error);
    }
  };

  const fetchBankData = async () => {
    try {
      const response = await api.get("/banks/all");
      setBanks(response.data);
    } catch (error) {
      console.error("Error fetching banks:", error);
    }
  };

  // ✅ Normalize warehouses response to an array
  const fetchWarehouseData = async () => {
    try {
      const res = await api.get("/warehouses/all");
      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.warehouses)
        ? data.warehouses
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setWarehouses(list);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      setWarehouses([]); // ensure array
    }
  };

  const addSaleModalSetting = () => {
    setShowSaleModal(!showSaleModal);
  };

  const handlePageUpdate = () => {
    setUpdatePage(!updatePage);
  };

  // ⛔ Removed recordSaleTransaction & handleSaleSubmit to avoid double-writing ledgers

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteSale = async (saleId) => {
    if (!saleId) {
      alert("Invalid sale ID");
      return;
    }
    try {
      await api.delete(`/sales/${saleId}`);
      // Prefer re-fetch to keep populated refs correct
      await fetchSalesData();
      alert("Sale deleted successfully");
      handlePageUpdate();
    } catch (error) {
      console.error("Error deleting sale:", error);
      alert("Failed to delete sale");
    }
  };

  // ===== Helpers for display =====
  const getProductName = (sale) =>
    sale?.productID?.name ||
    products.find((p) => p._id === (sale?.productID?._id || sale?.productID))?.name ||
    "Unknown Product";

  const getCustomerName = (sale) =>
    sale?.customerID?.username ||
    customer.find((c) => c._id === (sale?.customerID?._id || sale?.customerID))?.username ||
    "Unknown Customer";

  const getBankName = (sale) => {
    const id = sale?.bankID?._id || sale?.bankID;
    if (!id) return null;
    return sale?.bankID?.bankName || banks.find((b) => b._id === id)?.bankName || "Selected Bank";
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return "-";
    }
  };

  const buildDescription = (sale) => {
    const prod = getProductName(sale);
    const cust = getCustomerName(sale);
    const method = (sale?.paymentMethod || "cash").toLowerCase();
    const bank = getBankName(sale);
    const chequeDate = sale?.chequeDate ? formatDate(sale.chequeDate) : null;
    const when = sale?.saleDate ? formatDate(sale.saleDate) : "-";
    const qty = sale?.stockSold ?? "-";
    const amount = sale?.totalSaleAmount ?? "-";

    let via = "via cash";
    if (method === "online") via = bank ? `via online (Bank: ${bank})` : "via online";
    if (method === "cheque")
      via = bank ? `via cheque (Bank: ${bank}${chequeDate ? `, Cheque Date: ${chequeDate}` : ""})` : "via cheque";
    if (method === "credit") via = "on credit";

    return `${prod} was sold to ${cust} (Qty: ${qty}) for Rs ${amount} ${via} on ${when}.`;
  };

  // ===== EDIT: open/close + state mapping =====
  const openEdit = (sale) => {
    const mapped = {
      _id: sale._id,
      productID: sale.productID?._id || sale.productID || "",
      customerID: sale.customerID?._id || sale.customerID || "",
      stockSold: sale.stockSold || 0,
      saleDate: sale.saleDate ? new Date(sale.saleDate).toISOString().slice(0, 10) : "",
      totalSaleAmount: sale.totalSaleAmount || 0,
      paymentMethod: sale.paymentMethod || "cash",
      chequeDate: sale.chequeDate ? new Date(sale.chequeDate).toISOString().slice(0, 10) : "",
      bankID: sale.bankID?._id || sale.bankID || "",
      warehouseID: sale.warehouseID?._id || sale.warehouseID || "",
      status: Boolean(sale.status),
    };
    setEditSale(mapped);
    setEditErrors({});
    setEditImage(null);
    setEditImagePreview("");
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditSale(null);
    setEditErrors({});
    setEditImage(null);
    setEditImagePreview("");
  };

  const onEditField = (e) => {
    const { name, value } = e.target;
    setEditSale((prev) => ({ ...prev, [name]: value }));

    if (name === "stockSold") {
      const prod = products.find((p) => p._id === (editSale?.productID || ""));
      const max = prod?.quantity ?? Infinity;
      const v = parseInt(value || 0, 10);
      if (v < 0 || v > max) {
        setEditErrors((er) => ({ ...er, stockSold: `Stock Sold must be between 0 and ${max}.` }));
      } else {
        setEditErrors((er) => ({ ...er, stockSold: "" }));
      }
    }

    if (name === "totalSaleAmount") {
      const v = parseFloat(value || 0);
      if (v <= 0) {
        setEditErrors((er) => ({ ...er, totalSaleAmount: "Total Sale Amount must be greater than 0." }));
      } else {
        setEditErrors((er) => ({ ...er, totalSaleAmount: "" }));
      }
    }

    if (name === "paymentMethod" && (value === "cash" || value === "credit")) {
      setEditSale((prev) => ({
        ...prev,
        saleDate: new Date().toISOString().slice(0, 10),
      }));
    }
  };

  const onEditImage = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImage(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const saveEdit = async () => {
    if (!editSale?._id) return;

    const required = [
      "productID",
      "customerID",
      "stockSold",
      "saleDate",
      "totalSaleAmount",
      "paymentMethod",
      "warehouseID",
    ];
    for (const f of required) {
      if (!editSale[f] && editSale[f] !== 0) {
        alert("Please fill in all fields");
        return;
      }
    }
    if ((editSale.paymentMethod === "online" || editSale.paymentMethod === "cheque") && !editSale.bankID) {
      alert("Bank is required for online/cheque.");
      return;
    }
    if (editSale.paymentMethod === "cheque" && !editSale.chequeDate) {
      alert("Cheque date is required for cheque payment.");
      return;
    }
    if (editErrors.stockSold || editErrors.totalSaleAmount) {
      alert("Please fix validation errors.");
      return;
    }

    try {
      const form = new FormData();
      form.append("productID", editSale.productID);
      form.append("customerID", editSale.customerID);
      form.append("stockSold", editSale.stockSold);
      form.append("saleDate", editSale.saleDate);
      form.append("totalSaleAmount", editSale.totalSaleAmount);
      form.append("paymentMethod", editSale.paymentMethod);
      form.append("warehouseID", editSale.warehouseID);
      form.append("status", editSale.status ? "true" : "false");
      if (editSale.paymentMethod === "online" || editSale.paymentMethod === "cheque") {
        form.append("bankID", editSale.bankID);
      }
      if (editSale.paymentMethod === "cheque" && editSale.chequeDate) {
        form.append("chequeDate", editSale.chequeDate);
      }
      if (editImage) {
        form.append("image", editImage);
      }

      await api.put(`/sales/${editSale._id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchSalesData();
      handlePageUpdate();
      closeEdit();
      alert("Sale updated successfully");
    } catch (err) {
      console.error("Failed to update sale:", err?.response?.data || err);
      alert(err?.response?.data?.message || "Failed to update sale");
    }
  };

  // Safe array for rendering warehouses
  const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];

  return (
    <Container>
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Sales
          </Typography>

          <Button variant="contained" color="primary" onClick={addSaleModalSetting} sx={{ mb: 2 }}>
            Add Sale
          </Button>

          {showSaleModal && (
            <AddSale
              addSaleModalSetting={addSaleModalSetting}
              products={products}
              customer={customer}
              banks={banks}
              fetchCustomerData={fetchCustomerData}
              handlePageUpdate={handlePageUpdate}
              // ⛔ removed onSaleSubmit
            />
          )}

          {loading ? (
            <CircularProgress />
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product Name</TableCell>
                    <TableCell>Customer Name</TableCell>
                    <TableCell>Product Sold</TableCell>
                    <TableCell>Sales Date</TableCell>
                    <TableCell>Total Sale Amount (Rs)</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sales
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((element) => (
                      <TableRow key={element._id}>
                        <TableCell>
                          {element.productID ? element.productID.name : "Unknown Product"}
                        </TableCell>
                        <TableCell>
                          {element.customerID ? element.customerID.username : "Unknown Customer"}
                        </TableCell>
                        <TableCell>{element.stockSold}</TableCell>
                        <TableCell>{new Date(element.saleDate).toLocaleDateString()}</TableCell>
                        <TableCell>{element.totalSaleAmount}</TableCell>

                        <TableCell>
                          {/* EDIT */}
                          <Tooltip title="Edit sale">
                            <IconButton
                              aria-label="edit"
                              onClick={() => openEdit(element)}
                              size="small"
                              sx={{ mr: 0.5 }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>

                          {/* VIEW */}
                          <Tooltip title="View details">
                            <IconButton
                              aria-label="view"
                              onClick={() => {
                                setSelectedSale(element);
                                setViewOpen(true);
                              }}
                              size="small"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>

                          {/* INFO */}
                          <Tooltip title="What is this?">
                            <IconButton
                              aria-label="info"
                              onClick={() => {
                                setSelectedSale(element);
                                setViewOpen(true);
                              }}
                              size="small"
                            >
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* DELETE */}
                          <Tooltip title="Delete sale">
                            <IconButton
                              aria-label="delete"
                              onClick={() => handleDeleteSale(element._id)}
                              size="small"
                              sx={{ color: "red", ml: 1 }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sales.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />

          {/* VIEW DIALOG */}
          <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Sale Description</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body1">
                {selectedSale ? buildDescription(selectedSale) : ""}
              </Typography>

              {selectedSale && (
                <Paper sx={{ mt: 2, p: 2 }} variant="outlined">
                  <Typography variant="subtitle2" gutterBottom>
                    Quick facts
                  </Typography>
                  <Typography variant="body2">Product: {getProductName(selectedSale)}</Typography>
                  <Typography variant="body2">Customer: {getCustomerName(selectedSale)}</Typography>
                  <Typography variant="body2">
                    Quantity: {selectedSale.stockSold ?? "-"}
                  </Typography>
                  <Typography variant="body2">
                    Total Amount (Rs): {selectedSale.totalSaleAmount ?? "-"}
                  </Typography>
                  <Typography variant="body2">
                    Payment Method: {selectedSale.paymentMethod ?? "cash"}
                  </Typography>
                  {(selectedSale.paymentMethod === "online" ||
                    selectedSale.paymentMethod === "cheque") && (
                    <Typography variant="body2">Bank: {getBankName(selectedSale) ?? "-"}</Typography>
                  )}
                  {selectedSale.paymentMethod === "cheque" && (
                    <Typography variant="body2">
                      Cheque Date:{" "}
                      {selectedSale.chequeDate ? formatDate(selectedSale.chequeDate) : "-"}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    Sale Date: {selectedSale.saleDate ? formatDate(selectedSale.saleDate) : "-"}
                  </Typography>
                </Paper>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewOpen(false)} variant="contained">
                Close
              </Button>
            </DialogActions>
          </Dialog>

          {/* EDIT DIALOG */}
          <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="sm">
            <DialogTitle>Edit Sale</DialogTitle>
            <DialogContent dividers>
              {editSale && (
                <Grid container spacing={2} sx={{ mt: 0 }}>
                  {/* Product */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="edit-productID-label">Product</InputLabel>
                      <Select
                        labelId="edit-productID-label"
                        name="productID"
                        value={editSale.productID}
                        onChange={onEditField}
                        label="Product"
                      >
                        {products.map((p) => (
                          <MenuItem key={p._id} value={p._id}>
                            {p.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Customer */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="edit-customerID-label">Customer</InputLabel>
                      <Select
                        labelId="edit-customerID-label"
                        name="customerID"
                        value={editSale.customerID}
                        onChange={onEditField}
                        label="Customer"
                      >
                        {customer.map((c) => (
                          <MenuItem key={c._id} value={c._id}>
                            {c.username}
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
                      value={editSale.stockSold}
                      onChange={onEditField}
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                      error={!!editErrors.stockSold}
                      helperText={editErrors.stockSold}
                    />
                  </Grid>

                  {/* Total Amount */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Total Sale Amount"
                      type="number"
                      name="totalSaleAmount"
                      value={editSale.totalSaleAmount}
                      onChange={onEditField}
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                      error={!!editErrors.totalSaleAmount}
                      helperText={editErrors.totalSaleAmount}
                    />
                  </Grid>

                  {/* Payment Method */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="edit-paymentMethod-label">Payment Method</InputLabel>
                      <Select
                        labelId="edit-paymentMethod-label"
                        name="paymentMethod"
                        value={editSale.paymentMethod}
                        onChange={onEditField}
                        label="Payment Method"
                      >
                        <MenuItem value="cash">Cash</MenuItem>
                        <MenuItem value="online">Online</MenuItem>
                        <MenuItem value="cheque">Cheque</MenuItem>
                        <MenuItem value="credit">Credit</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Bank (for online/cheque) */}
                  {(editSale.paymentMethod === "online" || editSale.paymentMethod === "cheque") && (
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth margin="normal">
                        <InputLabel id="edit-bankID-label">Bank</InputLabel>
                        <Select
                          labelId="edit-bankID-label"
                          name="bankID"
                          value={editSale.bankID}
                          onChange={onEditField}
                          label="Bank"
                        >
                          {banks.map((b) => (
                            <MenuItem key={b._id} value={b._id}>
                              {b.bankName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}

                  {/* Cheque date (for cheque) */}
                  {editSale.paymentMethod === "cheque" && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Cheque Date"
                        type="date"
                        name="chequeDate"
                        value={editSale.chequeDate}
                        onChange={onEditField}
                        InputLabelProps={{ shrink: true }}
                        margin="normal"
                      />
                    </Grid>
                  )}

                  {/* Warehouse */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="edit-warehouseID-label">Warehouse</InputLabel>
                      <Select
                        labelId="edit-warehouseID-label"
                        name="warehouseID"
                        value={editSale.warehouseID}
                        onChange={onEditField}
                        label="Warehouse"
                      >
                        {safeWarehouses.map((w) => (
                          <MenuItem key={w._id} value={w._id}>
                            {w.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Sale Date */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Sale Date"
                      type="date"
                      name="saleDate"
                      value={editSale.saleDate}
                      onChange={onEditField}
                      InputLabelProps={{ shrink: true }}
                      margin="normal"
                      disabled={editSale.paymentMethod === "cash" || editSale.paymentMethod === "credit"}
                    />
                  </Grid>

                  {/* Status */}
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!editSale.status}
                          onChange={(e) =>
                            setEditSale((prev) => ({ ...prev, status: e.target.checked }))
                          }
                        />
                      }
                      label="Status"
                    />
                  </Grid>

                  {/* Optional image */}
                  <Grid item xs={12}>
                    <TextField
                      type="file"
                      label="Replace Image (optional)"
                      name="image"
                      onChange={onEditImage}
                      fullWidth
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                    />
                    {editImagePreview && (
                      <img
                        src={editImagePreview}
                        alt="Preview"
                        style={{ width: "100%", maxHeight: 300, marginTop: 12, objectFit: "cover" }}
                      />
                    )}
                  </Grid>
                </Grid>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={closeEdit} variant="outlined">
                Cancel
              </Button>
              <Button onClick={saveEdit} variant="contained">
                Save
              </Button>
            </DialogActions>
          </Dialog>
        </CardContent>
      </Card>
    </Container>
  );
}

export default Sales;
