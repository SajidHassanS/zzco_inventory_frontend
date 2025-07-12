import React, { useState, useEffect } from "react";
import {

  Typography,
  Container,
  Card,
  CardContent,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { getProducts } from "../../redux/features/product/productSlice";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import axios from "axios";
import CustomTable from "../../components/CustomTable/CustomTable"; // Import the CustomTable component
// import { getProducts } from "../../redux/features/product/productSlice";
import { getCustomers } from "../../redux/features/cutomer/customerSlice";
import { getSuppliers } from "../../redux/features/supplier/supplierSlice";
// import { getWarehouses } from "../../redux/features/warehouse/warehouseSlice";
const ITEMS_PER_PAGE = 10;

const ViewExpenses = () => {
  const dispatch = useDispatch();
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const { customers } = useSelector((state) => state.customer);
  const { suppliers } = useSelector((state) => state.supplier);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sales, setSales] = useState([]); // Add state to hold sales data
  const banks = useSelector((state) => state.bank.banks); // ✅ Get banks from Redux store
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expense, setExpense] = useState({
    expenseName: "",
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    bankID: "",
    chequeDate: "", // ✅ Added cheque date field
    image: null, // ✅ Added image field
  });
  const [imagePreview, setImagePreview] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);
  const handlePageChange = (event, newPage) => {
    setPage(newPage + 1);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1);
  };

  const [totalPages, setTotalPages] = useState(0);
  const [runningBalance, setRunningBalance] = useState(0);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  // const BACKEND_URL = "https://zzcoinventorymanagmentbackend.up.railway.app";
  const API_URL = `${BACKEND_URL}api`;


  const { products } = useSelector((state) => state.product);


  useEffect(() => {
    dispatch(getProducts());
    dispatch(getCustomers());
    dispatch(getSuppliers());
    dispatch(getBanks());
    fetchSales();
    fetchExpenses();
  }, [dispatch]);

  useEffect(() => {
    filterEntriesByDate();
  }, [selectedDate, ledgerEntries]);

  const fetchSales = async () => {
    try {
      const response = await axios.get(`${API_URL}/sales/allsales`, { withCredentials: true });

      const salesData = response.data.map(sale => ({
        ...sale,
        id: sale._id, // Added id for identifier
        type: 'Sale',
        amount: sale.totalSaleAmount, // Positive amount for sales (debit)
        date: new Date(sale.saleDate),
        description: `Sale of ${sale.stockSold} units of product ${sale.productID ? sale.productID.name : 'Unknown'} to customer ${sale.customerID ? sale.customerID.username : 'Unknown'}`,
      }));
      // setSales(salesData); // Store sales data in state
      // console.log("Sale", salesData);

      updateLedger(salesData);
    } catch (err) {
      console.error("Error fetching sales:", err);
    }
  };
  const fetchExpenses = async () => {
    try {
      const response = await axios.get(`${API_URL}/expenses/all`, {
        withCredentials: true, // ✅ Enables cookies for auth/session
      });

      console.log("🔍 API Response (Expenses):", response.data); // ✅ Debugging log

      const expensesData = response.data.map((expense) => ({
        ...expense,
        id: expense._id,
        type: "Expense",
        amount: -Math.abs(expense.amount), // ✅ Ensure negative amount for expenses
        date: new Date(expense.createdAt),
        description: expense.description || expense.expenseName,
        paymentMethod: expense.paymentMethod || "N/A",
      }));

      console.log("🛠 Final Expense Data:", expensesData); // ✅ Debugging log
      updateLedger(expensesData);
    } catch (err) {
      console.error("❌ Error fetching expenses:", err);
    }
  };



  const updateLedger = (newEntries) => {
    setLedgerEntries((prevEntries) => {
      const updatedEntries = [...prevEntries];

      newEntries.forEach((newEntry) => {
        const exists = updatedEntries.some((entry) => entry.id === newEntry.id);
        if (!exists) {
          updatedEntries.push({
            ...newEntry,
            paymentMethod: newEntry.paymentMethod || "N/A", // ✅ Ensure payment method is set
          });
        }
      });

      return updatedEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
    });
  };

  useEffect(() => {
    if (products.length > 0) {
      const purchaseEntries = products.map(product => ({
        type: 'Purchase',
        id: product._id, // Added id for identifier
        amount: -product.price * product.quantity, // Negative amount for purchases (credit)
        date: new Date(product.createdAt),
        description: `Purchase of ${product.quantity} ${product.name} from supplier ${product.supplier ? product.supplier.username : 'Unknown'} at ${product.price} each`,
        paymentMethod: product.paymentMethod,
        category: product.category,
      }));
      updateLedger(purchaseEntries);
    }
    // if (sales.length > 0) {
    //   updateLedger(sales); // Update ledger with sales data
    // }
  }, [products]);






  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setExpense((prevExpense) => ({
      ...prevExpense,
      [name]: name === "amount" ? parseFloat(value) || "" : value, // ✅ Remove `trim()`
    }));

    if (name === "paymentMethod" && (value === "cash" || value === "credit")) {
      setExpense((prevExpense) => ({
        ...prevExpense,
        expenseDate: new Date().toISOString().split("T")[0],
        chequeDate: "",
        bankID: "",
        image: null,
      }));
      setImagePreview("");
    }
  };



  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setExpense((prevExpense) => ({
        ...prevExpense,
        image: file,
      }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const addExpense = async () => {
    console.log("🚀 Expense Data Before Sending:", expense);

    if (!expense.expenseName || !expense.amount || !expense.description) {
      console.error("⚠️ Missing Fields:", expense);
      alert("Please fill all required fields.");
      return;
    }

    const formData = new FormData();

    // ✅ Ensure values are properly set with encoding
    formData.append("expenseName", expense.expenseName);
    formData.append("amount", String(expense.amount)); // Convert to string
    formData.append("description", expense.description);
    formData.append("expenseDate", expense.expenseDate);
    formData.append("paymentMethod", expense.paymentMethod);

    if (expense.paymentMethod === "cheque" || expense.paymentMethod === "online") {
      formData.append("bankID", expense.bankID);
    }
    if (expense.paymentMethod === "cheque") {
      formData.append("chequeDate", expense.chequeDate);
    }
    if (expense.image) {
      formData.append("image", expense.image);
    }

    console.log("🛠️ FormData Before Sending:", [...formData.entries()]); // Debugging log

    try {
      const response = await axios.post(`${API_URL}/expenses/add`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ API Response:", response.data);
      alert("Expense Added Successfully");
      setShowExpenseModal(false);
      fetchExpenses();

      // Reset Form
      setExpense({
        expenseName: "",
        amount: "",
        description: "",
        paymentMethod: "",
        bankID: "",
        chequeDate: "",
        image: null
      });
    } catch (error) {
      console.error("❌ Error Details:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Failed to add expense. Please try again.");
    }
  };


  const toggleExpenseModal = () => {
    setShowExpenseModal(!showExpenseModal);
  };

  const paginatedEntries = filteredEntries.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );
  const calculateRunningBalance = (entries) => {
    let balance = 0;
    // Reverse the entries to calculate balance from oldest to newest
    const reversedEntries = [...entries].reverse();
    const entriesWithBalance = reversedEntries.map(entry => {
      balance += entry.amount;
      return { ...entry, balance };
    });
    setRunningBalance(balance);
    // Reverse back to newest first
    return entriesWithBalance.reverse();
  };



  useEffect(() => {
    filterEntriesByDate();
  }, [selectedDate, ledgerEntries]);

  const filterEntriesByDate = () => {
    const selectedDateObj = new Date(selectedDate);
    selectedDateObj.setHours(0, 0, 0, 0);

    let filtered = ledgerEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === selectedDateObj.getTime();
    });

    // Sort filtered entries to show newest first
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    const entriesWithBalance = calculateRunningBalance(filtered);
    setFilteredEntries(entriesWithBalance);
    setTotalPages(Math.ceil(entriesWithBalance.length / ITEMS_PER_PAGE));
    setPage(1);
  };

  const columns = [
    {
      field: 'date',
      headerName: 'Date',
      renderCell: (row) => new Date(row.date).toLocaleDateString()
    },
    {
      field: 'expenseName',
      headerName: 'Expense Name',
    },
    {
      field: 'type',
      headerName: 'Type'
    },
    {
      field: 'description',
      headerName: 'Description'
    },
    {
      field: 'debit',
      headerName: 'Debit',
      renderCell: (row) => (
        <span style={{ color: row.amount < 0 ? 'red' : 'inherit' }}>
          {row.amount < 0 ? Math.abs(row.amount).toFixed(2) : ''} {/* ✅ Ensure expenses show as debits */}
        </span>
      )
    },
    {
      field: 'credit',
      headerName: 'Credit',
      renderCell: (row) => (
        <span style={{ color: row.amount > 0 ? 'green' : 'inherit' }}>
          {row.amount > 0 ? row.amount.toFixed(2) : ''} {/* ✅ Only positive values should appear in credit */}
        </span>
      )
    },
    {
      field: 'paymentMethod',
      headerName: 'Payment Method'
    },
    {
      field: 'balance',
      headerName: 'Total Amount',
      renderCell: (row) => row.balance.toFixed(2)
    }
  ];



  const rows = paginatedEntries.map(entry => ({
    ...entry,
    debit: entry.amount,
    credit: entry.amount,
    key: `${entry.date}-${entry.description}` // Ensure this key is unique

  }));
  return (
    <Container>
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mb={2}>
        <TextField
          label="Select Date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={toggleExpenseModal}
        >
          Add Expense
        </Button>
      </Box>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Ledger for {new Date(selectedDate).toDateString()}
          </Typography>
          <Typography variant="h6" gutterBottom>
            Balance: {runningBalance.toFixed(2)}
          </Typography>

          {filteredEntries.length === 0 ? (
            <Typography variant="body1">No entries found for the selected date.</Typography>
          ) : (
            <>
              <CustomTable
                columns={columns}
                data={filteredEntries}
                page={page - 1}
                rowsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
              // rowKey={(row) => `${row.date}-${row.description}`} // Pass the unique key

              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showExpenseModal}
        onClose={toggleExpenseModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent>
          <form>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Expense Name"
                  name="expenseName"
                  value={expense.expenseName}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  name="amount"
                  value={expense.amount}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={expense.description}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Payment Method</InputLabel>
                  <Select name="paymentMethod" value={expense.paymentMethod} onChange={handleInputChange}>
                    <MenuItem value=""><em>Select Payment Method</em></MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="online">Online</MenuItem>
                    <MenuItem value="cheque">Cheque</MenuItem>
                    <MenuItem value="credit">Credit</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* ✅ Bank Selection for Online & Cheque */}
              {(expense.paymentMethod === "online" || expense.paymentMethod === "cheque") && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Bank Name</InputLabel>
                    <Select name="bankID" value={expense.bankID} onChange={handleInputChange}>
                      {banks.map((bank) => (
                        <MenuItem key={bank._id} value={bank._id}>
                          {bank.bankName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* ✅ Cheque Date for Cheque Payment */}
              {expense.paymentMethod === "cheque" && (
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Cheque Date" type="date" name="chequeDate" value={expense.chequeDate} onChange={handleInputChange} InputLabelProps={{ shrink: true }} margin="normal" />
                </Grid>
              )}

              {/* ✅ Image Upload */}
              {(expense.paymentMethod === "online" || expense.paymentMethod === "cheque") && (
                <Grid item xs={12}>
                  <TextField type="file" fullWidth onChange={handleImageChange} margin="normal" />
                  {imagePreview && <img src={imagePreview} alt="Preview" style={{ width: "100%", maxHeight: "200px", marginTop: "10px" }} />}
                </Grid>
              )}
            </Grid>


          </form>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" onClick={addExpense}>
            Add Expense
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={toggleExpenseModal}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ViewExpenses;

