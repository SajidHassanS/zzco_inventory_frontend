// src/pages/ViewExpenses.jsx
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
  IconButton,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useDispatch, useSelector } from "react-redux";
import { getProducts } from "../../redux/features/product/productSlice";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { getCustomers } from "../../redux/features/cutomer/customerSlice";
import { getSuppliers } from "../../redux/features/supplier/supplierSlice";
import axios from "axios";
import CustomTable from "../../components/CustomTable/CustomTable";

const ITEMS_PER_PAGE = 10;

const ViewExpenses = () => {
  const dispatch = useDispatch();
  const { products } = useSelector((s) => s.product);
  const banks = useSelector((s) => s.bank.banks || []);

  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

  // Safe API base
  const RAW = process.env.REACT_APP_BACKEND_URL || "";
  const BASE = RAW.endsWith("/") ? RAW : `${RAW}/`;
  const API_URL = `${BASE}api`;

  useEffect(() => {
    dispatch(getProducts());
    dispatch(getCustomers());
    dispatch(getSuppliers());
    dispatch(getBanks());
    fetchSales();
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    filterEntriesByDate();
  }, [selectedDate, ledgerEntries]);

  // ---------- FETCH DATA ----------
  const fetchSales = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/sales`, {
        withCredentials: true,
      });
      const salesData = data.map((sale) => ({
        id: `sale-${sale._id}`,
        type: "Sale",
        name: sale.productID ? sale.productID.name : "Unknown Product",
        amount: Math.abs(Number(sale.totalSaleAmount) || 0), // positive
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
      const { data } = await axios.get(`${API_URL}/expenses/all`, {
        withCredentials: true,
      });

      const expensesData = data.map((exp) => ({
        id: exp._id,
        type: "Expense",
        name: exp.expenseName,
        amount: Number(exp.amount), // backend already stores as negative
        date: new Date(exp.expenseDate || exp.createdAt),
        description: exp.description,
        paymentMethod: exp.paymentMethod,
        bankID: exp.bankID || null,
        chequeDate: exp.chequeDate || null,
        raw: exp,
      }));

      updateLedger(expensesData);
    } catch (err) {
      console.error("❌ Error fetching expenses:", err);
    }
  };

  const updateLedger = (newEntries) => {
    setLedgerEntries((prev) => {
      const merged = [...prev];
      newEntries.forEach((e) => {
        if (!merged.some((x) => x.id === e.id)) merged.push(e);
      });
      return merged.sort((a, b) => new Date(b.date) - new Date(a.date));
    });
  };

  // purchases
  useEffect(() => {
    if (products.length > 0) {
      const purchaseEntries = products.map((p) => ({
        id: `purchase-${p._id}`,
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

  // ---------- FORM ----------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setExpense((prev) => ({
      ...prev,
      [name]: name === "amount" ? (value === "" ? "" : Number(value)) : value,
    }));

    if (name === "paymentMethod" && (value === "cash" || value === "credit")) {
      setExpense((prev) => ({
        ...prev,
        expenseDate: new Date().toISOString().split("T")[0],
        chequeDate: "",
        bankID: "",
        image: null,
      }));
      setImagePreview("");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setExpense((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const openAdd = () => {
    setEditingId(null);
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
    setShowExpenseModal(true);
  };

  const openEdit = (row) => {
    if (row.type !== "Expense") {
      alert("Only Expense rows are editable here.");
      return;
    }
    setEditingId(row.id);
    setExpense({
      expenseName: row.name,
      amount: Math.abs(Number(row.amount) || 0),
      description: row.description || "",
      expenseDate: new Date(row.date).toISOString().split("T")[0],
      paymentMethod: row.paymentMethod || "cash",
      bankID: row.bankID || "",
      chequeDate: row.chequeDate
        ? new Date(row.chequeDate).toISOString().slice(0, 10)
        : "",
      image: null,
    });
    setImagePreview("");
    setShowExpenseModal(true);
  };

  // helper: create a bank subtract transaction
  const postBankSubtract = (bankId, amount, description, expenseId) => {
    return axios.post(
      `${API_URL}/banks/${String(bankId)}/transactions`,
      {
        type: "subtract",
        amount: Number(amount), // positive; backend subtracts
        description,
        expenseId,
      },
      { withCredentials: true }
    );
  };

  const saveExpense = async () => {
    const name = String(expense.expenseName || "").trim();
    const desc = String(expense.description || "").trim();
    const amt = Number(expense.amount);
    const method = String(expense.paymentMethod || "").toLowerCase();
    const isBank = method === "online" || method === "cheque";
    const bankId = isBank ? String(expense.bankID || "") : "";

    if (!name || !desc || !Number.isFinite(amt) || amt <= 0) {
      alert("Please fill all required fields (name, description, amount > 0).");
      return;
    }
    if (isBank && !bankId) {
      alert("Please select a bank for online/cheque payments.");
      return;
    }

    const fd = new FormData();
    fd.append("expenseName", name);

    // send positive amount; backend persists as negative
    fd.append("amount", String(amt));

    fd.append(
      "description",
      desc
    );
    fd.append(
      "expenseDate",
      expense.expenseDate || new Date().toISOString().slice(0, 10)
    );
    fd.append("paymentMethod", method || "cash");
    if (isBank) fd.append("bankID", bankId);
    if (method === "cheque" && expense.chequeDate)
      fd.append("chequeDate", expense.chequeDate);
    if (expense.image) fd.append("image", expense.image);

    try {
      if (editingId) {
        await axios.put(`${API_URL}/expenses/${editingId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        });
        alert("Expense updated");
      } else {
        const created = await axios.post(`${API_URL}/expenses/add`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        });

        if (isBank) {
          await postBankSubtract(
            bankId,
            amt,
            `Expense: ${name}`,
            created?.data?._id
          );
        }

        alert("Expense added");
      }

      setShowExpenseModal(false);
      setEditingId(null);

      // refresh
      setLedgerEntries([]);
      await fetchSales();
      await fetchExpenses();
      dispatch(getProducts());
      dispatch(getBanks());
    } catch (e) {
      console.error("Save expense failed:", e?.response?.data || e);
      alert(e?.response?.data?.message || "Failed to save expense");
    }
  };

  const deleteExpense = async (row) => {
    if (row.type !== "Expense") {
      alert("Only Expense rows can be deleted here.");
      return;
    }
    if (!window.confirm("Delete this expense?")) return;

    try {
      await axios.delete(`${API_URL}/expenses/${row.id}`, {
        withCredentials: true,
      });

      setLedgerEntries((prev) => prev.filter((e) => e.id !== row.id));
      await fetchExpenses();
      dispatch(getBanks());
      alert("Expense deleted");
    } catch (e) {
      console.error("Delete failed:", e?.response?.data || e);
      alert(e?.response?.data?.message || "Delete failed");
    }
  };

  const toggleExpenseModal = () => {
    setShowExpenseModal(!showExpenseModal);
    if (showExpenseModal) {
      setEditingId(null);
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
    }
  };

  // ---------- FILTER ----------
  const calculateRunningBalance = (entries) => {
    let balance = 0;
    const reversed = [...entries].reverse();
    const withBalance = reversed.map((entry) => {
      balance += entry.amount;
      return { ...entry, balance };
    });
    setRunningBalance(balance);
    return withBalance.reverse();
  };

  // Local date helper (avoid UTC shift issues)
  const toLocalYMD = (d) => {
    const dt = new Date(d);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const filterEntriesByDate = () => {
    const sel = selectedDate; // "YYYY-MM-DD" from date input (local)
    const filtered = ledgerEntries
      .filter((entry) => toLocalYMD(entry.date) === sel)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const withBalance = calculateRunningBalance(filtered);
    setFilteredEntries(withBalance);
    setTotalPages(Math.ceil(withBalance.length / ITEMS_PER_PAGE));
    setPage(1);
  };

  // ---------- TABLE ----------
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
        row.name || row.expenseName || (row.productID && row.productID.name) || "-",
    },
    { field: "type", headerName: "Type" },
    { field: "description", headerName: "Description" },
    {
      field: "debit",
      headerName: "Debit",
      renderCell: (row) =>
        row.amount < 0 ? (
          <span style={{ color: "red" }}>{Math.abs(row.amount).toFixed(2)}</span>
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
    {
      field: "actions",
      headerName: "Actions",
      renderCell: (row) =>
        row.type === "Expense" ? (
          <Box>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => openEdit(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                sx={{ color: "red", ml: 0.5 }}
                onClick={() => deleteExpense(row)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : null,
    },
  ];

  const rows = filteredEntries
    .slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
    .map((entry) => ({
      ...entry,
      debit: entry.amount,
      credit: entry.amount,
      key: `${entry.id}-${entry.date}-${entry.description}`,
    }));

  // ---------- RENDER ----------
  return (
    <Container>
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mb={2}>
        <TextField
          label="Select Date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" color="primary" onClick={openAdd}>
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
            <CustomTable
              columns={columns}
              data={rows}
              page={page - 1}
              rowsPerPage={rowsPerPage}
              onPageChange={(e, newPage) => setPage(newPage + 1)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Expense Modal */}
      <Dialog open={showExpenseModal} onClose={toggleExpenseModal} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? "Edit Expense" : "Add Expense"}</DialogTitle>
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

              {(expense.paymentMethod === "online" || expense.paymentMethod === "cheque") && (
                <Grid item xs={12}>
                  <TextField type="file" fullWidth onChange={handleImageChange} margin="normal" />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: "100%", maxHeight: 200, marginTop: 10 }}
                    />
                  )}
                </Grid>
              )}
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" onClick={saveExpense}>
            {editingId ? "Save Changes" : "Add Expense"}
          </Button>
          <Button variant="outlined" color="secondary" onClick={toggleExpenseModal}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ViewExpenses;
