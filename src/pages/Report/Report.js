// src/pages/Report/Report.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { selectIsLoggedIn } from "../../redux/features/auth/authSlice";
 
import { getPendingCheques } from "../../redux/features/cheque/chequeSlice"; // Add this
import {
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Button,
  ButtonGroup,
  Box,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  AccountBalance as BankIcon,
  MoneyOff as MoneyIcon,
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
  People as PeopleIcon,
  Assessment as ReportIcon,
  AttachMoney as CashIcon,
} from "@mui/icons-material";
import axios from "axios";
import jsPDF from "jspdf";

// ——— API base ———
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://13.60.223.186:5000/";
const API_BASE = `${BACKEND_URL}api`;

// ——— Metric Card Component ———
const MetricCard = ({ title, subtitle, value, count, icon: Icon, color, isCurrency }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-PK").format(num);
  };

  const getColor = () => {
    switch (color) {
      case "success": return "#4caf50";
      case "danger": return "#f44336";
      case "warning": return "#ff9800";
      case "info": return "#2196f3";
      default: return "#1976d2";
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        height: "100%",
        borderLeft: `4px solid ${getColor()}`,
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 4,
        },
      }}
    >
      <Box display="flex" alignItems="flex-start" gap={2}>
        <Box
          sx={{
            width: 50,
            height: 50,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${getColor()} 0%, ${getColor()}dd 100%)`,
            color: "white",
          }}
        >
          <Icon />
        </Box>
        <Box flex={1}>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {subtitle}
            </Typography>
          )}
          <Typography variant="h5" sx={{ fontWeight: 700, color: getColor(), mt: 1 }}>
            {isCurrency ? formatCurrency(value) : formatNumber(value)}
          </Typography>
          {count !== undefined && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              {count} {count === 1 ? (title.includes("Cheque") ? "cheque" : "account") : (title.includes("Cheque") ? "cheques" : "accounts")}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

function Report() {
  useRedirectLoggedOutUser("/login");
  const isLoggedIn = useSelector(selectIsLoggedIn);
const dispatch = useDispatch();
const chequesFromStore = useSelector((state) => state.cheque.cheques);
  const [loading, setLoading] = useState(true);
  
  // Date filters - EXACT same as BankList
  const [reportType, setReportType] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Data states
  const [banks, setBanks] = useState([]);
  const [cash, setCash] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [plData, setPlData] = useState(null);
  const [plLoading, setPlLoading] = useState(false);

  // ===== Helper functions - EXACT same as BankList =====
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

  const isInSelectedPeriod = (isoDate) => {
    if (!isoDate) return false;
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
    return t === "deduct" || t === "subtract" || t === "withdraw" || t === "expense" || t === "debit";
  };

  const isReversalRow = (t) => {
    const desc = (t.description || "").toLowerCase();
    return (t.meta && t.meta.kind === "reversal") || desc.startsWith("reversal of entry");
  };

  // ===== Fetch all data =====
  useEffect(() => {
    if (isLoggedIn) {
      fetchAllData();
    }
  }, [isLoggedIn, reportType, selectedYear, selectedMonth]);

  // Fetch cheques from Redux
useEffect(() => {
  if (isLoggedIn) {
    dispatch(getPendingCheques({ status: "all" }));
  }
}, [dispatch, isLoggedIn]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBanks(),
        fetchCashBalance(), // Changed function name
        fetchExpenses(),
        fetchCustomers(),
        fetchSuppliers(),
        fetchProfitLoss(),
      ]);
    } catch (error) {
      console.error("❌ Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/banks/all`, { withCredentials: true });
      const bankList = Array.isArray(data) ? data : data?.banks || [];
      console.log("🏦 Banks fetched:", bankList.length);
      setBanks(bankList);

      // Fetch bank transactions
      let allTx = [];
      for (const bank of bankList) {
        const res = await axios.get(`${API_BASE}/banks/${bank._id}/transactions`, { withCredentials: true });
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
      console.log("💳 Bank transactions fetched:", allTx.length);
      setBankTransactions(allTx);
    } catch (error) {
      console.error("❌ Error fetching banks:", error);
      setBanks([]);
      setBankTransactions([]);
    }
  };

  // Try multiple possible endpoints for cash data
  const fetchCashBalance = async () => {
    const possibleEndpoints = [
      "/cash/balance",
      "/cash/all", 
      "/cash",
      "/expenses/cash-balance",
      "/own-account/cash"
    ];

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`🔍 Trying endpoint: ${API_BASE}${endpoint}`);
        const { data } = await axios.get(`${API_BASE}${endpoint}`, { withCredentials: true });
        console.log(`✅ Cash data found at ${endpoint}:`, data);
        setCash(data);
        return; // Success, exit
      } catch (error) {
        console.log(`❌ ${endpoint} not found, trying next...`);
        continue;
      }
    }

    // If all endpoints fail, log error
    console.error("❌ Could not find cash endpoint. Tried:", possibleEndpoints);
    console.log("💡 TIP: Check your AddBank component to see where it fetches cash from");
    setCash(null);
  };

  const fetchExpenses = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/expenses/all`, { withCredentials: true });
      const expenseList = Array.isArray(data) ? data : [];
      console.log("💸 Expenses fetched:", expenseList.length);
      setExpenses(expenseList);
    } catch (error) {
      console.error("❌ Error fetching expenses:", error);
      setExpenses([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/customers/allcustomer`, { withCredentials: true });
      const customerList = Array.isArray(data) ? data : [];
      console.log("👥 Customers fetched:", customerList.length);
      setCustomers(customerList);
    } catch (error) {
      console.error("❌ Error fetching customers:", error);
      setCustomers([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/suppliers`, { withCredentials: true });
      const supplierList = Array.isArray(data) ? data : [];
      console.log("🏭 Suppliers fetched:", supplierList.length);
      setSuppliers(supplierList);
    } catch (error) {
      console.error("❌ Error fetching suppliers:", error);
      setSuppliers([]);
    }
  };

  const fetchProfitLoss = async () => {
    setPlLoading(true);
    try {
      const params = {
        period: reportType,
        year: selectedYear,
      };
      if (reportType === "daily") params.month = selectedMonth;

      const { data } = await axios.get(`${API_BASE}/reports/profit-loss`, { 
        params,
        withCredentials: true 
      });
      console.log("📊 P&L data fetched:", data?.totals);
      setPlData(data?.totals || null);
    } catch (error) {
      console.error("❌ Error fetching profit/loss:", error);
      setPlData(null);
    } finally {
      setPlLoading(false);
    }
  };

  // ===== CASH calculations - EXACT same as BankList =====
  const cashRowsRaw = useMemo(() => {
    const rows = cash?.transactions || cash?.allEntries || [];
    console.log("📝 Cash rows raw:", rows.length, "transactions");
    return rows;
  }, [cash]);

  const filteredCashTransactions = useMemo(() => {
    const filtered = cashRowsRaw
      .filter((t) => isInSelectedPeriod(pickWhen(t)))
      .filter((t) => !isReversalRow(t));
    console.log("✅ Filtered cash transactions:", filtered.length);
    return filtered;
  }, [cashRowsRaw, reportType, selectedYear, selectedMonth]);

  const totalCashAdds = useMemo(() => {
    const total = filteredCashTransactions.reduce((sum, t) => {
      const ttype = String(t.type || "").toLowerCase();
      const isCredit = ttype === "add" || ttype === "credit" || ttype === "deposit";
      return sum + (isCredit ? Math.abs(pickAmount(t)) : 0);
    }, 0);
    console.log("💰 TOTAL CASH ADDS:", total);
    return total;
  }, [filteredCashTransactions]);

  const totalCashDeductsFromModule = useMemo(() => {
    const total = filteredCashTransactions.reduce((sum, t) => {
      return sum + (isCashOutType(t.type) ? Math.abs(pickAmount(t)) : 0);
    }, 0);
    console.log("💸 TOTAL CASH DEDUCTS:", total);
    return total;
  }, [filteredCashTransactions]);

  const availableCashBalance = useMemo(() => {
    if (cash && typeof cash.totalBalance === "number") {
      console.log("🏦 Using server totalBalance:", cash.totalBalance);
      return Number(cash.totalBalance);
    }
    const calculated = totalCashAdds - totalCashDeductsFromModule;
    console.log("🧮 Calculated cash balance:", calculated);
    return calculated;
  }, [cash, totalCashAdds, totalCashDeductsFromModule]);

  const cashExpensesFromExpensesApi = useMemo(() => {
    const total = (expenses || [])
      .filter((e) => 
        (e.paymentMethod || "").toLowerCase() === "cash" && 
        isInSelectedPeriod(e.expenseDate || e.createdAt)
      )
      .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);
    console.log("💵 Cash expenses from API:", total);
    return total;
  }, [expenses, reportType, selectedYear, selectedMonth]);

  // ===== Bank calculations =====
  const totalBankBalance = useMemo(() => {
    const total = banks.reduce((sum, bank) => sum + (Number(bank.balance) || 0), 0);
    console.log("🏦 Total bank balance:", total);
    return total;
  }, [banks]);

  const bankExpensesFromExpensesApi = useMemo(() => {
    return (expenses || [])
      .filter((e) => {
        const pm = (e.paymentMethod || "").toLowerCase();
        return (pm === "online" || pm === "cheque") && isInSelectedPeriod(e.expenseDate || e.createdAt);
      })
      .map((e) => ({
        bankID: e.bankID,
        amount: Math.abs(Number(e.amount) || 0),
      }));
  }, [expenses, reportType, selectedYear, selectedMonth]);

  const totalBankExpenses = useMemo(() => {
    const total = bankExpensesFromExpensesApi.reduce((sum, r) => sum + r.amount, 0);
    console.log("💳 Total bank expenses:", total);
    return total;
  }, [bankExpensesFromExpensesApi]);

  // ===== Customer dues =====
  const customerDues = useMemo(() => {
    return customers.reduce(
      (acc, customer) => {
        if (customer.balance < 0) {
          acc.receivable += Math.abs(customer.balance);
          acc.receivableCount++;
        } else if (customer.balance > 0) {
          acc.payable += customer.balance;
          acc.payableCount++;
        }
        return acc;
      },
      { receivable: 0, receivableCount: 0, payable: 0, payableCount: 0 }
    );
  }, [customers]);

  // ===== Supplier dues =====
  const supplierDues = useMemo(() => {
    return suppliers.reduce(
      (acc, supplier) => {
        if (supplier.balance < 0) {
          acc.payable += Math.abs(supplier.balance);
          acc.payableCount++;
        } else if (supplier.balance > 0) {
          acc.receivable += supplier.balance;
          acc.receivableCount++;
        }
        return acc;
      },
      { payable: 0, payableCount: 0, receivable: 0, receivableCount: 0 }
    );
  }, [suppliers]);

// ===== Pending cheques - EXACT logic from ChequeDetails =====
const pendingCheques = useMemo(() => {
  if (!Array.isArray(chequesFromStore)) {
    console.log("⚠️ No cheques in store");
    return { count: 0, amount: 0 };
  }

  const pending = chequesFromStore.filter((c) => {
    return c.status === false && !c.cancelled && !c.transferred;
  });

  const totalAmount = pending.reduce((sum, c) => {
    return sum + (Number(c.amount) || 0);
  }, 0);

  console.log("💳 Pending cheques:", pending.length, "Amount:", totalAmount);

  return {
    count: pending.length,
    amount: totalAmount,
  };
}, [chequesFromStore]);

  // ===== Title for period =====
  const titleForPeriod = useMemo(() => {
    if (reportType === "daily" || reportType === "monthly") {
      return `${new Date(selectedYear, selectedMonth - 1).toLocaleString("default", { month: "long" })} ${selectedYear}`;
    }
    return `${selectedYear}`;
  }, [reportType, selectedYear, selectedMonth]);

// ===== PDF Export - PROFESSIONAL VERSION =====
const downloadComprehensiveReport = () => {
  const doc = new jsPDF('portrait');
  
  // ===== HEADER =====
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("FINANCIAL REPORT", 105, 15, { align: "center" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${titleForPeriod}`, 105, 22, { align: "center" });
  doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });
  
  // Add line separator
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);
  
  let yPos = 40;

  // ===== SECTION 1: CASH & BANK SUMMARY =====
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.setFillColor(41, 128, 185);
  doc.rect(14, yPos - 5, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text("CASH & BANK SUMMARY", 16, yPos);
  yPos += 10;
  
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  
  // Table-like format
  doc.text("Total Cash Balance:", 20, yPos);
  doc.text(`Rs ${availableCashBalance.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
  yPos += 6;
  
  doc.text("Total Bank Balance:", 20, yPos);
  doc.text(`Rs ${totalBankBalance.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
  yPos += 6;
  
  doc.text("Pending Cheques:", 20, yPos);
  doc.text(`Rs ${pendingCheques.amount.toLocaleString('en-PK', {minimumFractionDigits: 2})} (${pendingCheques.count} cheques)`, 140, yPos, { align: "right" });
  yPos += 6;
  
  // Subtotal line
  doc.setLineWidth(0.3);
  doc.line(20, yPos, 140, yPos);
  yPos += 5;
  
  doc.setFont(undefined, "bold");
  doc.text("Total Liquid Assets:", 20, yPos);
  doc.text(`Rs ${(availableCashBalance + totalBankBalance).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
  yPos += 12;

  // ===== SECTION 2: CUSTOMER ACCOUNTS =====
  doc.setFont(undefined, "bold");
  doc.setFillColor(76, 175, 80);
  doc.rect(14, yPos - 5, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text("CUSTOMER ACCOUNTS", 16, yPos);
  yPos += 10;
  
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "normal");
  
  doc.text(`Dues FROM Customers (Receivable):`, 20, yPos);
  doc.text(`Rs ${customerDues.receivable.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`(${customerDues.receivableCount} customers)`, 145, yPos);
  yPos += 6;
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Dues TO Customers (Payable):`, 20, yPos);
  doc.text(`Rs ${customerDues.payable.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`(${customerDues.payableCount} customers)`, 145, yPos);
  yPos += 6;
  
  doc.setLineWidth(0.3);
  doc.line(20, yPos, 140, yPos);
  yPos += 5;
  
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  const customerNet = customerDues.receivable - customerDues.payable;
  doc.setTextColor(customerNet >= 0 ? 0 : 255, customerNet >= 0 ? 128 : 0, 0);
  doc.text("Net Customer Position:", 20, yPos);
  doc.text(`Rs ${customerNet.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
  yPos += 12;

  // ===== SECTION 3: SUPPLIER ACCOUNTS =====
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "bold");
  doc.setFillColor(255, 152, 0);
  doc.rect(14, yPos - 5, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text("SUPPLIER ACCOUNTS", 16, yPos);
  yPos += 10;
  
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "normal");
  
  doc.text(`Dues TO Suppliers (Payable):`, 20, yPos);
  doc.text(`Rs ${supplierDues.payable.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`(${supplierDues.payableCount} suppliers)`, 145, yPos);
  yPos += 6;
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Dues FROM Suppliers (Receivable):`, 20, yPos);
  doc.text(`Rs ${supplierDues.receivable.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`(${supplierDues.receivableCount} suppliers)`, 145, yPos);
  yPos += 6;
  
  doc.setLineWidth(0.3);
  doc.line(20, yPos, 140, yPos);
  yPos += 5;
  
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  const supplierNet = supplierDues.receivable - supplierDues.payable;
  doc.setTextColor(supplierNet >= 0 ? 0 : 255, supplierNet >= 0 ? 128 : 0, 0);
  doc.text("Net Supplier Position:", 20, yPos);
  doc.text(`Rs ${supplierNet.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
  yPos += 12;

  // ===== SECTION 4: EXPENSES SUMMARY =====
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "bold");
  doc.setFillColor(244, 67, 54);
  doc.rect(14, yPos - 5, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text("EXPENSES SUMMARY", 16, yPos);
  yPos += 10;
  
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "normal");
  
  doc.text("Cash Expenses:", 20, yPos);
  doc.text(`Rs ${cashExpensesFromExpensesApi.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
  yPos += 6;
  
  doc.text("Bank Expenses:", 20, yPos);
  doc.text(`Rs ${totalBankExpenses.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
  yPos += 6;
  
  doc.setLineWidth(0.3);
  doc.line(20, yPos, 140, yPos);
  yPos += 5;
  
  doc.setFont(undefined, "bold");
  doc.text("Total Expenses:", 20, yPos);
  doc.text(`Rs ${(cashExpensesFromExpensesApi + totalBankExpenses).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
  yPos += 12;

  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // ===== SECTION 5: PROFIT & LOSS =====
  if (plData) {
    doc.setFont(undefined, "bold");
    doc.setFillColor(33, 150, 243);
    doc.rect(14, yPos - 5, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("PROFIT & LOSS STATEMENT", 16, yPos);
    yPos += 10;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    
    doc.text("Total Revenue:", 20, yPos);
    doc.setTextColor(0, 128, 0);
    doc.text(`Rs ${(plData.revenue || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 6;
    
    doc.setTextColor(0, 0, 0);
    doc.text("Cost of Goods Sold (COGS):", 20, yPos);
    doc.setTextColor(255, 0, 0);
    doc.text(`Rs ${(plData.cogs || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 6;
    
    doc.setLineWidth(0.3);
    doc.line(20, yPos, 140, yPos);
    yPos += 5;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "bold");
    doc.text("Gross Profit:", 20, yPos);
    doc.setTextColor(0, 100, 200);
    doc.text(`Rs ${(plData.grossProfit || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.text("Operating Expenses:", 20, yPos);
    doc.setTextColor(255, 0, 0);
    doc.text(`Rs ${(plData.expenses || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 6;
    
    if (plData.damageLoss !== undefined && plData.damageLoss > 0) {
      doc.setTextColor(0, 0, 0);
      doc.text("Damage & Loss:", 20, yPos);
      doc.setTextColor(255, 0, 0);
      doc.text(`Rs ${(plData.damageLoss || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
      yPos += 6;
    }
    
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 140, yPos);
    yPos += 6;
    
    const netProfit = plData.netProfit || 0;
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("NET PROFIT:", 20, yPos);
    doc.setTextColor(netProfit >= 0 ? 0 : 255, netProfit >= 0 ? 128 : 0, 0);
    doc.text(`Rs ${netProfit.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 10;
  }

  // ===== FOOTER =====
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont(undefined, "italic");
  doc.text("This is a computer-generated report. No signature required.", 105, 285, { align: "center" });
  doc.text(`Page 1 of ${doc.internal.getNumberOfPages()}`, 105, 290, { align: "center" });

  doc.save(`Financial_Report_${titleForPeriod.replace(/ /g, '_')}.pdf`);
};

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Card sx={{ mt: 3 }}>
        <CardContent>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <ReportIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h5" fontWeight={600}>
                Financial Report
              </Typography>
            </Box>

            <Button variant="contained" color="success" onClick={downloadComprehensiveReport}>
              Download Full Report PDF
            </Button>
          </Box>

          {/* Date Filter Controls */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} gap={2} flexWrap="wrap">
            <ButtonGroup variant="outlined" size="medium">
              <Button
                onClick={() => setReportType("monthly")}
                variant={reportType === "monthly" ? "contained" : "outlined"}
              >
                Monthly
              </Button>
              <Button
                onClick={() => setReportType("yearly")}
                variant={reportType === "yearly" ? "contained" : "outlined"}
              >
                Yearly
              </Button>
              <Button
                onClick={() => setReportType("daily")}
                variant={reportType === "daily" ? "contained" : "outlined"}
              >
                Daily
              </Button>
            </ButtonGroup>

            <Box display="flex" gap={2}>
              {(reportType === "daily" || reportType === "monthly") && (
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={selectedMonth}
                    label="Month"
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        {new Date(2025, i).toLocaleString("default", { month: "long" })}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  label="Year"
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
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
          </Box>

          <Typography variant="subtitle1" color="text.secondary" mb={3}>
            Showing report for: <strong>{titleForPeriod}</strong>
          </Typography>

          <Divider sx={{ mb: 4 }} />

          {/* Cash & Bank Summary */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Cash & Bank Summary
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Cash Balance"
                  value={availableCashBalance}
                  icon={CashIcon}
                  color={availableCashBalance > 0 ? "success" : "danger"}
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Bank Balance"
                  value={totalBankBalance}
                  icon={BankIcon}
                  color="primary"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Pending Cheques"
                  value={pendingCheques.amount}
                  count={pendingCheques.count}
                  icon={MoneyIcon}
                  color="warning"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Liquid Assets"
                  value={availableCashBalance + totalBankBalance}
                  icon={BankIcon}
                  color="info"
                  isCurrency={true}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Customer Accounts */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Customer Accounts
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  title="Dues FROM Customers"
                  subtitle="Amount customers owe you"
                  value={customerDues.receivable}
                  count={customerDues.receivableCount}
                  icon={PeopleIcon}
                  color="success"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  title="Dues TO Customers"
                  subtitle="Amount you owe customers"
                  value={customerDues.payable}
                  count={customerDues.payableCount}
                  icon={PeopleIcon}
                  color="danger"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  title="Net Customer Position"
                  subtitle="Receivable - Payable"
                  value={customerDues.receivable - customerDues.payable}
                  icon={ReportIcon}
                  color={customerDues.receivable - customerDues.payable >= 0 ? "success" : "danger"}
                  isCurrency={true}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Supplier Accounts */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Supplier Accounts
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  title="Dues TO Suppliers"
                  subtitle="Amount you owe suppliers"
                  value={supplierDues.payable}
                  count={supplierDues.payableCount}
                  icon={PeopleIcon}
                  color="danger"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  title="Dues FROM Suppliers"
                  subtitle="Amount suppliers owe you"
                  value={supplierDues.receivable}
                  count={supplierDues.receivableCount}
                  icon={PeopleIcon}
                  color="success"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  title="Net Supplier Position"
                  subtitle="Receivable - Payable"
                  value={supplierDues.receivable - supplierDues.payable}
                  icon={ReportIcon}
                  color={supplierDues.receivable - supplierDues.payable >= 0 ? "success" : "danger"}
                  isCurrency={true}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Profit & Loss */}
          <Box mb={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Profit & Loss
              </Typography>
              {plLoading && <CircularProgress size={20} />}
            </Box>
            
            {plData ? (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                  <MetricCard
                    title="Total Revenue"
                    value={plData.revenue || 0}
                    icon={ProfitIcon}
                    color="success"
                    isCurrency={true}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <MetricCard
                    title="COGS"
                    value={plData.cogs || 0}
                    icon={LossIcon}
                    color="warning"
                    isCurrency={true}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <MetricCard
                    title="Total Expenses"
                    value={plData.expenses || 0}
                    icon={LossIcon}
                    color="danger"
                    isCurrency={true}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <MetricCard
                    title="Gross Profit"
                    value={plData.grossProfit || 0}
                    icon={ProfitIcon}
                    color="info"
                    isCurrency={true}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <MetricCard
                    title="Net Profit"
                    value={plData.netProfit || 0}
                    icon={ReportIcon}
                    color={plData.netProfit >= 0 ? "success" : "danger"}
                    isCurrency={true}
                  />
                </Grid>
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No profit/loss data available for this period
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 4 }} />

        {/* Expenses Summary */}
          <Box mb={2}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Expenses Summary
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  title="Cash Expenses"
                  subtitle="Expenses paid in cash"
                  value={cashExpensesFromExpensesApi}
                  icon={CashIcon}
                  color="danger"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  title="Bank Expenses"
                  subtitle="Expenses via online/cheque"
                  value={totalBankExpenses}
                  icon={BankIcon}
                  color="danger"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  title="Total Expenses"
                  subtitle="All payment methods"
                  value={cashExpensesFromExpensesApi + totalBankExpenses}
                  icon={MoneyIcon}
                  color="warning"
                  isCurrency={true}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Damage Loss Summary - NEW SECTION */}
          <Divider sx={{ mb: 4, mt: 4 }} />

          <Box mb={2}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Damage & Loss Summary
            </Typography>
            <Grid container spacing={3}>
              {plData && plData.damageLoss !== undefined ? (
                <>
                  <Grid item xs={12} sm={6} md={4}>
                    <MetricCard
                      title="Total Damage Loss"
                      subtitle="Products marked as damaged"
                      value={plData.damageLoss || 0}
                      icon={LossIcon}
                      color="danger"
                      isCurrency={true}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <MetricCard
                      title="Regular Expenses"
                      subtitle="Operational expenses"
                      value={plData.expenses || 0}
                      icon={MoneyIcon}
                      color="warning"
                      isCurrency={true}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <MetricCard
                      title="Combined Expenses + Loss"
                      subtitle="Total expenses including damage"
                      value={(plData.expenses || 0) + (plData.damageLoss || 0)}
                      icon={MoneyIcon}
                      color="danger"
                      isCurrency={true}
                    />
                  </Grid>
                </>
              ) : (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    No damage loss data available for this period. Check the Damage Products section to record damages.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default Report;