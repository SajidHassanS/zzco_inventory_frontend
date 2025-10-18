// src/pages/ViewExpenses.jsx
import React, { useState, useEffect, useMemo } from "react";
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
  Chip,
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
  warehouse_transfer: "WH Transfer",
};

// non-monetary kinds: ignore in running balance
const NON_MONETARY_KINDS = new Set(["warehouse_transfer", "stock_arrival"]);

const CREDIT_TYPES = new Set(["add", "credit", "deposit"]);
const DEBIT_TYPES = new Set(["subtract", "deduct", "debit", "withdraw", "expense"]);

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const toPM = (v) => (v ?? "").toString().trim().toLowerCase();

const ViewExpenses = () => {
  const dispatch = useDispatch();
  const banks = useSelector((s) => s.bank.banks || []);

  // daily book
  const [entries, setEntries] = useState([]);
  const [transfers, setTransfers] = useState([]);

  // cash / bank
  const [cashData, setCashData] = useState({ totalBalance: 0, allEntries: [] });
  const [bankTxns, setBankTxns] = useState([]);

  // UI-state
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [runningBalance, setRunningBalance] = useState(0);

  // main table pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);

  // transfers table pagination
  const [tPage, setTPage] = useState(1);
  const [tRowsPerPage, setTRowsPerPage] = useState(ITEMS_PER_PAGE);

  // expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
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

  // API base
  const RAW = process.env.REACT_APP_BACKEND_URL || "";
  const BASE = RAW.endsWith("/") ? RAW : `${RAW}/`;
  const API_URL = `${BASE}api`;

  /* -------------------------------- effects -------------------------------- */
  useEffect(() => {
    dispatch(getBanks());
  }, [dispatch]);

  useEffect(() => {
    fetchDailyBook();
  }, [selectedDate]); // eslint-disable-line

  useEffect(() => {
    // cash & bank lists (independent of daily book)
    fetchCash();
  }, [selectedDate]); // eslint-disable-line

  useEffect(() => {
    fetchBankTransactions();
  }, [banks, selectedDate]); // eslint-disable-line

  useEffect(() => {
    filterEntriesByDate();
  }, [entries, transfers, selectedDate]);

  /* ----------------------------- fetch daily-book ---------------------------- */
  const fetchDailyBook = async () => {
    try {
      const from = selectedDate;
      const to = selectedDate;

      const { data } = await axios.get(
        `${API_URL}/daily/daily-book?from=${from}&to=${to}`,
        { withCredentials: true }
      );

      const all = (data?.rows || []).map((r) => {
        const kind = r.kind;
        const isTransfer = kind === "warehouse_transfer";

        return {
          id: r._id,
          date: new Date(r.date),
          type: KIND_LABEL[kind] || kind,
          rawKind: kind,
          name:
            r.productName ||
            (isTransfer ? "Transfer" : r.description) ||
            r.counterpartyName ||
            "-",
          description:
            r.description ||
            (isTransfer ? `Internal transfer ${r.quantity ?? ""}` : ""),
          amount: Number(r.amount) || 0, // signed
          paymentMethod: r.paymentMethod || "-",
          bankID: r.bankID || null,
          chequeDate: r.chequeDate || null,
          quantity: r.quantity ?? "",
          movement: isTransfer ? r.counterpartyName || "-" : "",
          counterparty: r.counterpartyName || "-",
          fromWarehouseName: r.fromWarehouseName || null,
          toWarehouseName: r.toWarehouseName || null,
          productSku: r.productSku || null,
          raw: r,
        };
      });

      const tOnly = all
        .filter((x) => x.rawKind === "warehouse_transfer")
        .sort((a, b) => b.date - a.date);

      const notTransfers = all
        .filter((x) => x.rawKind !== "warehouse_transfer")
        .sort((a, b) => b.date - a.date);

      setTransfers(tOnly);
      setEntries(notTransfers);
    } catch (err) {
      console.error("❌ Error fetching daily book:", err);
      setTransfers([]);
      setEntries([]);
    }
  };

  /* ------------------------------- fetch cash -------------------------------- */
 const fetchCash = async () => {
  try {
    const { data } = await axios.get(`${API_URL}/cash/all`, {
      withCredentials: true,
    });

    // Your controller getCurrentTotalBalance returns:
    // { totalBalance, latestEntry, allEntries }
    const totalBalance = Number(data?.totalBalance ?? 0);
    const allEntries = Array.isArray(data?.allEntries) ? data.allEntries : [];

    setCashData({ totalBalance, allEntries });
  } catch (e) {
    console.error("❌ Failed to fetch cash from /api/cash/all", e?.response?.data || e);
    setCashData({ totalBalance: 0, allEntries: [] });
  }
};

  /* --------------------------- fetch bank transactions ----------------------- */
  const fetchBankTransactions = async () => {
    try {
      if (!banks?.length) {
        setBankTxns([]);
        return;
      }
      let all = [];
      for (const bank of banks) {
        const { data } = await axios.get(
          `${API_URL}/banks/${bank._id}/transactions`,
          { withCredentials: true }
        );
        const txns = Array.isArray(data) ? data : [];
        // stash bank id/name for rendering
        all = all.concat(
          txns.map((t) => ({
            ...t,
            bankID: bank._id,
            bankName: bank.bankName,
          }))
        );
      }
      setBankTxns(all);
    } catch (e) {
      console.error("❌ Failed fetching bank transactions", e?.response?.data || e);
      setBankTxns([]);
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
    const method = toPM(expense.paymentMethod || "");
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
    fd.append("amount", String(amt));
    fd.append("description", desc);
    fd.append("expenseDate", expense.expenseDate || new Date().toISOString().slice(0, 10));
    fd.append("paymentMethod", method || "cash");
    if (isBank) fd.append("bankID", bankId);
    if (method === "cheque" && expense.chequeDate) fd.append("chequeDate", expense.chequeDate);
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
      dispatch(getBanks());
      await Promise.all([fetchDailyBook(), fetchCash(), fetchBankTransactions()]);
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
      await Promise.all([fetchDailyBook(), fetchCash(), fetchBankTransactions()]);
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

  /* -------------------------------- helpers --------------------------------- */
  const toLocalYMD = (d) => {
    const dt = new Date(d);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // running balance only over monetary rows
  const calculateRunningBalance = (entriesList) => {
    let balance = 0;
    const oldestToNewest = [...entriesList].reverse();

    const withBalance = oldestToNewest.map((entry) => {
      const isMoney = !NON_MONETARY_KINDS.has(entry.rawKind);
      if (isMoney) balance += entry.amount;
      return { ...entry, balance: isMoney ? balance : undefined };
    });

    setRunningBalance(balance);
    return withBalance.reverse();
  };

  const filterEntriesByDate = () => {
    const sel = selectedDate;
    const filtered = entries
      .filter((entry) => toLocalYMD(entry.date) === sel)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const withBalance = calculateRunningBalance(filtered);
    setFilteredEntries(withBalance);
    setPage(1);
    setTPage(1);
  };

  /* ------------------------------ main table cols --------------------------- */
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
    {
      field: "movement",
      headerName: "Movement / Counterparty",
      renderCell: (row) => row.movement || row.counterparty || "-",
    },
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
      renderCell: (row) =>
        Number.isFinite(row.balance) ? row.balance.toFixed(2) : "",
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

  /* --------------------------- transfers table cols -------------------------- */
  const tColumns = [
    {
      field: "date",
      headerName: "Date",
      renderCell: (row) => new Date(row.date).toLocaleString(),
    },
    { field: "from", headerName: "From", renderCell: (r) => r.from || "-" },
    { field: "to", headerName: "To", renderCell: (r) => r.to || "-" },
    { field: "product", headerName: "Product", renderCell: (r) => r.product || "-" },
    { field: "qty", headerName: "Qty" },
    { field: "note", headerName: "Note", renderCell: (r) => r.note || "" },
  ];

  const tRowsForDay = useMemo(() => {
    return transfers
      .filter((t) => toLocalYMD(t.date) === selectedDate)
      .sort((a, b) => b.date - a.date)
      .map((t) => ({
        id: t.id,
        date: t.date,
        from: t.fromWarehouseName || (t.movement?.split("→")[0]?.trim() || "-"),
        to: t.toWarehouseName || (t.movement?.split("→")[1]?.trim() || "-"),
        product: t.name || t.productSku || "-",
        qty: t.quantity ?? "",
        note: t.description || "",
      }));
  }, [transfers, selectedDate]);

  const tRowsPaged = tRowsForDay.slice(
    (tPage - 1) * tRowsPerPage,
    tPage * tRowsPerPage
  );

  /* ------------------------ CASH MOVEMENTS (this day) ----------------------- */
// ✅ replace your cashRowsForDay useMemo with this more robust version
const cashRowsForDay = useMemo(() => {
  const day = selectedDate;
  const asc = [...(cashData.allEntries || [])]
    .map((c) => {
      const when = c.effectiveDate || c.createdAt || c.date || c.updatedAt || Date.now();
      return { ...c, _ts: new Date(when) };
    })
    .filter((c) => toLocalYMD(c._ts) === day)
    .sort((a, b) => a._ts - b._ts); // oldest -> newest

  let bal = 0;
  const out = asc.map((c) => {
    const type = toPM(c.type);
    const amt = Math.abs(toNum(c.balance));
    const credit = CREDIT_TYPES.has(type) ? amt : 0;
    const debit  = DEBIT_TYPES.has(type) ? amt : 0;
    bal += credit - debit;

    return {
      id: c._id,
      date: c._ts,
      type,
      description: c.description || "-",
      debit,
      credit,
      running: bal,
    };
  });

  return out.reverse(); // newest first in the table
}, [cashData, selectedDate]);

  const cashColumns = [
    { field: "date", headerName: "Date", renderCell: (r) => r.date.toLocaleString() },
    { field: "type", headerName: "Type" },
    { field: "description", headerName: "Description" },
    {
      field: "debit",
      headerName: "Debit",
      renderCell: (r) =>
        r.debit ? <span style={{ color: "red" }}>{r.debit.toFixed(2)}</span> : "",
    },
    {
      field: "credit",
      headerName: "Credit",
      renderCell: (r) =>
        r.credit ? <span style={{ color: "green" }}>{r.credit.toFixed(2)}</span> : "",
    },
    {
      field: "running",
      headerName: "Day Running",
      renderCell: (r) => r.running?.toFixed(2),
    },
  ];

  /* ---------------------- BANK TRANSACTIONS (this day) ---------------------- */
  const bankRowsForDay = useMemo(() => {
    const day = selectedDate;
    // group by bank, but we show a flat list; compute day-running per bank
    const byBank = new Map();
    for (const tx of bankTxns) {
      const d = new Date(tx.date || tx.createdAt || 0);
      if (toLocalYMD(d) !== day) continue;
      const list = byBank.get(tx.bankID) || [];
      list.push({ ...tx, _date: d });
      byBank.set(tx.bankID, list);
    }

    const out = [];
    for (const [bankId, list] of byBank) {
      list.sort((a, b) => a._date - b._date); // oldest->newest for running
      let bal = 0;
      for (const t of list) {
        const ttype = toPM(t.type);
        const amt = Math.abs(toNum(t.amount));
        const credit = CREDIT_TYPES.has(ttype) ? amt : 0;
        const debit = DEBIT_TYPES.has(ttype) ? amt : 0;
        bal += credit - debit;
        out.push({
          id: t._id,
          date: t._date,
          bankName: t.bankName || (banks.find((b) => String(b._id) === String(bankId))?.bankName || "-"),
          type: t.type,
          description: t.description || "-",
          debit,
          credit,
          running: bal,
        });
      }
    }
    // newest first overall
    return out.sort((a, b) => b.date - a.date);
  }, [bankTxns, banks, selectedDate]);

  const bankColumns = [
    { field: "date", headerName: "Date", renderCell: (r) => r.date.toLocaleString() },
    { field: "bankName", headerName: "Bank" },
    {
      field: "type",
      headerName: "Type",
      renderCell: (row) => {
        const t = toPM(row.type);
        if (t.startsWith("reversal")) {
          return (
            <Chip size="small" label="Reversal" variant="outlined" sx={{ fontWeight: 600 }} />
          );
        }
        return row.type;
      },
    },
    { field: "description", headerName: "Description" },
    {
      field: "debit",
      headerName: "Debit",
      renderCell: (r) =>
        r.debit ? <span style={{ color: "red" }}>{r.debit.toFixed(2)}</span> : "",
    },
    {
      field: "credit",
      headerName: "Credit",
      renderCell: (r) =>
        r.credit ? <span style={{ color: "green" }}>{r.credit.toFixed(2)}</span> : "",
    },
    {
      field: "running",
      headerName: "Bank Day Running",
      renderCell: (r) => r.running?.toFixed(2),
    },
  ];

  /* --------------------------------- render -------------------------------- */
  return (
    <Container>
      {/* Date & Add Expense */}
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

      {/* =========================== Main Daily Book =========================== */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Daily Book for {new Date(selectedDate).toDateString()}
          </Typography>
          <Typography variant="h6" gutterBottom>
            Daily Balance (monetary only): {runningBalance.toFixed(2)}
          </Typography>

          {filteredEntries.length === 0 ? (
            <Typography variant="body1">No entries for the selected date.</Typography>
          ) : (
            <CustomTable
              columns={columns}
              data={rows}
              page={page - 1}
              rowsPerPage={rowsPerPage}
              onPageChange={(_e, newPage) => setPage(newPage + 1)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* ======================== Warehouse Transfers ========================= */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Warehouse Transfers ({new Date(selectedDate).toDateString()})
          </Typography>

          {tRowsForDay.length === 0 ? (
            <Typography variant="body1">No transfers for the selected date.</Typography>
          ) : (
            <CustomTable
              columns={tColumns}
              data={tRowsPaged}
              page={tPage - 1}
              rowsPerPage={tRowsPerPage}
              onPageChange={(_e, newPage) => setTPage(newPage + 1)}
              onRowsPerPageChange={(e) => {
                setTRowsPerPage(parseInt(e.target.value, 10));
                setTPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* ============================ Cash Movements =========================== */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Cash Movements ({new Date(selectedDate).toDateString()})
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Current Cash Total: {Number(cashData.totalBalance || 0).toFixed(2)}
          </Typography>

          {cashRowsForDay.length === 0 ? (
            <Typography variant="body1">No cash movements for the selected date.</Typography>
          ) : (
            <CustomTable
              columns={cashColumns}
              data={cashRowsForDay}
              page={0}
              rowsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </CardContent>
      </Card>

      {/* =========================== Bank Transactions ========================= */}
      <Card sx={{ mt: 3, mb: 6 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Bank Transactions ({new Date(selectedDate).toDateString()})
          </Typography>

          {bankRowsForDay.length === 0 ? (
            <Typography variant="body1">No bank transactions for the selected date.</Typography>
          ) : (
            <CustomTable
              columns={bankColumns}
              data={bankRowsForDay}
              page={0}
              rowsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </CardContent>
      </Card>

      {/* ========================= Add / Edit Expense ========================== */}
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
