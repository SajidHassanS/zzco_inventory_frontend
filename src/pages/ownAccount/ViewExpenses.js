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
// utils (top of file)
const toLocalYMD = (d = new Date()) => {
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
const ITEMS_PER_PAGE = 10;

const KIND_LABEL = {
  expense: "Expense",
  purchase: "Purchase",
  sale: "Sale",
  customer_manual: "Customer Txn",
  supplier_manual: "Supplier Txn",
  stock_arrival: "Stock Arrival",
  warehouse_transfer: "WH Transfer",
  product_return: "Product Return",
  return_to_supplier: "Return → Supplier",    // ✅ NEW
  return_from_customer: "Return ← Customer",  // ✅ NEW
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

const [selectedDate, setSelectedDate] = useState(toLocalYMD());
  const [filteredEntries, setFilteredEntries] = useState([]);
  // const [runningBalance, setRunningBalance] = useState(0);

  // main table pagination
  const [page, setPage] = useState(1); // 1-based local
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);

  // transfers table pagination
  const [tPage, setTPage] = useState(1);
  const [tRowsPerPage, setTRowsPerPage] = useState(ITEMS_PER_PAGE);

  // cash table pagination
  const [cPage, setCPage] = useState(1);
  const [cRowsPerPage, setCRowsPerPage] = useState(ITEMS_PER_PAGE);

  // bank table pagination
  const [bPage, setBPage] = useState(1);
  const [bRowsPerPage, setBRowsPerPage] = useState(ITEMS_PER_PAGE);

  // expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [expense, setExpense] = useState({
    expenseName: "",
    amount: "",
    description: "",
   expenseDate: toLocalYMD(),
    paymentMethod: "",
    bankID: "",
    chequeDate: "",
    image: null,
  });

  // API base
  const RAW = process.env.REACT_APP_BACKEND_URL || "";
  const BASE = RAW.endsWith("/") ? RAW : `${RAW}/`;
  const API_URL = `${BASE}api`;
// state
const [cashDescById, setCashDescById] = useState({});

// helper: pick the best description from a transaction object
const pickTxnDesc = (tx) => {
  const fields = [
    tx?.description, tx?.note, tx?.details, tx?.remark, tx?.narration,
    tx?.meta?.description, tx?.source?.description, tx?.reference?.description,
    tx?.related?.description, tx?.title, tx?.message, tx?.memo
  ];
  for (const v of fields) {
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return "-";
};
useEffect(() => {
  const day = selectedDate;
  // find entries that fall on this day
  const todays = (cashData.allEntries || [])
    .map(c => {
      const when = c.effectiveDate || c.createdAt || c.date || c.updatedAt;
      return when ? { id: c._id, _ts: new Date(when) } : null;
    })
    .filter(Boolean)
    .filter(c => toLocalYMD(c._ts) === day);

  if (!todays.length) {
    setCashDescById({});
    return;
  }

  let cancelled = false;

  (async () => {
    try {
      const results = await Promise.all(
        todays.map(t =>
          axios
            .get(`${API_URL}/cash/${t.id}/transactions`, { withCredentials: true })
            .then(({ data }) => ({ id: t.id, txns: Array.isArray(data) ? data : [] }))
            .catch(() => ({ id: t.id, txns: [] }))
        )
      );

      const map = {};
      for (const { id, txns } of results) {
        // keep only txns whose date is the selected day
        const sameDay = txns
          .map(tx => ({ ...tx, _d: new Date(tx.date || tx.createdAt || 0) }))
          .filter(tx => toLocalYMD(tx._d) === day)
          .sort((a, b) => b._d - a._d); // newest first

        if (sameDay.length) {
          map[id] = pickTxnDesc(sameDay[0]); // latest txn's description for that cash entry
        }
      }
      if (!cancelled) setCashDescById(map);
    } catch (e) {
      if (!cancelled) setCashDescById({});
    }
  })();

  return () => { cancelled = true; };
}, [API_URL, cashData.allEntries, selectedDate]);

  /* -------------------------------- effects -------------------------------- */
  useEffect(() => {
    dispatch(getBanks());
  }, [dispatch]);

  useEffect(() => {
    fetchDailyBook();
  }, [selectedDate]); // eslint-disable-line

  useEffect(() => {
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
          // ✅ Extra fields for product returns
          refundReceived: r.refundReceived || false,
          returnReason: r.returnReason || null,
          warehouseName: r.warehouseName || null,
          raw: r,
        };
      });

      const tOnly = all
        .filter((x) => x.rawKind === "warehouse_transfer")
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // ✅ Ascending - oldest first

      const notTransfers = all
        .filter((x) => x.rawKind !== "warehouse_transfer")
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // ✅ Ascending - oldest first

      setTransfers(tOnly);
      setEntries(notTransfers);
    } catch (err) {
      console.error("❌ Error fetching daily book:", err);
      setTransfers([]);
      setEntries([]);
    }
  };
const getCashDescription = (c) => {
  // try the cached txn description first
  const descFromTx = cashDescById[c._id];
  if (descFromTx) return descFromTx;

  // fallbacks if your cash doc itself has something
  const fields = [
    c?.description, c?.note, c?.details, c?.remark, c?.narration,
    c?.meta?.description, c?.source?.description, c?.reference?.description,
    c?.related?.description, c?.productName, c?.title, c?.message, c?.memo
  ];
  for (const v of fields) {
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return "-";
};



  /* ------------------------------- fetch cash -------------------------------- */
const fetchCash = async () => {
  try {
    const { data } = await axios.get(`${API_URL}/cash/all`, { withCredentials: true });

    let totalBalance = 0;
    let allEntries = [];

    if (Array.isArray(data)) {
      allEntries = data;
      // If docs have "balance"/"amount", sum a safe numeric field for a total
      totalBalance = data.reduce((sum, c) => sum + Number(c?.balance ?? 0), 0);
    } else {
      totalBalance = Number(data?.totalBalance ?? 0);
      allEntries  = Array.isArray(data?.allEntries) ? data.allEntries : [];
    }

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
        expenseDate: toLocalYMD(),
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
  expenseDate: toLocalYMD(),
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
  fd.append("expenseDate", expense.expenseDate || toLocalYMD());
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
       expenseDate: toLocalYMD(),
        paymentMethod: "",
        bankID: "",
        chequeDate: "",
        image: null,
      });
      setImagePreview("");
    }
  };

  /* -------------------------------- helpers --------------------------------- */



  // running balance only over monetary rows
  // const calculateRunningBalance = (entriesList) => {
  //   let balance = 0;
  //   const oldestToNewest = [...entriesList].reverse();

  //   const withBalance = oldestToNewest.map((entry) => {
  //     const isMoney = !NON_MONETARY_KINDS.has(entry.rawKind);
  //     if (isMoney) balance += entry.amount;
  //     return { ...entry, balance: isMoney ? balance : undefined };
  //   });

  //   setRunningBalance(balance);
  //   return withBalance.reverse();
  // };

const filterEntriesByDate = () => {
  const sel = selectedDate;
  const filtered = entries
    .filter((entry) => toLocalYMD(entry.date) === sel)
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // ✅ Ascending - oldest first

  setFilteredEntries(filtered);
  setPage(1);
  setTPage(1);
  setCPage(1);
  setBPage(1);
};

  /* ------------------------------ main table cols --------------------------- */
  const columns = [
    {
      field: "date",
      headerName: "Date",
      renderCell: (row) => new Date(row.date).toLocaleString(),
    },
   { 
  field: "type", 
  headerName: "Type",
  renderCell: (row) => {
    // ✅ Return TO Supplier
    if (row.rawKind === "return_to_supplier") {
      const status = row.raw?.refundStatus || "pending";
      return (
        <Chip 
          size="small" 
          label={status === "completed" ? "Return → Supplier ✓" : "Return → Supplier"} 
          color={status === "completed" ? "success" : "warning"}
          variant="outlined"
        />
      );
    }
    // ✅ Return FROM Customer
    if (row.rawKind === "return_from_customer") {
      const status = row.raw?.refundStatus || "pending";
      return (
        <Chip 
          size="small" 
          label={status === "completed" ? "Return ← Customer ✓" : "Return ← Customer"} 
          color={status === "completed" ? "info" : "warning"}
          variant="outlined"
        />
      );
    }
    // ✅ Old product_return (backward compatibility)
    if (row.rawKind === "product_return") {
      const status = row.raw?.refundStatus || (row.refundReceived ? "completed" : "pending");
      return (
        <Chip 
          size="small" 
          label={status === "completed" ? "Return ✓" : "Return (Pending)"} 
          color={status === "completed" ? "success" : "warning"}
          variant="outlined"
        />
      );
    }
    return row.type;
  }
},
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
  { 
  field: "paymentMethod", 
  headerName: "Payment Method",
  renderCell: (row) => {
    const status = row.raw?.refundStatus || "pending";
    
    // ✅ Return TO Supplier - we RECEIVE money
    if (row.rawKind === "return_to_supplier") {
      return (
        <Chip 
          size="small" 
          label={status === "completed" ? "Refund Received" : "Pending Refund"} 
          color={status === "completed" ? "success" : "default"}
          variant={status === "completed" ? "filled" : "outlined"}
        />
      );
    }
    // ✅ Return FROM Customer - we PAY money
    if (row.rawKind === "return_from_customer") {
      return (
        <Chip 
          size="small" 
          label={status === "completed" ? "Refund Paid" : "Pending Refund"} 
          color={status === "completed" ? "error" : "default"}
          variant={status === "completed" ? "filled" : "outlined"}
        />
      );
    }
    // ✅ Old product_return (backward compatibility)
    if (row.rawKind === "product_return") {
      return row.refundReceived ? "Received" : "Pending";
    }
    return row.paymentMethod || "-";
  }
},
    // {
    //   field: "balance",
    //   headerName: "Running Balance",
    //   renderCell: (row) =>
    //     Number.isFinite(row.balance) ? Number(row.balance).toFixed(2) : "",
    // },
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

  // MAIN table rows (paged here)
  const mainTotal = filteredEntries.length;
  const mainStart = (page - 1) * rowsPerPage;
  const mainRows = filteredEntries
    .slice(mainStart, mainStart + rowsPerPage)
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
      .sort((a, b) => new Date(a.date) - new Date(b.date)) // ✅ Ascending
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

  const tTotal = tRowsForDay.length;
  const tStart = (tPage - 1) * tRowsPerPage;
  const tRowsPaged = tRowsForDay.slice(tStart, tStart + tRowsPerPage);

  /* ------------------------ CASH MOVEMENTS (this day) ----------------------- */
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
    const amt = Math.abs(toNum(c.amount ?? c.balance));
      const credit = CREDIT_TYPES.has(type) ? amt : 0;
      const debit  = DEBIT_TYPES.has(type) ? amt : 0;
      bal += credit - debit;

      return {
        id: c._id,
        date: c._ts,
        type,
      description: getCashDescription(c),

        debit,
        credit,
        running: bal,
      };
    });

    return out; // ✅ Keep ascending order (oldest first)
  }, [cashData, selectedDate]);

  const cashColumns = [
    { field: "date", headerName: "Date", renderCell: (r) => r.date.toLocaleString() },
    { field: "type", headerName: "Type" },
    { field: "description", headerName: "Description" },
    {
      field: "debit",
      headerName: "Debit",
      renderCell: (r) =>
        r.debit ? <span style={{ color: "red" }}>{Number(r.debit).toFixed(2)}</span> : "",
    },
    {
      field: "credit",
      headerName: "Credit",
      renderCell: (r) =>
        r.credit ? <span style={{ color: "green" }}>{Number(r.credit).toFixed(2)}</span> : "",
    },
    {
      field: "running",
      headerName: "Day Running",
      renderCell: (r) => (Number.isFinite(r.running) ? Number(r.running).toFixed(2) : ""),
    },
  ];

  const cTotal = cashRowsForDay.length;
  const cStart = (cPage - 1) * cRowsPerPage;
  const cashRowsPaged = cashRowsForDay.slice(cStart, cStart + cRowsPerPage);

  /* ---------------------- BANK TRANSACTIONS (this day) ---------------------- */
  const bankRowsForDay = useMemo(() => {
    const day = selectedDate;
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
      list.sort((a, b) => a._date - b._date); // oldest -> newest
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
          bankName:
            t.bankName ||
            (banks.find((b) => String(b._id) === String(bankId))?.bankName || "-"),
          type: t.type,
          description: t.description || "-",
          debit,
          credit,
          running: bal,
        });
      }
    }
    return out.sort((a, b) => a.date - b.date); // ✅ Ascending
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
          return <Chip size="small" label="Reversal" variant="outlined" sx={{ fontWeight: 600 }} />;
        }
        return row.type;
      },
    },
    { field: "description", headerName: "Description" },
    {
      field: "debit",
      headerName: "Debit",
      renderCell: (r) =>
        r.debit ? <span style={{ color: "red" }}>{Number(r.debit).toFixed(2)}</span> : "",
    },
    {
      field: "credit",
      headerName: "Credit",
      renderCell: (r) =>
        r.credit ? <span style={{ color: "green" }}>{Number(r.credit).toFixed(2)}</span> : "",
    },
    {
      field: "running",
      headerName: "Bank Day Running",
      renderCell: (r) => (Number.isFinite(r.running) ? Number(r.running).toFixed(2) : ""),
    },
  ];

  const bTotal = bankRowsForDay.length;
  const bStart = (bPage - 1) * bRowsPerPage;
  const bankRowsPaged = bankRowsForDay.slice(bStart, bStart + bRowsPerPage);

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
          {/* <Typography variant="h6" gutterBottom>
            Daily Balance (monetary only): {Number(runningBalance || 0).toFixed(2)}
          </Typography> */}

          {filteredEntries.length === 0 ? (
            <Typography variant="body1">No entries for the selected date.</Typography>
          ) : (
            <CustomTable
              columns={columns}
              data={mainRows}
              count={mainTotal}
              page={page - 1} // 0-based for MUI
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onPageChange={(_e, newPage) => setPage(newPage + 1)}
              onRowsPerPageChange={(arg) => {
                const newValue = Number(typeof arg === "number" ? arg : arg?.target?.value);
                if (Number.isFinite(newValue) && newValue > 0) {
                  setRowsPerPage(newValue);
                  setPage(1);
                }
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
              count={tTotal}
              page={tPage - 1}
              rowsPerPage={tRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onPageChange={(_e, newPage) => setTPage(newPage + 1)}
              onRowsPerPageChange={(arg) => {
                const newValue = Number(typeof arg === "number" ? arg : arg?.target?.value);
                if (Number.isFinite(newValue) && newValue > 0) {
                  setTRowsPerPage(newValue);
                  setTPage(1);
                }
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

          {cTotal === 0 ? (
            <Typography variant="body1">No cash movements for the selected date.</Typography>
          ) : (
            <CustomTable
              columns={cashColumns}
              data={cashRowsPaged}
              count={cTotal}
              page={cPage - 1}
              rowsPerPage={cRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onPageChange={(_e, newPage) => setCPage(newPage + 1)}
              onRowsPerPageChange={(arg) => {
                const newValue = Number(typeof arg === "number" ? arg : arg?.target?.value);
                if (Number.isFinite(newValue) && newValue > 0) {
                  setCRowsPerPage(newValue);
                  setCPage(1);
                }
              }}
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

          {bTotal === 0 ? (
            <Typography variant="body1">No bank transactions for the selected date.</Typography>
          ) : (
            <CustomTable
              columns={bankColumns}
              data={bankRowsPaged}
              count={bTotal}
              page={bPage - 1}
              rowsPerPage={bRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onPageChange={(_e, newPage) => setBPage(newPage + 1)}
              onRowsPerPageChange={(arg) => {
                const newValue = Number(typeof arg === "number" ? arg : arg?.target?.value);
                if (Number.isFinite(newValue) && newValue > 0) {
                  setBRowsPerPage(newValue);
                  setBPage(1);
                }
              }}
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
