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
import { getBanks } from "../../redux/features/Bank/bankSlice";
import axios from "axios";
import CustomTable from "../../components/CustomTable/CustomTable";

const ITEMS_PER_PAGE = 10;

const KIND_LABEL = {
  expense: "Expense",
  purchase: "Purchase",
  sale: "Sale",
  customer_manual: "Customer Txn",
  supplier_manual: "Supplier Txn",
  stock_arrival: "Stock Arrival",
};

const ViewExpenses = () => {
  const dispatch = useDispatch();
  const banks = useSelector((s) => s.bank.banks || []);

  const [entries, setEntries] = useState([]); // daily-book rows
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

  // API base
  const RAW = process.env.REACT_APP_BACKEND_URL || "";
  const BASE = RAW.endsWith("/") ? RAW : `${RAW}/`;
  const API_URL = `${BASE}api`;

  /* -------------------------------- effects -------------------------------- */
  useEffect(() => {
    dispatch(getBanks());
  }, [dispatch]);

  useEffect(() => {
    // fetch daily-book whenever date changes
    fetchDailyBook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    filterEntriesByDate(); // in practice daily-book already scoped by day, but keep this to compute running balance
  }, [entries, selectedDate]);

  /* ----------------------------- fetch daily-book ---------------------------- */
  const fetchDailyBook = async () => {
    try {
      const from = selectedDate;
      const to = selectedDate;

      const { data } = await axios.get(
        `${API_URL}/daily/daily-book?from=${from}&to=${to}`,
        { withCredentials: true }
      );

      const rows = (data?.rows || []).map((r) => ({
        id: r._id,
        date: new Date(r.date),
        type: KIND_LABEL[r.kind] || r.kind,
        rawKind: r.kind,
        name: r.productName || r.description || r.counterpartyName || "-",
        description: r.description || "",
        amount: Number(r.amount) || 0, // already signed from API
        paymentMethod: r.paymentMethod || "-",
        bankID: r.bankID || null,
        chequeDate: r.chequeDate || null,
        quantity: r.quantity ?? "",
        counterparty: r.counterpartyName || "-",
        raw: r,
      }));

      setEntries(rows.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error("❌ Error fetching daily book:", err);
      setEntries([]);
    }
  };

  /* -------------------------------- form stuff ------------------------------- */
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
    if (row.type !== "Expense") return;
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
    fd.append("amount", String(amt)); // send positive; backend handles sign/posting
    fd.append("description", desc);
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
        await axios.post(`${API_URL}/expenses/add`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        });
        alert("Expense added");
      }

      setShowExpenseModal(false);
      setEditingId(null);

      dispatch(getBanks());       // refresh balances
      await fetchDailyBook();     // refresh daily book grid
    } catch (e) {
      console.error("Save expense failed:", e?.response?.data || e);
      alert(e?.response?.data?.message || "Failed to save expense");
    }
  };

  const deleteExpense = async (row) => {
    if (row.type !== "Expense") return;
    if (!window.confirm("Delete this expense?")) return;

    try {
      await axios.delete(`${API_URL}/expenses/${row.id}`, {
        withCredentials: true,
      });

      dispatch(getBanks());
      await fetchDailyBook();
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

  /* --------------------------------- filter -------------------------------- */
  const calculateRunningBalance = (entriesList) => {
    let balance = 0;
    const reversed = [...entriesList].reverse(); // oldest -> newest
    const withBalance = reversed.map((entry) => {
      balance += entry.amount;
      return { ...entry, balance };
    });
    setRunningBalance(balance);
    return withBalance.reverse(); // newest first for grid
  };

  const toLocalYMD = (d) => {
    const dt = new Date(d);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const filterEntriesByDate = () => {
    const sel = selectedDate; // "YYYY-MM-DD" — API already filtered but keep this
    const filtered = entries
      .filter((entry) => toLocalYMD(entry.date) === sel)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const withBalance = calculateRunningBalance(filtered);
    setFilteredEntries(withBalance);
    setTotalPages(Math.ceil(withBalance.length / ITEMS_PER_PAGE));
    setPage(1);
  };

  /* --------------------------------- table --------------------------------- */
  const columns = [
    {
      field: "date",
      headerName: "Date",
      renderCell: (row) => new Date(row.date).toLocaleString(),
    },
    { field: "type", headerName: "Type" },
    { field: "name", headerName: "Name", renderCell: (row) => row.name || "-" },
    { field: "description", headerName: "Description" },
    { field: "quantity", headerName: "Qty" },
    { field: "counterparty", headerName: "Counterparty" },
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
      headerName: "Running Balance",
      renderCell: (row) => (Number.isFinite(row.balance) ? row.balance.toFixed(2) : ""),
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
      key: `${entry.id}-${entry.date}-${entry.description}`,
    }));

  /* --------------------------------- render -------------------------------- */
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
            Daily Book for {new Date(selectedDate).toDateString()}
          </Typography>
          <Typography variant="h6" gutterBottom>
            Daily Balance: {runningBalance.toFixed(2)}
          </Typography>

          {filteredEntries.length === 0 ? (
            <Typography variant="body1">No entries for the selected date.</Typography>
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
