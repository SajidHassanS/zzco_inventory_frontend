import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Stack,
} from "@mui/material";
import axios from "axios";
import ConfirmDeleteModal from "../../../components/Models/ConfirmDeleteModal";
import EditBankModal from "../../../components/Models/EditBankModal";
import CustomTable from "../../../components/CustomTable/OwnAccount";
import { useSelector } from "react-redux";
import { selectCanDelete } from "../../../redux/features/auth/authSlice";
import TransactionHistoryModal from "../../../components/Models/TransactionModal";
import CashTransactionHistoryModal from "../../../components/Models/CashTransactionModal";

// PDF libs
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://13.60.223.186:5000/";
const API_BASE = `${BACKEND_URL}api`;

const BankList = ({ banks = [], refreshBanks, cash }) => {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryType, setEntryType] = useState("bank");
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);

  // ===== Report selectors (Daily | Monthly | Yearly) =====
  const [reportType, setReportType] = useState("monthly"); // "daily" | "monthly" | "yearly"
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1..12

  const canDelete = useSelector(selectCanDelete);

  // ===== Expenses & Bank transactions =====
  const [expenses, setExpenses] = useState([]);
  const [bankTransactions, setBankTransactions] = useState([]);

  // which bank to export
  const [selectedBankIdForPdf, setSelectedBankIdForPdf] = useState("");

  useEffect(() => {
    const fetchBankTransactions = async () => {
      try {
        let allTx = [];
        for (const bank of banks) {
          const res = await axios.get(
            `${API_BASE}/banks/${bank._id}/transactions`,
            { withCredentials: true }
          );
          const txns = res.data || {};
          const list = Array.isArray(txns) ? txns : txns.transactions || [];
          allTx = [
            ...allTx,
            ...list.map((t) => ({
              ...t,
              bankID: bank._id,
              bankName: bank.bankName,
            })),
          ];
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
    if (reportType === "daily") return y === selectedYear && m === selectedMonth; // daily view = chosen month
    if (reportType === "monthly") return y === selectedYear && m === selectedMonth;
    if (reportType === "yearly") return y === selectedYear;
    return true;
  };

  const isCashOutType = (type) => {
    const t = (type || "").toLowerCase();
    return (
      t === "deduct" || t === "subtract" || t === "withdraw" || t === "expense" || t === "debit"
    );
  };

  // ===== robust pickers (for mixed shapes) =====
  const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const pickWhen = (tx) => tx?.createdAt || tx?.date || tx?._displayDate || null;

  // Safely pick the numeric amount from diverse shapes
  const pickAmount = (tx) => {
    if (tx?.amount != null) return toNum(tx.amount);   // <- backend customer flows use this
    if (tx?.balance != null) return toNum(tx.balance); // <- older cash module used this
    if (tx?.debit != null || tx?.credit != null) {
      const debit = toNum(tx.debit);
      const credit = toNum(tx.credit);
      return Math.max(debit, credit);
    }
    return 0;
  };

  // reversal detector
  const isReversalRow = (t) => {
    const desc = (t.description || "").toLowerCase();
    return (
      (t.meta && t.meta.kind === "reversal") ||
      desc.startsWith("reversal of entry")
    );
  };

  // ===== CASH (FIXED) =====
  // Use new backend array (transactions). Fallback to allEntries if present.
  const cashRowsRaw = useMemo(() => {
    return (cash?.transactions || cash?.allEntries || []);
  }, [cash]);

  const filteredCashTransactions = useMemo(() => {
    return cashRowsRaw
      .filter((t) => isInSelectedPeriod(pickWhen(t)))
      .filter((t) => !isReversalRow(t)); // hide reversal rows from the list
  }, [cashRowsRaw, reportType, selectedYear, selectedMonth]);

  const totalCashAdds = useMemo(() => {
    return filteredCashTransactions.reduce((sum, t) => {
      const ttype = String(t.type || "").toLowerCase();
      const isCredit =
        ttype === "add" || ttype === "credit" || ttype === "deposit";
      return sum + (isCredit ? Math.abs(pickAmount(t)) : 0);
    }, 0);
  }, [filteredCashTransactions]);

  const totalCashDeductsFromModule = useMemo(() => {
    return filteredCashTransactions.reduce((sum, t) => {
      return sum + (isCashOutType(t.type) ? Math.abs(pickAmount(t)) : 0);
    }, 0);
  }, [filteredCashTransactions]);

  // Use server running total if present; otherwise fallback to local calc
  const availableCashBalance = useMemo(() => {
    if (cash && typeof cash.totalBalance === "number") {
      return Number(cash.totalBalance);
    }
    return totalCashAdds - totalCashDeductsFromModule;
  }, [cash, totalCashAdds, totalCashDeductsFromModule]);

  const cashExpensesFromExpensesApi = useMemo(() => {
    return (expenses || [])
      .filter(
        (e) =>
          (e.paymentMethod || "").toLowerCase() === "cash" &&
          isInSelectedPeriod(e.expenseDate || e.createdAt)
      )
      .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);
  }, [expenses, reportType, selectedYear, selectedMonth]);

  const cashExpensesDisplay = useMemo(
    () => cashExpensesFromExpensesApi,
    [cashExpensesFromExpensesApi]
  );

  // ===== BANK (from /expenses only) =====
  const bankExpensesFromExpensesApi = useMemo(() => {
    return (expenses || [])
      .filter((e) => {
        const pm = (e.paymentMethod || "").toLowerCase();
        return (
          (pm === "online" || pm === "cheque") &&
          isInSelectedPeriod(e.expenseDate || e.createdAt)
        );
      })
      .map((e) => ({
        bankID: e.bankID, // may be string or populated object
        amount: Math.abs(Number(e.amount) || 0),
      }));
  }, [expenses, reportType, selectedYear, selectedMonth]);

  const bankExpenseMap = useMemo(() => {
    const map = new Map();
    for (const row of bankExpensesFromExpensesApi) {
      const bid = typeof row.bankID === "object" ? row.bankID?._id : row.bankID;
      if (!bid) continue;
      map.set(bid, (map.get(bid) || 0) + row.amount);
    }
    return map;
  }, [bankExpensesFromExpensesApi]);

  const totalBankExpenses = useMemo(() => {
    return bankExpensesFromExpensesApi.reduce((sum, r) => sum + r.amount, 0);
  }, [bankExpensesFromExpensesApi]);

  const totalBankBalance = useMemo(() => {
    return (banks || []).reduce(
      (total, bank) => total + (Number(bank.balance) || 0),
      0
    );
  }, [banks]);

  // ===== PROFIT & LOSS (unchanged) =====
  const [plLoading, setPlLoading] = useState(false);
  const [plRows, setPlRows] = useState([]);
  const [plTotals, setPlTotals] = useState(null);

  useEffect(() => {
    const fetchPL = async () => {
      try {
        setPlLoading(true);
        const params = {
          period: reportType, // "daily" | "monthly" | "yearly"
          year: selectedYear,
        };
        if (reportType === "daily") params.month = selectedMonth;

        const { data } = await axios.get(`${API_BASE}/reports/profit-loss`, {
          params,
          withCredentials: true,
        });

        setPlRows(Array.isArray(data?.rows) ? data.rows : []);
        setPlTotals(data?.totals ?? null);
      } catch (e) {
        console.error("Failed to fetch Profit/Loss", e);
        setPlRows([]);
        setPlTotals(null);
      } finally {
        setPlLoading(false);
      }
    };

    fetchPL();
  }, [reportType, selectedYear, selectedMonth]);

  const plColumns = useMemo(
    () => [
      {
        field: "period",
        headerName:
          reportType === "daily"
            ? "Date"
            : reportType === "monthly"
            ? "Month"
            : "Year",
        renderCell: (row) => {
          const d = new Date(row.period);
          if (reportType === "daily") return d.toISOString().slice(0, 10);
          if (reportType === "monthly")
            return d.toLocaleString("default", {
              month: "short",
              year: "numeric",
            });
          return `${d.getUTCFullYear()}`;
        },
      },
      {
        field: "revenue",
        headerName: "Revenue",
        align: "right",
        renderCell: (r) => (r.revenue ?? 0).toFixed(2),
      },
      {
        field: "cogs",
        headerName: "COGS",
        align: "right",
        renderCell: (r) => (r.cogs ?? 0).toFixed(2),
      },
      {
        field: "expenses",
        headerName: "Expenses",
        align: "right",
        renderCell: (r) => (r.expenses ?? 0).toFixed(2),
      },
      {
        field: "grossProfit",
        headerName: "Gross Profit",
        align: "right",
        renderCell: (r) => (r.grossProfit ?? 0).toFixed(2),
      },
      {
        field: "netProfit",
        headerName: "Net Profit",
        align: "right",
        renderCell: (r) => (r.netProfit ?? 0).toFixed(2),
      },
    ],
    [reportType]
  );

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
     valueGetter: (row) =>
        pickWhen(row)
          ? new Date(pickWhen(row)).toISOString().slice(0, 10)
         : "-",
    },
    {
      field: "amountDisplay",
      headerName: "Amount",
      align: "right",
     renderCell: (row) => Math.abs(pickAmount(row)).toFixed(2),
    },
    {
      field: "type",
      headerName: "Type",
      renderCell: (row) => {
        const t = (row.type || "").toLowerCase();
        const isRev = isReversalRow(row);
        if (isRev) {
          return (
            <Chip
              size="small"
              label="Reversal"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          );
        }
        return t || "-";
      },
    },
    {
      field: "description",
      headerName: "Description",
 renderCell: (row) => bestDescription(row, /* isBankTx */ false),
    },
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

  // =========================
  // PDF EXPORT HELPERS
  // =========================

  const titleForPeriod = useMemo(() => {
    if (reportType === "daily") {
      return `${new Date(selectedYear, selectedMonth - 1).toLocaleString(
        "default",
        { month: "long" }
      )} ${selectedYear}`;
    }
    if (reportType === "monthly") {
      return `${new Date(selectedYear, selectedMonth - 1).toLocaleString(
        "default",
        { month: "long" }
      )} ${selectedYear}`;
    }
    return `${selectedYear}`;
  }, [reportType, selectedYear, selectedMonth]);

  const PDF_CREDIT_TYPES = new Set(["add", "credit", "deposit"]);
  const PDF_DEBIT_TYPES = new Set([
    "subtract",
    "deduct",
    "debit",
    "withdraw",
    "expense",
  ]);

  const bestDescription = (tx, isBankTx) => {
    const text =
      tx?.description ?? tx?.note ?? tx?.remarks ?? tx?.reason ?? tx?.title;
    if (text && String(text).trim().length > 0) return String(text);

    const t = String(tx?.type || "").toLowerCase().trim();
    const amt = Math.abs(pickAmount(tx)).toFixed(2);

    if (isBankTx) {
      if (PDF_CREDIT_TYPES.has(t)) return `Deposit Rs ${amt}`;
      if (PDF_DEBIT_TYPES.has(t)) return `Withdrawal Rs ${amt}`;
      return `Bank transaction Rs ${amt}`;
    } else {
      if (PDF_CREDIT_TYPES.has(t)) return `Cash received Rs ${amt}`;
      if (PDF_DEBIT_TYPES.has(t)) return `Cash spent Rs ${amt}`;
      return `Cash transaction Rs ${amt}`;
    }
  };

  // Download chosen bank’s full ledger
  const downloadBankPdf = () => {
    if (!selectedBankIdForPdf) {
      alert("Please select a bank first.");
      return;
    }
    const bank = banks.find((b) => b._id === selectedBankIdForPdf);
    if (!bank) return;

    const tx = bankTransactions
      .filter((t) => t.bankID === bank._id)
      .sort((a, b) => new Date(pickWhen(a) || 0) - new Date(pickWhen(b) || 0));

    const totalCredits = tx.reduce((sum, t) => {
      const isCredit = PDF_CREDIT_TYPES.has(String(t.type).toLowerCase());
      return sum + (isCredit ? Math.abs(pickAmount(t)) : 0);
    }, 0);

    const totalDebits = tx.reduce((sum, t) => {
      const isDebit = PDF_DEBIT_TYPES.has(String(t.type).toLowerCase());
      return sum + (isDebit ? Math.abs(pickAmount(t)) : 0);
    }, 0);

    const doc = new jsPDF();
    doc.text(`Bank Ledger - ${bank.bankName}`, 14, 12);
    doc.setFontSize(10);
    doc.text(`Period: ${titleForPeriod}`, 14, 18);
    doc.text(`Current Balance: ${Number(bank.balance || 0).toFixed(2)}`, 14, 24);
    doc.text(
      `Total Credits: ${totalCredits.toFixed(2)}   Total Debits: ${totalDebits.toFixed(2)}`,
      14,
      30
    );

    const head = [["Date", "Type", "Amount", "Description"]];
    const body = tx.map((t) => [
      pickWhen(t) ? new Date(pickWhen(t)).toLocaleString() : "-",
      String(t.type || "-"),
      Math.abs(pickAmount(t)).toFixed(2),
      bestDescription(t, true),
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 36,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [33, 150, 243] },
    });

    doc.save(`Bank_${bank.bankName}_Ledger_${titleForPeriod}.pdf`);
  };

  // Download cash ledger (current filtered list)
  const downloadCashPdf = () => {
    const tx = [...filteredCashTransactions].sort(
      (a, b) => new Date(pickWhen(a) || 0) - new Date(pickWhen(b) || 0)
    );

    const doc = new jsPDF();
    doc.text(`Cash Ledger`, 14, 12);
    doc.setFontSize(10);
    doc.text(`Period: ${titleForPeriod}`, 14, 18);
    doc.text(
      `Current Cash Balance: ${Number(availableCashBalance || 0).toFixed(2)}`,
      14,
      24
    );

    const head = [["Date", "Type", "Amount", "Description"]];
    const body = tx.map((t) => [
      pickWhen(t) ? new Date(pickWhen(t)).toLocaleString() : "-",
      String(t.type || "-"),
      Math.abs(pickAmount(t)).toFixed(2),
      bestDescription(t, false),
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 30,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [76, 175, 80] },
    });

    doc.save(`Cash_Ledger_${titleForPeriod}.pdf`);
  };

  return (
    <Box
      sx={{ margin: 3, bgcolor: "white", borderRadius: 2, padding: 3, width: "auto" }}
    >
      {/* ===== PDF Export controls ===== */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Select Bank for PDF</InputLabel>
          <Select
            label="Select Bank for PDF"
            value={selectedBankIdForPdf}
            onChange={(e) => setSelectedBankIdForPdf(e.target.value)}
          >
            {banks.map((b) => (
              <MenuItem key={b._id} value={b._id}>
                {b.bankName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="contained" onClick={downloadBankPdf}>
          Download Bank PDF
        </Button>

        <Button variant="outlined" onClick={downloadCashPdf}>
          Download Cash PDF
        </Button>
      </Stack>

      {/* ===== Report selectors ===== */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
        gap={2}
      >
        <FormControl>
          <InputLabel>Report Type</InputLabel>
          <Select
            value={reportType}
            label="Report Type"
            onChange={(e) => setReportType(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </Select>
        </FormControl>

        {(reportType === "daily" || reportType === "monthly") && (
          <FormControl>
            <InputLabel>Month</InputLabel>
            <Select
              value={selectedMonth}
              label="Month"
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              sx={{ minWidth: 160 }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {new Date(2025, i).toLocaleString("default", {
                    month: "long",
                  })}
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
            {Array.from({ length: 7 }, (_, i) => {
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

      {/* ===== Profit & Loss ===== */}
      <Box
        sx={{
          mt: 1,
          p: 2,
          borderRadius: 2,
          bgcolor: "#fafafa",
          border: "1px solid #eee",
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h5" fontWeight="bold">
            Profit &amp; Loss{" "}
            {reportType === "daily"
              ? `(${new Date(selectedYear, selectedMonth - 1).toLocaleString(
                  "default",
                  { month: "long" }
                )} ${selectedYear})`
              : `(${selectedYear})`}
          </Typography>
          {plLoading && <Typography variant="body2">Loading…</Typography>}
        </Box>

        {plTotals && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle2">Revenue</Typography>
              <Typography variant="h6">{plTotals.revenue.toFixed(2)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">COGS</Typography>
              <Typography variant="h6">{plTotals.cogs.toFixed(2)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Expenses</Typography>
              <Typography variant="h6">{plTotals.expenses.toFixed(2)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Gross Profit</Typography>
              <Typography variant="h6">{plTotals.grossProfit.toFixed(2)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Net Profit</Typography>
              <Typography
                variant="h6"
                color={plTotals.netProfit >= 0 ? "green" : "error"}
              >
                {plTotals.netProfit.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )}

        {plRows?.length > 0 && (
          <CustomTable columns={plColumns} data={plRows} page={0} rowsPerPage={5} />
        )}
      </Box>

      {/* ===== Banks list ===== */}
      <Typography variant="h3" align="center" sx={{ mt: 4 }}>
        Banks List
      </Typography>
      <CustomTable
        columns={bankColumns}
        data={banks || []}
        onEdit={(bank) => handleOpenEditModal(bank, "bank")}
        onDelete={(bank) => handleOpenDeleteModal(bank, "bank")}
        onView={(bank) => handleOpenTransactionModal(bank, "bank")}
        cashtrue={false}
      />

      {/* ===== Cash list (FIXED) ===== */}
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

      {/* ===== Summary row ===== */}
      <Box
        sx={{ mt: 4, display: "flex", justifyContent: "space-between", gap: 4 }}
      >
        {/* Bank summary */}
        <Box>
          <Typography
            variant="h5"
            sx={{ color: "#388E3C", fontWeight: "bold", mb: 1 }}
          >
            Available balance in Bank: {totalBankBalance.toFixed(2)}
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: "#D32F2F", fontWeight: "bold" }}
          >
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
          <Typography
            variant="h6"
            sx={{ color: "#D32F2F", fontWeight: "bold" }}
          >
            Cash Expenses: {cashExpensesDisplay.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* ===== Modals ===== */}
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
          onChanged={refreshBanks}
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
