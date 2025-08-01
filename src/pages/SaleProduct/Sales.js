// src/pages/Sales.jsx

import React, { useState, useEffect } from "react";
import AddSale from "../../components/SaleProduct/AddSale";
import { useDispatch, useSelector } from "react-redux";
import { getProducts } from "../../redux/features/product/productSlice";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { selectIsLoggedIn } from "../../redux/features/auth/authSlice";
import DeleteIcon from "@mui/icons-material/Delete";
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
                            {/* Delete Icon */}
                            <DeleteIcon
                              sx={{ cursor: "pointer", color: "red" }}
                              onClick={() => handleDeleteSale(element._id)} // Pass sale id
                            />
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
        </CardContent>
      </Card>
    </Container>
  );
}

export default Sales;
