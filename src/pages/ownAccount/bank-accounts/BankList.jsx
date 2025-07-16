import React, { useState, useMemo, useEffect } from "react";
import { Box, Button, Typography, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import ConfirmDeleteModal from "../../../components/Models/ConfirmDeleteModal";
import EditBankModal from "../../../components/Models/EditBankModal";
import CustomTable from "../../../components/CustomTable/OwnAccount";
import { useSelector } from "react-redux";
import { selectCanDelete } from "../../../redux/features/auth/authSlice";
import TransactionHistoryModal from "../../../components/Models/TransactionModal";
import CashTransactionHistoryModal from "../../../components/Models/CashTransactionModal";
 
const BankList = ({ banks, refreshBanks, cash }) => {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryType, setEntryType] = useState("bank");
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false); // Renamed state

  // Report selection (monthly/yearly)
  const [reportType, setReportType] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const canDelete = useSelector((state) => selectCanDelete(state));

  useEffect(() => {
    console.log("Banks data:", banks);
  }, [banks]);

  // ✅ Open Edit Modal
  const handleOpenEditModal = (entry, type) => {
    console.log("Opening Edit Modal for:", entry);
    setSelectedEntry(entry);
    setEntryType(type);
    setEditModalOpen(true);
  };

  // ✅ Open Delete Modal
  const handleOpenDeleteModal = (entry, type) => {
    console.log("Opening Delete Modal for:", entry);
    if (!canDelete) {
      alert("You do not have permission to delete this entry.");
      return;
    }
    setSelectedEntry(entry);
    setEntryType(type);
    setDeleteModalOpen(true);
  };

  // ✅ Open Transaction Modal
  const handleOpenTransactionModal = (entry, type) => {
    console.log("Opening Transaction Modal for:", entry);
    setSelectedEntry(entry);
    setEntryType(type);
    setTransactionModalOpen(true);
  };

  // ✅ Close all modals
  const closeModals = () => {
    console.log("Closing modals...");
    setEditModalOpen(false);
    setDeleteModalOpen(false);
    setTransactionModalOpen(false);
    setSelectedEntry(null);
  };

  // ✅ Filter transactions based on report type
  const filterTransactionsByDate = (transactions) => {
    return transactions.filter((entry) => {
      const entryDate = new Date(entry.createdAt);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth() + 1;

      if (reportType === "monthly") {
        return entryYear === selectedYear && entryMonth === selectedMonth;
      } else if (reportType === "yearly") {
        return entryYear === selectedYear;
      }
      return true;
    });
  };

  const filteredCashTransactions = useMemo(
    () => filterTransactionsByDate(cash?.allEntries || []),
    [cash, reportType, selectedYear, selectedMonth]
  );

  // ✅ Compute Income and Expenses
  const totalIncome = useMemo(() => {
    return filteredCashTransactions.reduce((total, entry) => entry.type === "add" ? total + (entry.balance || 0) : total, 0);
  }, [filteredCashTransactions]);

  const totalExpenses = useMemo(() => {
    return filteredCashTransactions.reduce((total, entry) => entry.type === "deduct" ? total + (entry.balance || 0) : total, 0);
  }, [filteredCashTransactions]);



  const netBalance = totalIncome - totalExpenses;

  const totalBankBalance = useMemo(() => {
  return (banks || []).reduce((total, bank) => total + (bank.balance || 0), 0);
}, [banks]);

  const bankColumns = [
    { field: "bankName", headerName: "Bank Name" },
    { field: "balance", headerName: "Balance", align: "right" },
  ];

  const cashColumns = [
    {
      field: "createdAt",
      headerName: "Date",
      valueGetter: (params) => new Date(params.row.createdAt).toISOString().slice(0, 10),
    },
  
    { field: "balance", headerName: "Balance", align: "right" },
    { field: "type", headerName: "Type" },
  ];

  return (
    <Box sx={{ margin: 3, bgcolor: "white", borderRadius: 2, padding: 3, width: "auto" }}>
      
      {/* 🔹 Report Type Selection */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <FormControl>
          <InputLabel>Report Type</InputLabel>
          <Select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </Select>
        </FormControl>

        {reportType === "monthly" && (
          <FormControl>
            <InputLabel>Month</InputLabel>
            <Select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>{new Date(2022, i).toLocaleString("default", { month: "long" })}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl>
          <InputLabel>Year</InputLabel>
          <Select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => (
              <MenuItem key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* 🔹 Banks List */}
      <Typography variant="h3" align="center">Banks List</Typography>
      <CustomTable
  columns={bankColumns}
  data={banks || []}
  onEdit={(bank) => handleOpenEditModal(bank, "bank")}
  onDelete={(bank) => handleOpenDeleteModal(bank, "bank")}
  onView={(bank) => handleOpenTransactionModal(bank, "bank")}
  cashtrue={false}  // ✅ Proper Boolean
/>

      {/* 🔹 Cash Transactions */}
      <Typography variant="h3" align="center" mt={3}>Cash List</Typography>
      <CustomTable
  columns={cashColumns}
  data={filteredCashTransactions}
  onEdit={(cashEntry) => handleOpenEditModal(cashEntry, "cash")}
  onDelete={(cashEntry) => handleOpenDeleteModal(cashEntry, "cash")}
  onView={(cashEntry) => handleOpenTransactionModal(cashEntry, "cash")}
  cashtrue={true}  // ✅ Proper Boolean
/>


<Box sx={{ mt: 4, display: "flex", justifyContent: "space-between", gap: 4 }}>
  {/* ✅ Bank Summary (Left) */}
  <Box>
    <Typography variant="h5" sx={{ color: "#388E3C", fontWeight: "bold", mb: 1 }}>
      Available balance in Bank: {totalBankBalance}
    </Typography>
    <Typography variant="h6" sx={{ color: "#D32F2F", fontWeight: "bold" }}>
      Bank Expenses: {banks?.reduce((total, bank) =>
        (bank.transactions || []).reduce((sum, t) =>
          t.type === "subtract" ? sum + (t.amount  || 0) : sum, total
        ), 0)}
    </Typography>
  </Box>

  {/* ✅ Cash Summary (Right) */}
  <Box textAlign="right">
    <Typography variant="h5" sx={{ color: netBalance >= 0 ? "#1976D2" : "#D32F2F", fontWeight: "bold", mb: 1 }}>
      Available Cash Balance: {netBalance}
    </Typography>
    <Typography variant="h6" sx={{ color: "#D32F2F", fontWeight: "bold" }}>
      Cash Expenses: {totalExpenses}
    </Typography>
  </Box>
</Box>




      {/* Modals */}
      {isEditModalOpen && (
  <EditBankModal
    open={isEditModalOpen}
    onClose={closeModals}
    entry={selectedEntry}
    entryType={entryType}      // ✅ Pass entryType to modal
    onSuccess={refreshBanks}   // ✅ Optional: refresh list after update
  />
)}






      {isDeleteModalOpen && (
  <ConfirmDeleteModal
    open={isDeleteModalOpen}
    onClose={closeModals}
    entry={selectedEntry}
    entryType={entryType} // ✅ Pass this to avoid defaulting to 'suppliers'
    onSuccess={refreshBanks}
  />
)}

{/* 🔹 Bank Transactions Modal */}
{isTransactionModalOpen && entryType === "bank" && (
  <TransactionHistoryModal
    open={isTransactionModalOpen}
    onClose={closeModals}
    entry={selectedEntry}
    entryType="bank"
  />
)}

{/* 🔹 Cash Transactions Modal */}
{isTransactionModalOpen && entryType === "cash" && (
  <CashTransactionHistoryModal
    open={isTransactionModalOpen}
    onClose={closeModals}
    cashEntry={selectedEntry}  // ✅ correct prop
  />
)}




    </Box>
  );
};

export default BankList;
