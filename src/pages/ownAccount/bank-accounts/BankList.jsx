import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import axios from "axios";
import ConfirmDeleteModal from "../../../components/Models/ConfirmDeleteModal";
import EditBankModal from "../../../components/Models/EditBankModal";
import CustomTable from "../../../components/CustomTable/OwnAccount";
import { useSelector } from "react-redux";
import { selectCanDelete } from "../../../redux/features/auth/authSlice";
import TransactionHistoryModal from "../../../components/Models/TransactionModal";
import CashTransactionHistoryModal from "../../../components/Models/CashTransactionModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://13.60.223.186:5000/";
const API_BASE = `${BACKEND_URL}api`;

const BankList = ({ banks = [], refreshBanks, cash }) => {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryType, setEntryType] = useState("bank");
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);

  // report selection (monthly/yearly)
  const [reportType, setReportType] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const canDelete = useSelector(selectCanDelete);

  // We still fetch expenses (used only for display fallback for cash)
  const [expenses, setExpenses] = useState([]);

  // Bank transactions cache (source of truth for bank expenses)
  const [bankTransactions, setBankTransactions] = useState([]);

  useEffect(() => {
    const fetchBankTransactions = async () => {
      try {
        let allTx = [];
        for (const bank of banks) {
          const res = await axios.get(`${API_BASE}/banks/${bank._id}/transactions`, {
            withCredentials: true,
          });
          const txns = res.data || [];
          allTx = [...allTx, ...txns.map(t => ({ ...t, bankID: bank._id }))];
        }
        setBankTransactions(allTx);
      } catch (err) {
        console.error("❌ Failed to fetch bank transactions:", err);
        setBankTransactions([]);
      }
    };

    if (banks.length) fetchBankTransactions();
  }, [banks]);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/expenses/all`, {
          withCredentials: true,
        });
        setExpenses(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to fetch expenses", e);
        setExpenses([]);
      }
    };
    fetchExpenses();
  }, []);

  // ===== helpers for date filters =====
  const isInSelectedPeriod = (isoDate) => {
    const d = new Date(isoDate);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (reportType === "monthly") return y === selectedYear && m === selectedMonth;
    if (reportType === "yearly") return y === selectedYear;
    return true;
  };

  const isCashOutType = (type) => {
    const t = (type || "").toLowerCase();
    return t === "deduct" || t === "subtract" || t === "withdraw" || t === "expense";
  };

  // ===== CASH (source of truth = your cash module) =====
  const filteredCashTransactions = useMemo(() => {
    return (cash?.allEntries || []).filter(t =>
      isInSelectedPeriod(t.createdAt || t.date)
    );
  }, [cash, reportType, selectedYear, selectedMonth]);

  const totalCashAdds = useMemo(() => {
    return filteredCashTransactions.reduce((sum, t) =>
      (t.type || "").toLowerCase() === "add"
        ? sum + (Number(t.balance) || 0)
        : sum, 0);
  }, [filteredCashTransactions]);

  const totalCashDeductsFromModule = useMemo(() => {
    // Count any “cash out” types your module might use
    return filteredCashTransactions.reduce((sum, t) =>
      isCashOutType(t.type)
        ? sum + Math.abs(Number(t.balance) || 0)
        : sum, 0);
  }, [filteredCashTransactions]);

  // ✅ Available cash = module adds − module deducts (no /expenses subtraction)
  const availableCashBalance = useMemo(() => {
    return totalCashAdds - totalCashDeductsFromModule;
  }, [totalCashAdds, totalCashDeductsFromModule]);

  // ---- DISPLAY “Cash Expenses” ----
  // 1) Prefer the module's cash-out total
  // 2) If it’s zero (i.e., module didn’t create deduction rows),
  //    FALLBACK to /expenses of paymentMethod==='cash' for display ONLY
  const cashExpensesFromExpensesApi = useMemo(() => {
    return (expenses || [])
      .filter(
        (e) =>
          (e.paymentMethod || "").toLowerCase() === "cash" &&
          isInSelectedPeriod(e.expenseDate || e.createdAt)
      )
      .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);
  }, [expenses, reportType, selectedYear, selectedMonth]);

  const cashExpensesDisplay = useMemo(() => {
    return totalCashDeductsFromModule > 0
      ? totalCashDeductsFromModule
      : cashExpensesFromExpensesApi;
  }, [totalCashDeductsFromModule, cashExpensesFromExpensesApi]);

  // ===== BANK (source of truth = bank transactions) =====
  const filteredBankTx = useMemo(() => {
    return (bankTransactions || [])
      .filter(tx => isInSelectedPeriod(tx.createdAt || tx.date))
      .filter(tx => (tx.type || "").toLowerCase() === "subtract");
  }, [bankTransactions, reportType, selectedYear, selectedMonth]);

  // Per-bank expense map from bank transactions ONLY
  const bankExpenseMap = useMemo(() => {
    const map = new Map();
    filteredBankTx.forEach(tx => {
      const bid = tx.bankID?._id || tx.bankID;
      const amt = Math.abs(Number(tx.amount) || 0);
      if (bid) map.set(bid, (map.get(bid) || 0) + amt);
    });
    return map;
  }, [filteredBankTx]);

  const totalBankExpenses = useMemo(() => {
    return filteredBankTx.reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
  }, [filteredBankTx]);

  // Bank total balance (as stored in bank docs)
  const totalBankBalance = useMemo(() => {
    return (banks || []).reduce((total, bank) => total + (Number(bank.balance) || 0), 0);
  }, [banks]);

  // ===== tables =====
  const bankColumns = [
    { field: "bankName", headerName: "Bank Name" },
    { field: "balance", headerName: "Balance", align: "right" },
    {
      field: "expenses",
      headerName: "Expenses",
      align: "right",
      renderCell: (row) => {
        const id = row._id;
        const exp = bankExpenseMap.get(id) || 0;
        return exp.toFixed(2);
      },
    },
  ];

  const cashColumns = [
    {
      field: "createdAt",
      headerName: "Date",
      valueGetter: (params) =>
        new Date(params.row.createdAt).toISOString().slice(0, 10),
    },
    { field: "balance", headerName: "Amount", align: "right" },
    { field: "type", headerName: "Type" },
  ];

  // ===== modals =====
  const handleOpenEditModal = (entry, type) => {
    setSelectedEntry(entry);
    setEntryType(type);
    setEditModalOpen(true);
  };

  const handleOpenDeleteModal = (entry, type) => {
    if (!canDelete) {
      alert("You do not have permission to delete this entry.");
      return;
    }
    setSelectedEntry(entry);
    setEntryType(type);
    setDeleteModalOpen(true);
  };

  const handleOpenTransactionModal = (entry, type) => {
    setSelectedEntry(entry);
    setEntryType(type);
    setTransactionModalOpen(true);
  };

  const closeModals = () => {
    setEditModalOpen(false);
    setDeleteModalOpen(false);
    setTransactionModalOpen(false);
    setSelectedEntry(null);
  };

  return (
    <Box sx={{ margin: 3, bgcolor: "white", borderRadius: 2, padding: 3, width: "auto" }}>
      {/* Report selectors */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <FormControl>
          <InputLabel>Report Type</InputLabel>
          <Select
            value={reportType}
            label="Report Type"
            onChange={(e) => setReportType(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </Select>
        </FormControl>

        {reportType === "monthly" && (
          <FormControl>
            <InputLabel>Month</InputLabel>
            <Select
              value={selectedMonth}
              label="Month"
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              sx={{ minWidth: 140 }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {new Date(2025, i).toLocaleString("default", { month: "long" })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl>
          <InputLabel>Year</InputLabel>
          <Select
            value={selectedYear}
            label="Year"
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            sx={{ minWidth: 140 }}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const y = new Date().getFullYear() - i;
              return (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Box>

      {/* Banks list */}
      <Typography variant="h3" align="center">Banks List</Typography>
      <CustomTable
        columns={bankColumns}
        data={banks || []}
        onEdit={(bank) => handleOpenEditModal(bank, "bank")}
        onDelete={(bank) => handleOpenDeleteModal(bank, "bank")}
        onView={(bank) => handleOpenTransactionModal(bank, "bank")}
        cashtrue={false}
      />

      {/* Cash list */}
      <Typography variant="h3" align="center" mt={3}>
        Cash List
      </Typography>
      <CustomTable
        columns={cashColumns}
        data={filteredCashTransactions}
        onEdit={(cashEntry) => handleOpenEditModal(cashEntry, "cash")}
        onDelete={(cashEntry) => handleOpenDeleteModal(cashEntry, "cash")}
        onView={(cashEntry) => handleOpenTransactionModal(cashEntry, "cash")}
        cashtrue={true}
      />

      {/* Summary row */}
      <Box sx={{ mt: 4, display: "flex", justifyContent: "space-between", gap: 4 }}>
        {/* Bank summary */}
        <Box>
          <Typography variant="h5" sx={{ color: "#388E3C", fontWeight: "bold", mb: 1 }}>
            Available balance in Bank: {totalBankBalance.toFixed(2)}
          </Typography>
          <Typography variant="h6" sx={{ color: "#D32F2F", fontWeight: "bold" }}>
            Bank Expenses: {totalBankExpenses.toFixed(2)}
          </Typography>
        </Box>

        {/* Cash summary */}
        <Box textAlign="right">
          <Typography
            variant="h5"
            sx={{
              color: availableCashBalance >= 0 ? "#1976D2" : "#D32F2F",
              fontWeight: "bold",
              mb: 1,
            }}
          >
            Available Cash Balance: {availableCashBalance.toFixed(2)}
          </Typography>
          <Typography variant="h6" sx={{ color: "#D32F2F", fontWeight: "bold" }}>
            Cash Expenses: {cashExpensesDisplay.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* Modals */}
      {isEditModalOpen && (
        <EditBankModal
          open={isEditModalOpen}
          onClose={closeModals}
          entry={selectedEntry}
          entryType={entryType}
          onSuccess={refreshBanks}
        />
      )}

      {isDeleteModalOpen && (
        <ConfirmDeleteModal
          open={isDeleteModalOpen}
          onClose={closeModals}
          entry={selectedEntry}
          entryType={entryType}
          onSuccess={refreshBanks}
        />
      )}

      {isTransactionModalOpen && entryType === "bank" && (
        <TransactionHistoryModal
          open={isTransactionModalOpen}
          onClose={closeModals}
          entry={selectedEntry}
          entryType="bank"
        />
      )}

      {isTransactionModalOpen && entryType === "cash" && (
        <CashTransactionHistoryModal
          open={isTransactionModalOpen}
          onClose={closeModals}
          cashEntry={selectedEntry}
        />
      )}
    </Box>
  );
};

export default BankList;
