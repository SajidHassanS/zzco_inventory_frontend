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
import TransferModal from "../../../components/Models/TransferModal";
import { SwapHoriz, Add } from "@mui/icons-material";
import AddFundsModal from "../../../components/Models/AddFundsModal";
// PDF libs 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://13.60.223.186:5000/";
const API_BASE = `${BACKEND_URL}api`;

// ✅ Helper for comma formatting
const formatNumber = (num) => {
  const n = Number(num);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const BankList = ({ banks = [], refreshBanks, cash }) => {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryType, setEntryType] = useState("bank");
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
const [isTransferModalOpen, setTransferModalOpen] = useState(false);
const [isAddFundsModalOpen, setAddFundsModalOpen] = useState(false);
const [selectedBankForFunds, setSelectedBankForFunds] = useState(null);
  // ===== Report selectors (Daily | Monthly | Yearly) =====
  const [reportType, setReportType] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

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
    if (reportType === "daily") return y === selectedYear && m === selectedMonth;
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

  const pickAmount = (tx) => {
    if (tx?.amount != null) return toNum(tx.amount);
    if (tx?.balance != null) return toNum(tx.balance);
    if (tx?.debit != null || tx?.credit != null) {
      const debit = toNum(tx.debit);
      const credit = toNum(tx.credit);
      return Math.max(debit, credit);
    }
    return 0;
  };

  const isReversalRow = (t) => {
    const desc = (t.description || "").toLowerCase();
    return (
      (t.meta && t.meta.kind === "reversal") ||
      desc.startsWith("reversal of entry")
    );
  };

  // ===== CASH (FIXED) =====
  const cashRowsRaw = useMemo(() => {
    return (cash?.transactions || cash?.allEntries || []);
  }, [cash]);

  const filteredCashTransactions = useMemo(() => {
    return cashRowsRaw
      .filter((t) => isInSelectedPeriod(pickWhen(t)))
      .filter((t) => !isReversalRow(t));
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
        bankID: e.bankID,
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
          period: reportType,
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

  // ✅ P&L columns with comma formatting
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
        renderCell: (r) => formatNumber(r.revenue ?? 0),
      },
      {
        field: "cogs",
        headerName: "COGS",
        align: "right",
        renderCell: (r) => formatNumber(r.cogs ?? 0),
      },
      {
        field: "expenses",
        headerName: "Expenses",
        align: "right",
        renderCell: (r) => formatNumber(r.expenses ?? 0),
      },
      {
        field: "grossProfit",
        headerName: "Gross Profit",
        align: "right",
        renderCell: (r) => formatNumber(r.grossProfit ?? 0),
      },
      {
        field: "netProfit",
        headerName: "Net Profit",
        align: "right",
        renderCell: (r) => formatNumber(r.netProfit ?? 0),
      },
    ],
    [reportType]
  );

  // ✅ Bank columns with comma formatting
  const bankColumns = [
    { field: "bankName", headerName: "Bank Name" },
    {
      field: "balance",
      headerName: "Balance",
      align: "right",
      renderCell: (row) => formatNumber(row.balance ?? 0),
    },
    {
      field: "expenses",
      headerName: "Expenses",
      align: "right",
      renderCell: (row) => {
        const id = row._id;
        const exp = bankExpenseMap.get(id) || 0;
        return formatNumber(exp);
      },
    },
  ];

  // ✅ Cash columns with comma formatting
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
      renderCell: (row) => formatNumber(Math.abs(pickAmount(row))),
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
      renderCell: (row) => bestDescription(row, false),
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

  const handleOpenAddFundsModal = (bank) => {
  setSelectedBankForFunds(bank);
  setAddFundsModalOpen(true);
};

const handleCloseAddFundsModal = () => {
  setAddFundsModalOpen(false);
  setSelectedBankForFunds(null);
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

  // ✅ bestDescription with comma formatting
  const bestDescription = (tx, isBankTx) => {
    const text =
      tx?.description ?? tx?.note ?? tx?.remarks ?? tx?.reason ?? tx?.title;
    if (text && String(text).trim().length > 0) return String(text);

    const t = String(tx?.type || "").toLowerCase().trim();
    const amt = formatNumber(Math.abs(pickAmount(tx)));

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

  // ✅ PROFESSIONAL BANK PDF with comma formatting
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

    // Calculate running balance
    let runningBalance = 0;
    const txWithBalance = tx.map((t) => {
      const isCredit = PDF_CREDIT_TYPES.has(String(t.type).toLowerCase());
      const isDebit = PDF_DEBIT_TYPES.has(String(t.type).toLowerCase());
      const amount = Math.abs(pickAmount(t));
      
      if (isCredit) runningBalance += amount;
      if (isDebit) runningBalance -= amount;
      
      return { ...t, runningBalance };
    });

    const totalCredits = tx.reduce((sum, t) => {
      const isCredit = PDF_CREDIT_TYPES.has(String(t.type).toLowerCase());
      return sum + (isCredit ? Math.abs(pickAmount(t)) : 0);
    }, 0);

    const totalDebits = tx.reduce((sum, t) => {
      const isDebit = PDF_DEBIT_TYPES.has(String(t.type).toLowerCase());
      return sum + (isDebit ? Math.abs(pickAmount(t)) : 0);
    }, 0);

    const doc = new jsPDF('landscape');
    
    // ✅ COMPANY LOGO/HEADER - ORANGE COLOR
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 87, 34);
    doc.text("Z&Z TRADERS .CO", 148, 12, { align: "center" });
    
    // Decorative line under logo
    doc.setLineWidth(0.8);
    doc.setDrawColor(255, 87, 34);
    doc.line(110, 15, 186, 15);
    
    // ✅ Bank name
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`${bank.bankName}`, 14, 15);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Bank Ledger", 14, 22);
    
    // ✅ Date range
    doc.setFontSize(10);
    const today = new Date().toLocaleDateString();
    const firstDate = tx.length > 0 
      ? new Date(pickWhen(tx[0])).toLocaleDateString()
      : today;
    doc.text(`From Date: ${firstDate}`, 240, 15);
    doc.text(`To Date: ${today}`, 240, 20);

    // ✅ Table columns
    const tableColumn = [
      "Date",
      "Type",
      "Description",
      "Debit",
      "Credit",
      "Running Balance"
    ];

    const tableRows = txWithBalance.map((t) => {
      const isCredit = PDF_CREDIT_TYPES.has(String(t.type).toLowerCase());
      const isDebit = PDF_DEBIT_TYPES.has(String(t.type).toLowerCase());
      const amount = Math.abs(pickAmount(t));
      
      return [
        pickWhen(t) ? new Date(pickWhen(t)).toLocaleDateString() : "-",
        String(t.type || "-").toUpperCase().substring(0, 3),
        bestDescription(t, true),
        isDebit ? formatNumber(amount) : "0.00",
        isCredit ? formatNumber(amount) : "0.00",
        formatNumber(t.runningBalance),
      ];
    });

    // ✅ Add totals row
    tableRows.push([
      "",
      "",
      "Total:",
      formatNumber(totalDebits),
      formatNumber(totalCredits),
      ""
    ]);

    // ✅ Professional table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      headStyles: {
        fillColor: [33, 150, 243],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 80, halign: 'left' },
        3: { cellWidth: 30, halign: 'right', textColor: [255, 0, 0] },
        4: { cellWidth: 30, halign: 'right', textColor: [0, 128, 0] },
        5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: function(data) {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
      styles: {
        overflow: 'linebreak',
        cellWidth: 'wrap'
      }
    });

    const finalY = doc.lastAutoTable.finalY || 28;
    
    // ✅ Summary at bottom with commas
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Debits: ${formatNumber(totalDebits)}`, 14, finalY + 10);
    doc.text(`Total Credits: ${formatNumber(totalCredits)}`, 100, finalY + 10);
    doc.text(`Current Balance: ${formatNumber(bank.balance || 0)}`, 200, finalY + 10);

    doc.save(`Bank_${bank.bankName}_Ledger_${titleForPeriod.replace(/ /g, '_')}.pdf`);
  };

  // ✅ PROFESSIONAL CASH PDF with comma formatting
  const downloadCashPdf = () => {
    const tx = [...filteredCashTransactions].sort(
      (a, b) => new Date(pickWhen(a) || 0) - new Date(pickWhen(b) || 0)
    );

    // Calculate running balance
    let runningBalance = 0;
    const txWithBalance = tx.map((t) => {
      const ttype = String(t.type || "").toLowerCase();
      const isCredit = PDF_CREDIT_TYPES.has(ttype);
      const isDebit = PDF_DEBIT_TYPES.has(ttype);
      const amount = Math.abs(pickAmount(t));
      
      if (isCredit) runningBalance += amount;
      if (isDebit) runningBalance -= amount;
      
      return { ...t, runningBalance };
    });

    const totalCredits = tx.reduce((sum, t) => {
      const isCredit = PDF_CREDIT_TYPES.has(String(t.type).toLowerCase());
      return sum + (isCredit ? Math.abs(pickAmount(t)) : 0);
    }, 0);

    const totalDebits = tx.reduce((sum, t) => {
      const isDebit = PDF_DEBIT_TYPES.has(String(t.type).toLowerCase());
      return sum + (isDebit ? Math.abs(pickAmount(t)) : 0);
    }, 0);

    const doc = new jsPDF('landscape');
    
    // ✅ COMPANY LOGO/HEADER - ORANGE COLOR
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 87, 34);
    doc.text("Z&Z TRADERS .CO", 148, 12, { align: "center" });
    
    // Decorative line under logo
    doc.setLineWidth(0.8);
    doc.setDrawColor(255, 87, 34);
    doc.line(110, 15, 186, 15);
    
    // ✅ Cash header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("CASH ACCOUNT", 14, 15);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Cash Ledger", 14, 22);
    
    // ✅ Date range
    doc.setFontSize(10);
    const today = new Date().toLocaleDateString();
    const firstDate = tx.length > 0 
      ? new Date(pickWhen(tx[0])).toLocaleDateString()
      : today;
    doc.text(`From Date: ${firstDate}`, 240, 15);
    doc.text(`To Date: ${today}`, 240, 20);

    // ✅ Table columns
    const tableColumn = [
      "Date",
      "Type",
      "Description",
      "Debit",
      "Credit",
      "Running Balance"
    ];

    const tableRows = txWithBalance.map((t) => {
      const ttype = String(t.type || "").toLowerCase();
      const isCredit = PDF_CREDIT_TYPES.has(ttype);
      const isDebit = PDF_DEBIT_TYPES.has(ttype);
      const amount = Math.abs(pickAmount(t));
      
      return [
        pickWhen(t) ? new Date(pickWhen(t)).toLocaleDateString() : "-",
        String(t.type || "-").toUpperCase().substring(0, 3),
        bestDescription(t, false),
        isDebit ? formatNumber(amount) : "0.00",
        isCredit ? formatNumber(amount) : "0.00",
        formatNumber(t.runningBalance),
      ];
    });

    // ✅ Add totals row
    tableRows.push([
      "",
      "",
      "Total:",
      formatNumber(totalDebits),
      formatNumber(totalCredits),
      ""
    ]);

    // ✅ Professional table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 80, halign: 'left' },
        3: { cellWidth: 30, halign: 'right', textColor: [255, 0, 0] },
        4: { cellWidth: 30, halign: 'right', textColor: [0, 128, 0] },
        5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: function(data) {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
      styles: {
        overflow: 'linebreak',
        cellWidth: 'wrap'
      }
    });

    const finalY = doc.lastAutoTable.finalY || 28;
    
    // ✅ Summary at bottom with commas
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Debits: ${formatNumber(totalDebits)}`, 14, finalY + 10);
    doc.text(`Total Credits: ${formatNumber(totalCredits)}`, 100, finalY + 10);
    doc.text(`Current Cash Balance: ${formatNumber(availableCashBalance)}`, 200, finalY + 10);

    doc.save(`Cash_Ledger_${titleForPeriod.replace(/ /g, '_')}.pdf`);
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
        <Button 
    variant="contained" 
    color="secondary"
    onClick={() => setTransferModalOpen(true)}
    startIcon={<SwapHoriz />}
  >
    Transfer Funds
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

        {/* ✅ P&L totals with comma formatting */}
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
              <Typography variant="h6">{formatNumber(plTotals.revenue)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">COGS</Typography>
              <Typography variant="h6">{formatNumber(plTotals.cogs)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Expenses</Typography>
              <Typography variant="h6">{formatNumber(plTotals.expenses)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Gross Profit</Typography>
              <Typography variant="h6">{formatNumber(plTotals.grossProfit)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Net Profit</Typography>
              <Typography
                variant="h6"
                color={plTotals.netProfit >= 0 ? "green" : "error"}
              >
                {formatNumber(plTotals.netProfit)}
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
  onAdd={(bank) => handleOpenAddFundsModal(bank)}
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

      {/* ===== Summary row with comma formatting ===== */}
      <Box
        sx={{ mt: 4, display: "flex", justifyContent: "space-between", gap: 4 }}
      >
        {/* Bank summary */}
        <Box>
          <Typography
            variant="h5"
            sx={{ color: "#388E3C", fontWeight: "bold", mb: 1 }}
          >
            Available balance in Bank: {formatNumber(totalBankBalance)}
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: "#D32F2F", fontWeight: "bold" }}
          >
            Bank Expenses: {formatNumber(totalBankExpenses)}
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
            Available Cash Balance: {formatNumber(availableCashBalance)}
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: "#D32F2F", fontWeight: "bold" }}
          >
            Cash Expenses: {formatNumber(cashExpensesDisplay)}
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

      {isTransferModalOpen && (
  <TransferModal
    open={isTransferModalOpen}
    onClose={() => setTransferModalOpen(false)}
    banks={banks}
    cashBalance={availableCashBalance}
    onSuccess={refreshBanks}
  />
)}

{isAddFundsModalOpen && selectedBankForFunds && (
  <AddFundsModal
    open={isAddFundsModalOpen}
    onClose={handleCloseAddFundsModal}
    bank={selectedBankForFunds}
    onSuccess={refreshBanks}
  />
)}
    </Box>
  );
};

export default BankList;