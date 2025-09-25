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
import CustomTable from "../../components/CustomTable/CustomTable";
import { getCustomers } from "../../redux/features/cutomer/customerSlice";
import { getSuppliers } from "../../redux/features/supplier/supplierSlice";

const ITEMS_PER_PAGE = 10;

const ViewExpenses = () => {
  const dispatch = useDispatch();
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const { customers } = useSelector((state) => state.customer);
  const { suppliers } = useSelector((state) => state.supplier);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [sales, setSales] = useState([]);
  const banks = useSelector((state) => state.bank.banks);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expense, setExpense] = useState({
    expenseName: "",
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    bankID: "",
    chequeDate: "",
    image: null,
  });
  const [imagePreview, setImagePreview] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);
  const [totalPages, setTotalPages] = useState(0);
  const [runningBalance, setRunningBalance] = useState(0);

  // ---- SAFE API BASE URL (fixes missing slash bugs) ----
  const RAW = process.env.REACT_APP_BACKEND_URL || "";
  const BASE = RAW.endsWith("/") ? RAW : `${RAW}/`;
  const API_URL = `${BASE}api`;

  // cache resolved bank transaction endpoint (after we probe once)
  const [bankTxnPathTemplate, setBankTxnPathTemplate] = useState(null);
  // common variants your backend might use; we will probe them once
  const bankTxnCandidates = [
    // banks/:id/transactions (what you originally called)
    (id) => `${API_URL}/banks/${id}/transactions`,
    // banks/:id/transaction
    (id) => `${API_URL}/banks/${id}/transaction`,
    // bank/:id/transactions
    (id) => `${API_URL}/bank/${id}/transactions`,
    // banks/transactions/:id
    (id) => `${API_URL}/banks/transactions/${id}`,
    // banks/:id/transactions/add
    (id) => `${API_URL}/banks/${id}/transactions/add`,
  ];

  // try to find which candidate path actually exists (2xx/3xx on OPTIONS/HEAD/GET)
  const resolveBankTxnEndpoint = async (bankId) => {
    if (!bankId) return null;
    if (bankTxnPathTemplate) return bankTxnPathTemplate;

    for (const build of bankTxnCandidates) {
      const url = build(bankId);
      try {
        // Some servers don't allow OPTIONS/HEAD; fall back to GET with harmless params
        const res =
          (await axios.options(url, { withCredentials: true })).status ||
          (await axios.head(url, { withCredentials: true })).status;
        if (res >= 200 && res < 400) {
          setBankTxnPathTemplate(build);
          return build;
        }
      } catch (_) {
        // ignore and try next
      }

      try {
        // Last-ditch: try GET (many routes will 405 here; we only accept 2xx/3xx)
        const res = await axios.get(url, {
          withCredentials: true,
          params: { _probe: 1 },
        });
        if (res.status >= 200 && res.status < 400) {
          setBankTxnPathTemplate(build);
          return build;
        }
      } catch (_) {
        // ignore and continue
      }
    }
    console.error("❌ Could not resolve bank transactions endpoint. Tried:", bankTxnCandidates.map((b) => b("<id>")));
    return null;
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage + 1);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1);
  };

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
      const { data } = await axios.get(`${API_URL}/sales`, {
        withCredentials: true,
      });
      const salesData = data.map((sale) => ({
        ...sale,
        id: sale._id,
        type: "Sale",
        name: sale.productID ? sale.productID.name : "Unknown Product",
        amount: Math.abs(Number(sale.totalSaleAmount) || 0),
        date: new Date(sale.saleDate),
        description: `Sale of ${sale.stockSold} unit(s) of ${
          sale.productID ? sale.productID.name : "Unknown"
        } to ${sale.customerID ? sale.customerID.username : "Unknown"}`,
        paymentMethod: sale.paymentMethod || "N/A",
      }));
      updateLedger(salesData);
    } catch (err) {
      console.error("Error fetching sales:", err);
    }
  };

const fetchExpenses = async () => {
  try {
    const { data } = await axios.get(`${API_URL}/expenses/all`, { withCredentials: true });

    // Normal expenses
    const expensesData = data.map((exp) => ({
      id: exp._id,
      type: "Expense",
      name: exp.expenseName,
      amount: -Math.abs(exp.amount),
      date: new Date(exp.expenseDate || exp.createdAt),
      description: exp.description,
      paymentMethod: exp.paymentMethod,
    }));

    // 👇 Now also pull bank transactions
    const bankTransactions = [];
    for (const bank of banks) {
      try {
        const res = await axios.get(`${API_URL}/banks/${bank._id}/transactions`, { withCredentials: true });
        res.data.forEach((tx) => {
          bankTransactions.push({
            id: tx._id,
            type: "Expense",
            name: `Bank Expense (${bank.bankName})`,
            amount: tx.type === "subtract" ? -Math.abs(tx.amount) : Math.abs(tx.amount),
            date: new Date(tx.createdAt),
            description: tx.description,
            paymentMethod: "bank",
          });
        });
      } catch (err) {
        console.error("Error fetching bank transactions for", bank.bankName, err);
      }
    }

    updateLedger([...expensesData, ...bankTransactions]);
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
            paymentMethod: newEntry.paymentMethod || "N/A",
          });
        }
      });

      return updatedEntries.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
    });
  };

  useEffect(() => {
    if (products.length > 0) {
      const purchaseEntries = products.map((p) => ({
        id: p._id,
        type: "Purchase",
        name: p.name,
        amount: -Math.abs(Number(p.price) * Number(p.quantity) || 0),
        date: new Date(p.createdAt),
        description: `Purchase of ${p.quantity} ${p.name} from ${
          p.supplier ? p.supplier.username : "Unknown"
        } at ${p.price} each`,
        paymentMethod: p.paymentMethod || "N/A",
        category: p.category,
      }));
      updateLedger(purchaseEntries);
    }
  }, [products]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setExpense((prevExpense) => ({
      ...prevExpense,
      [name]: name === "amount" ? parseFloat(value) || "" : value,
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

  // helper to post bank transaction; tries resolved endpoint or probes once
  const postBankSubtract = async (bankId, amount, description) => {
    if (!bankId) throw new Error("No bankId provided");
    const builder =
      bankTxnPathTemplate || (await resolveBankTxnEndpoint(String(bankId)));

    // If we still couldn't resolve, fallback to the original path you used
    const url = builder
      ? builder(String(bankId))
      : `${API_URL}/banks/${String(bankId)}/transactions`;

    // NOTE: if your backend expects different keys, rename below.
    return axios.post(
      url,
      {
        type: "subtract",
        amount: Number(amount),
        description,
      },
      { withCredentials: true }
    );
  };

  const addExpense = async () => {
    if (!expense.expenseName || !expense.amount || !expense.description) {
      alert("Please fill all required fields.");
      return;
    }

    const isBankMethod =
      expense.paymentMethod === "online" ||
      expense.paymentMethod === "cheque";

    if (isBankMethod && !expense.bankID) {
      alert("Please select a bank for online/cheque payments.");
      return;
    }

    const formData = new FormData();
    formData.append("expenseName", expense.expenseName);
    formData.append("amount", String(expense.amount));
    formData.append("description", expense.description);
    formData.append("expenseDate", expense.expenseDate);
    formData.append("paymentMethod", expense.paymentMethod);
    if (isBankMethod) {
      formData.append("bankID", String(expense.bankID));
    }
    if (expense.paymentMethod === "cheque" && expense.chequeDate) {
      formData.append("chequeDate", expense.chequeDate);
    }
    if (expense.image) formData.append("image", expense.image);

    try {
      // 1) Create the expense
      await axios.post(`${API_URL}/expenses/add`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      // 2) If paid from a bank, subtract from that bank too (with endpoint resolution)
      if (isBankMethod) {
        try {
          await postBankSubtract(
            expense.bankID,
            Number(expense.amount),
            `Expense: ${expense.expenseName}`
          );
        } catch (e) {
          console.error("❌ Bank subtraction failed:", e?.response?.data || e.message);
          alert(
            e?.response?.data?.message ||
              "Bank deduction failed (endpoint not found). Check route path on backend."
          );
        }
        // Refresh bank balances in UI either way
        dispatch(getBanks());
      }

      alert("Expense Added Successfully");
      setShowExpenseModal(false);
      // Refresh ledger list
      fetchExpenses();

      // Reset form
      setExpense({
        expenseName: "",
        amount: "",
        description: "",
        expenseDate: new Date().toISOString().split("T")[0],
        paymentMethod: "",
        bankID: "",
        chequeDate: "",
        image: null,
      });
      setImagePreview("");
    } catch (error) {
      console.error("Failed to add expense:", error.response?.data || error.message);
      alert(
        error.response?.data?.message ||
          "Failed to add expense. Please try again."
      );
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
    const reversedEntries = [...entries].reverse();
    const entriesWithBalance = reversedEntries.map((entry) => {
      balance += entry.amount;
      return { ...entry, balance };
    });
    setRunningBalance(balance);
    return entriesWithBalance.reverse();
  };

  useEffect(() => {
    filterEntriesByDate();
  }, [selectedDate, ledgerEntries]);

  const filterEntriesByDate = () => {
    const selectedDateObj = new Date(selectedDate);
    selectedDateObj.setHours(0, 0, 0, 0);

    let filtered = ledgerEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === selectedDateObj.getTime();
    });

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    const entriesWithBalance = calculateRunningBalance(filtered);
    setFilteredEntries(entriesWithBalance);
    setTotalPages(Math.ceil(entriesWithBalance.length / ITEMS_PER_PAGE));
    setPage(1);
  };

  const columns = [
    {
      field: "date",
      headerName: "Date",
      renderCell: (row) => new Date(row.date).toLocaleDateString(),
    },
    {
      field: "name",
      headerName: "Name",
      renderCell: (row) =>
        row.name ||
        row.expenseName ||
        (row.productID && row.productID.name) ||
        "-",
    },
    { field: "type", headerName: "Type" },
    { field: "description", headerName: "Description" },
    {
      field: "debit",
      headerName: "Debit",
      renderCell: (row) =>
        row.amount < 0 ? (
          <span style={{ color: "red" }}>
            {Math.abs(row.amount).toFixed(2)}
          </span>
        ) : (
          ""
        ),
    },
    {
      field: "credit",
      headerName: "Credit",
      renderCell: (row) =>
        row.amount > 0 ? (
          <span style={{ color: "green" }}>{row.amount.toFixed(2)}</span>
        ) : (
          ""
        ),
    },
    { field: "paymentMethod", headerName: "Payment Method" },
    {
      field: "balance",
      headerName: "Total Amount",
      renderCell: (row) => row.balance.toFixed(2),
    },
  ];

  const rows = paginatedEntries.map((entry) => ({
    ...entry,
    debit: entry.amount,
    credit: entry.amount,
    key: `${entry.date}-${entry.description}`,
  }));

  return (
    <Container>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mt={2}
        mb={2}
      >
        <TextField
          label="Select Date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
        />
        <Button variant="contained" color="primary" onClick={toggleExpenseModal}>
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
            <Typography variant="body1">
              No entries found for the selected date.
            </Typography>
          ) : (
            <>
              <CustomTable
                columns={columns}
                data={filteredEntries}
                page={page - 1}
                rowsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
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
                  <Select
                    name="paymentMethod"
                    value={expense.paymentMethod}
                    onChange={handleInputChange}
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

              {(expense.paymentMethod === "online" ||
                expense.paymentMethod === "cheque") && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Bank Name</InputLabel>
                    <Select
                      name="bankID"
                      value={expense.bankID}
                      onChange={handleInputChange}
                    >
                      {banks.map((bank) => (
                        <MenuItem key={bank._id} value={bank._id}>
                          {bank.bankName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {expense.paymentMethod === "cheque" && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Cheque Date"
                    type="date"
                    name="chequeDate"
                    value={expense.chequeDate}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                    margin="normal"
                  />
                </Grid>
              )}

              {(expense.paymentMethod === "online" ||
                expense.paymentMethod === "cheque") && (
                <Grid item xs={12}>
                  <TextField
                    type="file"
                    fullWidth
                    onChange={handleImageChange}
                    margin="normal"
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        width: "100%",
                        maxHeight: "200px",
                        marginTop: "10px",
                      }}
                    />
                  )}
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
