// src/pages/Sales.jsx

import React, { useState, useEffect } from "react";
import AddSale from "../../components/SaleProduct/AddSale";
import { useDispatch, useSelector } from "react-redux";
import { getProducts } from "../../redux/features/product/productSlice";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { selectIsLoggedIn } from "../../redux/features/auth/authSlice";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";

import {
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
  CircularProgress
} from "@mui/material";
import axios from "axios"; // ← CHANGED

// ——— NEW: build API base (include your API Gateway stage) ———
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // e.g. https://xyz.execute-api...amazonaws.com/
const API_BASE = `${BACKEND_URL}api`; // ← CHANGED
const api = axios.create({
  // ← CHANGED
  baseURL: API_BASE,
  withCredentials: true
});
// ← CHANGED: attach JWT if present
const token = localStorage.getItem("jwt");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

function Sales() {
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [sales, setAllSalesData] = useState([]);
  const [customer, setAllCustomer] = useState([]);
  const [banks, setBanks] = useState([]);
  const [updatePage, setUpdatePage] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();

  const isLoggedIn = useSelector(selectIsLoggedIn);
  const {
    products,
    isLoading: isProductsLoading,
    isError,
    message
  } = useSelector(state => state.product);

  useEffect(
    () => {
      if (isLoggedIn) {
        dispatch(getProducts());
      }
      if (isError) {
        console.log(message);
      }
    },
    [isLoggedIn, isError, message, dispatch]
  );

  useEffect(
    () => {
      if (isLoggedIn) {
        setLoading(true);
        Promise.all([fetchSalesData(), fetchCustomerData(), fetchBankData()])
          .then(() => setLoading(false))
          .catch(() => setLoading(false));
      }
    },
    [isLoggedIn, updatePage]
  );

  // ← CHANGED: use `api` instance instead of raw axios + API_URL
  const fetchCustomerData = async () => {
    try {
      const response = await api.get("/customers/allcustomer"); // ← CHANGED
      setAllCustomer(response.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };
  const fetchSalesData = async () => {
    try {
      const response = await api.get("/sales");
      console.log("Fetched sales data:", response.data); // Log to check if sales data is correct
      setAllSalesData(response.data);
    } catch (error) {
      console.error("Error fetching sales:", error);
    }
  };

  const fetchBankData = async () => {
    try {
      const response = await api.get("/banks/all"); // ← CHANGED
      setBanks(response.data);
    } catch (error) {
      console.error("Error fetching banks:", error);
    }
  };

  const addSaleModalSetting = () => {
    setShowSaleModal(!showSaleModal);
  };

  const handlePageUpdate = () => {
    setUpdatePage(!updatePage);
  };

  const recordSaleTransaction = async saleData => {
    try {
      await api.post("/customers/sale-transaction", saleData); // ← CHANGED
      console.log("Sale transaction recorded in customer's ledger");
    } catch (error) {
      console.error("Error recording sale transaction:", error);
    }
  };

  const handleSaleSubmit = saleData => {
    console.log("Submitting Sale Data: ", {
      customerId: saleData.customerID,
      amount: saleData.totalSaleAmount, // Unit price only
      stockSold: saleData.stockSold // Quantity sold
    });

    const saleTransactionData = {
      customerId: saleData.customerID,
      amount: saleData.totalSaleAmount, // Unit price only (not totalAmount)
      paymentMethod: saleData.paymentMethod || "cash",
      saleDate: saleData.saleDate || new Date()
    };

    // Send data to backend (no totalAmount here)
    recordSaleTransaction(saleTransactionData);
    handlePageUpdate();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteSale = async saleId => {
    if (!saleId) {
      alert("Invalid sale ID");
      return;
    }
    try {
      // Make API call to delete the sale
      await api.delete(`/sales/${saleId}`);

      // After successful deletion, update the sales state
      setAllSalesData(sales.filter(sale => sale._id !== saleId)); // Update state correctly
      alert("Sale deleted successfully");
    } catch (error) {
      console.error("Error deleting sale:", error);
      alert("Failed to delete sale");
    }
  };

  const [viewOpen, setViewOpen] = useState(false);
const [selectedSale, setSelectedSale] = useState(null);

// Safely extract names even if refs aren’t populated
const getProductName = (sale) =>
  sale?.productID?.name ||
  products.find(p => p._id === (sale?.productID?._id || sale?.productID))?.name ||
  "Unknown Product";

const getCustomerName = (sale) =>
  sale?.customerID?.username || customer.find(c => c._id === sale?.customerID)?.username || "Unknown Customer";

const getBankName = (sale) => {
  const id = sale?.bankID?._id || sale?.bankID; // supports populated or plain id
  if (!id) return null;
  return sale?.bankID?.bankName || banks.find(b => b._id === id)?.bankName || "Selected Bank";
};

const formatDate = (d) => {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "-";
  }
};

// Builds the sentence shown in the dialog
const buildDescription = (sale) => {
  const prod = getProductName(sale);
  const cust = getCustomerName(sale);
  const method = (sale?.paymentMethod || "cash").toLowerCase();
  const bank = getBankName(sale);
  const chequeDate = sale?.chequeDate ? formatDate(sale.chequeDate) : null;
  const when = sale?.saleDate ? formatDate(sale.saleDate) : "-";
  const qty = sale?.stockSold ?? "-";
  const amount = sale?.totalSaleAmount ?? "-"; // this is total amount in your current API

  // Payment method specific tail
  let via = "via cash";
  if (method === "online") via = bank ? `via online (Bank: ${bank})` : "via online";
  if (method === "cheque") via = bank ? `via cheque (Bank: ${bank}${chequeDate ? `, Cheque Date: ${chequeDate}` : ""})` : "via cheque";
  if (method === "credit") via = "on credit";

  // Final sentence
  return `${prod} was sold to ${cust} (Qty: ${qty}) for Rs ${amount} ${via} on ${when}.`;
};


  return (
    <Container>
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Sales
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={addSaleModalSetting}
            sx={{ mb: 2 }}
          >
            Add Sale
          </Button>

          {showSaleModal &&
            <AddSale
              addSaleModalSetting={addSaleModalSetting}
              products={products}
              customer={customer}
              banks={banks}
              fetchCustomerData={fetchCustomerData}
              handlePageUpdate={handlePageUpdate}
              onSaleSubmit={handleSaleSubmit}
            />}

          {loading
            ? <CircularProgress />
            : <TableContainer component={Paper}>
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
                      .slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage
                      )
                      .map(element =>
                        <TableRow key={element._id}>
                          {/* Check if productID and customerID are populated */}
                          <TableCell>
                            {element.productID
                              ? element.productID.name
                              : "Unknown Product"}
                          </TableCell>
                          <TableCell>
                            {element.customerID
                              ? element.customerID.username
                              : "Unknown Customer"}
                          </TableCell>
                          <TableCell>
                            {element.stockSold}
                          </TableCell>
                          <TableCell>
                            {new Date(element.saleDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {element.totalSaleAmount}
                          </TableCell>
                         <TableCell>
  {/* View / description icon */}
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

  {/* Optional: small helper icon */}
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

  {/* Delete icon */}
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
                      )}
                  </TableBody>
                </Table>
              </TableContainer>}

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sales.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />

          <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Sale Description</DialogTitle>
  <DialogContent dividers>
    <Typography variant="body1">
      {selectedSale ? buildDescription(selectedSale) : ""}
    </Typography>

    {/* (Optional) quick facts list */}
    {selectedSale && (
      <Paper sx={{ mt: 2, p: 2 }} variant="outlined">
        <Typography variant="subtitle2" gutterBottom>Quick facts</Typography>
        <Typography variant="body2">
          Product: {getProductName(selectedSale)}
        </Typography>
        <Typography variant="body2">
          Customer: {getCustomerName(selectedSale)}
        </Typography>
        <Typography variant="body2">
          Quantity: {selectedSale.stockSold ?? "-"}
        </Typography>
        <Typography variant="body2">
          Total Amount (Rs): {selectedSale.totalSaleAmount ?? "-"}
        </Typography>
        <Typography variant="body2">
          Payment Method: {selectedSale.paymentMethod ?? "cash"}
        </Typography>
        {(selectedSale.paymentMethod === "online" || selectedSale.paymentMethod === "cheque") && (
          <Typography variant="body2">
            Bank: {getBankName(selectedSale) ?? "-"}
          </Typography>
        )}
        {selectedSale.paymentMethod === "cheque" && (
          <Typography variant="body2">
            Cheque Date: {selectedSale.chequeDate ? formatDate(selectedSale.chequeDate) : "-"}
          </Typography>
        )}
        <Typography variant="body2">
          Sale Date: {selectedSale.saleDate ? formatDate(selectedSale.saleDate) : "-"}
        </Typography>
      </Paper>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setViewOpen(false)} variant="contained">Close</Button>
  </DialogActions>
</Dialog>

        </CardContent>
      </Card>
    </Container>
  );
}

export default Sales;
