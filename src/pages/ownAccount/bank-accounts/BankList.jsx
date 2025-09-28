import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Button,
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

  // NEW: pull all expenses and cache here
  const [expenses, setExpenses] = useState([]);
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
        // tag with bank id
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

  // helpers
  const isInSelectedPeriod = (isoDate) => {
    const d = new Date(isoDate);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (reportType === "monthly") return y === selectedYear && m === selectedMonth;
    if (reportType === "yearly") return y === selectedYear;
    return true;
  };

  const filterTransactionsByDate = (transactions) =>
    (transactions || []).filter((t) => isInSelectedPeriod(t.createdAt || t.date));

  // cash transactions (existing cash module)
  const filteredCashTransactions = useMemo(() => {
    return filterTransactionsByDate(cash?.allEntries || []);
  }, [cash, reportType, selectedYear, selectedMonth]);

  // -------- EXPENSES SPLIT (core fix) --------
  const cashExpenses = useMemo(() => {
    return expenses
      .filter(
        (e) =>
          (e.paymentMethod || "").toLowerCase() === "cash" &&
          isInSelectedPeriod(e.expenseDate || e.createdAt)
      )
      .map((e) => Math.abs(Number(e.amount) || 0));
  }, [expenses, reportType, selectedMonth, selectedYear]);

  const totalCashExpenses = useMemo(
    () => cashExpenses.reduce((sum, a) => sum + a, 0),
    [cashExpenses]
  );

  // group bank expenses by bankID (online/cheque)
  const bankExpenseMap = useMemo(() => {
    const map = new Map();
    (expenses || []).forEach((e) => {
      const pm = (e.paymentMethod || "").toLowerCase();
      if ((pm === "online" || pm === "cheque") && isInSelectedPeriod(e.expenseDate || e.createdAt)) {
        const bid = e.bankID && (e.bankID._id || e.bankID); // supports populated or raw id
        const amt = Math.abs(Number(e.amount) || 0);
        if (bid) map.set(bid, (map.get(bid) || 0) + amt);
      }
    });
    return map;
  }, [expenses, reportType, selectedMonth, selectedYear]);

  const totalBankExpenses = useMemo(() => {
  // from expenses/all
  const expFromExpenses = expenses
    .filter(
      e =>
        ["online", "cheque"].includes((e.paymentMethod || "").toLowerCase()) &&
        isInSelectedPeriod(e.expenseDate || e.createdAt)
    )
    .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);

  // from transactions
  const expFromTransactions = bankTransactions
    .filter(
      tx =>
        tx.type?.toLowerCase() === "subtract" &&
        isInSelectedPeriod(tx.createdAt)
    )
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);

  return expFromExpenses + expFromTransactions;
}, [expenses, bankTransactions, reportType, selectedMonth, selectedYear]);

  // -------- EXISTING CASH TOTALS (then subtract expenses) --------
  const totalCashIncomeFromModule = useMemo(() => {
    return filteredCashTransactions.reduce(
      (total, entry) =>
        (entry.type || "").toLowerCase() === "add" 
          ? total + (Number(entry.balance) || 0)
          : total,
      0
    );
  }, [filteredCashTransactions]);

  const totalCashDeductFromModule = useMemo(() => {
    return filteredCashTransactions.reduce(
      (total, entry) =>
        (entry.type || "").toLowerCase() === "deduct"
          ? total + Math.abs(Number(entry.balance) || 0)
          : total,
      0
    );
  }, [filteredCashTransactions]);

  // What we show as "Available Cash Balance" should also subtract cash expenses
  const availableCashBalance = useMemo(() => {
    return totalCashIncomeFromModule - totalCashDeductFromModule - totalCashExpenses;
  }, [totalCashIncomeFromModule, totalCashDeductFromModule, totalCashExpenses]);

  // Bank total balance (kept as you had)
  const totalBankBalance = useMemo(() => {
    return (banks || []).reduce((total, bank) => total + (Number(bank.balance) || 0), 0);
  }, [banks]);

  // bank table columns
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

  // cash table columns
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

  // modal handlers
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
        cashtrue={true} // boolean
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
            Cash Expenses: {totalCashExpenses.toFixed(2)}
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
