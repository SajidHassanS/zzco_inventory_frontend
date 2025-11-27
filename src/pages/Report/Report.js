// src/pages/Report/Report.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { selectIsLoggedIn } from "../../redux/features/auth/authSlice";
import { getPendingCheques } from "../../redux/features/cheque/chequeSlice";
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
  Undo as ReturnIcon,
  LocalOffer as DiscountIcon,
  LocalShipping as ShippingIcon,
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
      case "purple": return "#9c27b0";
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
              {count} {count === 1 ? "item" : "items"}
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
  
  // Date filters
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
  const [shippers, setShippers] = useState([]);
  const [plData, setPlData] = useState(null);
  const [plLoading, setPlLoading] = useState(false);

  // ===== Helper functions =====
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
        fetchCashBalance(),
        fetchExpenses(),
        fetchCustomers(),
        fetchSuppliers(),
        fetchShippers(),
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
      setBanks(bankList);

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
      setBankTransactions(allTx);
    } catch (error) {
      console.error("❌ Error fetching banks:", error);
      setBanks([]);
      setBankTransactions([]);
    }
  };

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
        const { data } = await axios.get(`${API_BASE}${endpoint}`, { withCredentials: true });
        setCash(data);
        return;
      } catch (error) {
        continue;
      }
    }
    setCash(null);
  };

  const fetchExpenses = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/expenses/all`, { withCredentials: true });
      const expenseList = Array.isArray(data) ? data : [];
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
      setSuppliers(supplierList);
    } catch (error) {
      console.error("❌ Error fetching suppliers:", error);
      setSuppliers([]);
    }
  };

  const fetchShippers = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/shippers`, { withCredentials: true });
      const shipperList = Array.isArray(data) ? data : [];
      setShippers(shipperList);
    } catch (error) {
      console.error("❌ Error fetching shippers:", error);
      setShippers([]);
    }
  };

  const fetchProfitLoss = async () => {
    setPlLoading(true);
    try {
      const params = {
        period: reportType,
        year: selectedYear,
      };
      if (reportType === "daily" || reportType === "monthly") params.month = selectedMonth;

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

  // ===== CASH calculations =====
  const cashRowsRaw = useMemo(() => {
    const rows = cash?.transactions || cash?.allEntries || [];
    return rows;
  }, [cash]);

  const filteredCashTransactions = useMemo(() => {
    const filtered = cashRowsRaw
      .filter((t) => isInSelectedPeriod(pickWhen(t)))
      .filter((t) => !isReversalRow(t));
    return filtered;
  }, [cashRowsRaw, reportType, selectedYear, selectedMonth]);

  const totalCashAdds = useMemo(() => {
    const total = filteredCashTransactions.reduce((sum, t) => {
      const ttype = String(t.type || "").toLowerCase();
      const isCredit = ttype === "add" || ttype === "credit" || ttype === "deposit";
      return sum + (isCredit ? Math.abs(pickAmount(t)) : 0);
    }, 0);
    return total;
  }, [filteredCashTransactions]);

  const totalCashDeductsFromModule = useMemo(() => {
    const total = filteredCashTransactions.reduce((sum, t) => {
      return sum + (isCashOutType(t.type) ? Math.abs(pickAmount(t)) : 0);
    }, 0);
    return total;
  }, [filteredCashTransactions]);

  const availableCashBalance = useMemo(() => {
    if (cash && typeof cash.totalBalance === "number") {
      return Number(cash.totalBalance);
    }
    const calculated = totalCashAdds - totalCashDeductsFromModule;
    return calculated;
  }, [cash, totalCashAdds, totalCashDeductsFromModule]);

  const cashExpensesFromExpensesApi = useMemo(() => {
    const total = (expenses || [])
      .filter((e) => 
        (e.paymentMethod || "").toLowerCase() === "cash" && 
        isInSelectedPeriod(e.expenseDate || e.createdAt)
      )
      .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);
    return total;
  }, [expenses, reportType, selectedYear, selectedMonth]);

  // ===== Bank calculations =====
  const totalBankBalance = useMemo(() => {
    const total = banks.reduce((sum, bank) => sum + (Number(bank.balance) || 0), 0);
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

  // ===== Shipper dues =====
  const shipperDues = useMemo(() => {
    return shippers.reduce(
      (acc, shipper) => {
        const bal = Number(shipper.balance || 0);
        if (bal > 0) {
          acc.payable += bal;
          acc.payableCount++;
        } else if (bal < 0) {
          acc.receivable += Math.abs(bal);
          acc.receivableCount++;
        }
        return acc;
      },
      { payable: 0, payableCount: 0, receivable: 0, receivableCount: 0 }
    );
  }, [shippers]);

  // ===== Pending cheques =====
  const pendingCheques = useMemo(() => {
    if (!Array.isArray(chequesFromStore)) {
      return { count: 0, amount: 0 };
    }

    const pending = chequesFromStore.filter((c) => {
      return c.status === false && !c.cancelled && !c.transferred;
    });

    const totalAmount = pending.reduce((sum, c) => {
      return sum + (Number(c.amount) || 0);
    }, 0);

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

  // ===== PDF Export =====
  const downloadComprehensiveReport = () => {
    const doc = new jsPDF('portrait');
    
    // ===== COMPANY LOGO/HEADER =====
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 87, 34);
    doc.text("Z&Z TRADERS .CO", 105, 12, { align: "center" });
    
    doc.setLineWidth(0.8);
    doc.setDrawColor(255, 87, 34);
    doc.line(60, 15, 150, 15);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("FINANCIAL REPORT", 105, 22, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${titleForPeriod}`, 105, 28, { align: "center" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 33, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(14, 37, 196, 37);
    
    let yPos = 45;

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
    
    doc.text("Total Cash Balance:", 20, yPos);
    doc.text(`Rs ${availableCashBalance.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 6;
    
    doc.text("Total Bank Balance:", 20, yPos);
    doc.text(`Rs ${totalBankBalance.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 6;
    
    doc.text("Pending Cheques:", 20, yPos);
    doc.text(`Rs ${pendingCheques.amount.toLocaleString('en-PK', {minimumFractionDigits: 2})} (${pendingCheques.count} cheques)`, 140, yPos, { align: "right" });
    yPos += 6;
    
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
    yPos += 6;
    
    doc.text(`Dues TO Customers (Payable):`, 20, yPos);
    doc.text(`Rs ${customerDues.payable.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 6;
    
    doc.setLineWidth(0.3);
    doc.line(20, yPos, 140, yPos);
    yPos += 5;
    
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
    yPos += 6;
    
    doc.text(`Dues FROM Suppliers (Receivable):`, 20, yPos);
    doc.text(`Rs ${supplierDues.receivable.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 6;
    
    doc.setLineWidth(0.3);
    doc.line(20, yPos, 140, yPos);
    yPos += 5;
    
    doc.setFont(undefined, "bold");
    const supplierNet = supplierDues.receivable - supplierDues.payable;
    doc.setTextColor(supplierNet >= 0 ? 0 : 255, supplierNet >= 0 ? 128 : 0, 0);
    doc.text("Net Supplier Position:", 20, yPos);
    doc.text(`Rs ${supplierNet.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 12;

    // ===== SECTION 4: SHIPPER ACCOUNTS (NEW) =====
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "bold");
    doc.setFillColor(121, 85, 72);
    doc.rect(14, yPos - 5, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("SHIPPER ACCOUNTS", 16, yPos);
    yPos += 10;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    
    doc.text(`Dues TO Shippers (Payable):`, 20, yPos);
    doc.text(`Rs ${shipperDues.payable.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 6;
    
    doc.text(`Overpaid to Shippers (Receivable):`, 20, yPos);
    doc.text(`Rs ${shipperDues.receivable.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 6;

    doc.text(`Shipping Expenses (Period):`, 20, yPos);
    doc.setTextColor(255, 0, 0);
    doc.text(`Rs ${(plData?.shippingExpenses || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 6;

    doc.setTextColor(0, 0, 0);
    doc.text(`Shipper Discounts Received:`, 20, yPos);
    doc.setTextColor(0, 128, 0);
    doc.text(`Rs ${(plData?.shipperDiscounts || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 6;
    
    doc.setLineWidth(0.3);
    doc.line(20, yPos, 140, yPos);
    yPos += 5;
    
    doc.setFont(undefined, "bold");
    const shipperNet = shipperDues.receivable - shipperDues.payable;
    doc.setTextColor(shipperNet >= 0 ? 0 : 255, shipperNet >= 0 ? 128 : 0, 0);
    doc.text("Net Shipper Position:", 20, yPos);
    doc.text(`Rs ${shipperNet.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
    yPos += 12;

    // ===== SECTION 5: PROFIT & LOSS =====
    if (plData) {
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "bold");
      doc.setFillColor(33, 150, 243);
      doc.rect(14, yPos - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text("PROFIT & LOSS", 16, yPos);
      yPos += 10;
      
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      
      doc.text("Total Revenue:", 20, yPos);
      doc.setTextColor(0, 128, 0);
      doc.text(`Rs ${(plData.revenue || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
      yPos += 6;
      
      doc.setTextColor(0, 0, 0);
      doc.text("Cost of Goods Sold (COGS):", 20, yPos);
      doc.setTextColor(255, 152, 0);
      doc.text(`Rs ${(plData.cogs || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
      yPos += 6;
      
      doc.setTextColor(0, 0, 0);
      doc.text("Total Expenses:", 20, yPos);
      doc.setTextColor(255, 0, 0);
      doc.text(`Rs ${(plData.totalExpenses || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
      yPos += 6;

      doc.setTextColor(0, 0, 0);
      doc.text("Other Income (Discounts Received):", 20, yPos);
      doc.setTextColor(0, 128, 0);
      doc.text(`Rs ${(plData.otherIncome || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
      yPos += 6;
      
      doc.setLineWidth(0.3);
      doc.line(20, yPos, 140, yPos);
      yPos += 5;
      
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "bold");
      doc.text("Gross Profit:", 20, yPos);
      doc.setTextColor(0, 100, 200);
      doc.text(`Rs ${(plData.grossProfit || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
      yPos += 6;
      
      const netProfit = plData.netProfit || 0;
      doc.setTextColor(0, 0, 0);
      doc.text("Net Profit:", 20, yPos);
      doc.setTextColor(netProfit >= 0 ? 0 : 255, netProfit >= 0 ? 128 : 0, 0);
      doc.text(`Rs ${netProfit.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
      yPos += 12;
    }

    // ===== SECTION 6: SHIPPING SUMMARY (NEW) =====
    if (plData && ((plData.shippingExpenses || 0) > 0 || (plData.shipperDiscounts || 0) > 0)) {
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "bold");
      doc.setFillColor(121, 85, 72);
      doc.rect(14, yPos - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text("SHIPPING SUMMARY", 16, yPos);
      yPos += 10;
      
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      
      doc.text("Shipping Expenses:", 20, yPos);
      doc.setTextColor(255, 0, 0);
      doc.text(`Rs ${(plData.shippingExpenses || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})} (${plData.shippingCount || 0} shipments)`, 140, yPos, { align: "right" });
      yPos += 6;
      
      doc.setTextColor(0, 0, 0);
      doc.text("Shipper Discounts Received:", 20, yPos);
      doc.setTextColor(0, 128, 0);
      doc.text(`Rs ${(plData.shipperDiscounts || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})} (${plData.shipperDiscountCount || 0} times)`, 140, yPos, { align: "right" });
      yPos += 6;
      
      doc.setLineWidth(0.3);
      doc.line(20, yPos, 140, yPos);
      yPos += 5;
      
      doc.setFont(undefined, "bold");
      const netShippingCost = (plData.shippingExpenses || 0) - (plData.shipperDiscounts || 0);
      doc.setTextColor(netShippingCost > 0 ? 255 : 0, netShippingCost > 0 ? 0 : 128, 0);
      doc.text("Net Shipping Cost:", 20, yPos);
      doc.text(`Rs ${netShippingCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
      yPos += 12;
    }

    // ===== SECTION 7: RETURNS SUMMARY =====
    if (plData && ((plData.supplierRefunds || 0) > 0 || (plData.customerRefunds || 0) > 0 || (plData.supplierReturnCount || 0) > 0 || (plData.customerReturnCount || 0) > 0)) {
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "bold");
      doc.setFillColor(156, 39, 176);
      doc.rect(14, yPos - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text("RETURNS SUMMARY", 16, yPos);
      yPos += 10;
      
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      
      doc.text("Returns TO Supplier:", 20, yPos);
      doc.text(`${plData.supplierReturnCount || 0} returns, ${plData.supplierReturnQty || 0} items`, 100, yPos);
      doc.setTextColor(0, 128, 0);
      doc.text(`Rs ${(plData.supplierRefunds || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
      yPos += 6;
      
      doc.setTextColor(0, 0, 0);
      doc.text("Returns FROM Customer:", 20, yPos);
      doc.text(`${plData.customerReturnCount || 0} returns, ${plData.customerReturnQty || 0} items`, 100, yPos);
      doc.setTextColor(255, 0, 0);
      doc.text(`Rs ${(plData.customerRefunds || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
      yPos += 12;
    }

    // ===== SECTION 8: DISCOUNTS SUMMARY =====
    if (plData && ((plData.customerDiscounts || 0) > 0 || (plData.supplierDiscounts || 0) > 0 || (plData.shipperDiscounts || 0) > 0)) {
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "bold");
      doc.setFillColor(103, 58, 183);
      doc.rect(14, yPos - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text("DISCOUNTS SUMMARY", 16, yPos);
      yPos += 10;
      
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      
      doc.text("Discounts Given to Customers:", 20, yPos);
      doc.setTextColor(255, 0, 0);
      doc.text(`Rs ${(plData.customerDiscounts || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})} (${plData.customerDiscountCount || 0} times)`, 140, yPos, { align: "right" });
      yPos += 6;
      
      doc.setTextColor(0, 0, 0);
      doc.text("Discounts Received from Suppliers:", 20, yPos);
      doc.setTextColor(0, 128, 0);
      doc.text(`Rs ${(plData.supplierDiscounts || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})} (${plData.supplierDiscountCount || 0} times)`, 140, yPos, { align: "right" });
      yPos += 6;

      doc.setTextColor(0, 0, 0);
      doc.text("Discounts Received from Shippers:", 20, yPos);
      doc.setTextColor(0, 128, 0);
      doc.text(`Rs ${(plData.shipperDiscounts || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})} (${plData.shipperDiscountCount || 0} times)`, 140, yPos, { align: "right" });
      yPos += 6;
      
      doc.setLineWidth(0.3);
      doc.line(20, yPos, 140, yPos);
      yPos += 5;
      
      doc.setFont(undefined, "bold");
      const netDiscountImpact = (plData.supplierDiscounts || 0) + (plData.shipperDiscounts || 0) - (plData.customerDiscounts || 0);
      doc.setTextColor(netDiscountImpact >= 0 ? 0 : 255, netDiscountImpact >= 0 ? 128 : 0, 0);
      doc.text("Net Discount Impact:", 20, yPos);
      doc.text(`Rs ${netDiscountImpact.toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
      yPos += 12;
    }

    // ===== SECTION 9: DAMAGE & LOSS =====
    if (plData && (plData.damageLoss || 0) > 0) {
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "bold");
      doc.setFillColor(244, 67, 54);
      doc.rect(14, yPos - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text("DAMAGE & LOSS", 16, yPos);
      yPos += 10;
      
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      
      doc.text("Total Damage Loss:", 20, yPos);
      doc.setTextColor(255, 0, 0);
      doc.text(`Rs ${(plData.damageLoss || 0).toLocaleString('en-PK', {minimumFractionDigits: 2})}`, 140, yPos, { align: "right" });
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

          {/* Shipper Accounts (NEW) */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Shipper Accounts
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Shippers"
                  subtitle="Active shipper accounts"
                  value={shippers.length}
                  icon={ShippingIcon}
                  color="info"
                  isCurrency={false}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Dues TO Shippers"
                  subtitle="Amount you owe shippers"
                  value={shipperDues.payable}
                  count={shipperDues.payableCount}
                  icon={ShippingIcon}
                  color="danger"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Overpaid to Shippers"
                  subtitle="Advance payments"
                  value={shipperDues.receivable}
                  count={shipperDues.receivableCount}
                  icon={ShippingIcon}
                  color="success"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Net Shipper Position"
                  subtitle="Overpaid - Payable"
                  value={shipperDues.receivable - shipperDues.payable}
                  icon={ReportIcon}
                  color={shipperDues.receivable - shipperDues.payable >= 0 ? "success" : "danger"}
                  isCurrency={true}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* PROFIT & LOSS - 5 cards */}
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
                    subtitle="Expenses + Damage + Discounts + Shipping"
                    value={plData.totalExpenses || 0}
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
                    color={(plData.netProfit || 0) >= 0 ? "success" : "danger"}
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

          {/* SHIPPING SUMMARY (NEW) */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Shipping Summary (Period)
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Shipping Expenses"
                  subtitle="Paid to shippers (reduces profit)"
                  value={plData?.shippingExpenses || 0}
                  count={plData?.shippingCount || 0}
                  icon={ShippingIcon}
                  color="danger"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Shipper Discounts"
                  subtitle="Discounts from shippers (adds to profit)"
                  value={plData?.shipperDiscounts || 0}
                  count={plData?.shipperDiscountCount || 0}
                  icon={DiscountIcon}
                  color="success"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Net Shipping Cost"
                  subtitle="Expenses - Discounts"
                  value={(plData?.shippingExpenses || 0) - (plData?.shipperDiscounts || 0)}
                  icon={ShippingIcon}
                  color={(plData?.shippingExpenses || 0) - (plData?.shipperDiscounts || 0) > 0 ? "warning" : "success"}
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Shipments"
                  subtitle="Number of shipping transactions"
                  value={plData?.shippingCount || 0}
                  icon={ShippingIcon}
                  color="info"
                  isCurrency={false}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* RETURNS SUMMARY */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Returns Summary
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Returns TO Supplier"
                  subtitle="Refund received from suppliers"
                  value={plData?.supplierRefunds || 0}
                  count={plData?.supplierReturnCount || 0}
                  icon={ReturnIcon}
                  color="success"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Supplier Return Qty"
                  subtitle="Items returned to suppliers"
                  value={plData?.supplierReturnQty || 0}
                  icon={ReturnIcon}
                  color="info"
                  isCurrency={false}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Returns FROM Customer"
                  subtitle="Refund paid to customers"
                  value={plData?.customerRefunds || 0}
                  count={plData?.customerReturnCount || 0}
                  icon={ReturnIcon}
                  color="danger"
                  isCurrency={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Customer Return Qty"
                  subtitle="Items returned by customers"
                  value={plData?.customerReturnQty || 0}
                  icon={ReturnIcon}
                  color="purple"
                  isCurrency={false}
                />
              </Grid>
            </Grid>
          </Box>
<Divider sx={{ mb: 4 }} />

      {/* DISCOUNTS SUMMARY */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Discounts Summary
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Discounts Given"
              subtitle="Discounts to customers (reduces profit)"
              value={plData?.customerDiscounts || 0}
              count={plData?.customerDiscountCount || 0}
              icon={DiscountIcon}
              color="danger"
              isCurrency={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Discounts Received"
              subtitle="Discounts from suppliers (adds to profit)"
              value={plData?.supplierDiscounts || 0}
              count={plData?.supplierDiscountCount || 0}
              icon={DiscountIcon}
              color="success"
              isCurrency={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Net Discount Impact"
              subtitle="Received - Given"
              value={(plData?.supplierDiscounts || 0) + (plData?.shipperDiscounts || 0) - (plData?.customerDiscounts || 0)}
              icon={ReportIcon}
              color={(plData?.supplierDiscounts || 0) + (plData?.shipperDiscounts || 0) - (plData?.customerDiscounts || 0) >= 0 ? "success" : "danger"}
              isCurrency={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Other Income"
              subtitle="Supplier + Shipper discounts"
              value={plData?.otherIncome || 0}
              icon={ProfitIcon}
              color="info"
              isCurrency={true}
            />
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* DAMAGE & LOSS */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Damage & Loss Summary
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <MetricCard
              title="Total Damage Loss"
              subtitle="Products marked as damaged"
              value={plData?.damageLoss || 0}
              icon={LossIcon}
              color="danger"
              isCurrency={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <MetricCard
              title="Regular Expenses"
              subtitle="Operational expenses"
              value={plData?.expenses || 0}
              icon={MoneyIcon}
              color="warning"
              isCurrency={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <MetricCard
              title="Combined Expenses + Loss"
              subtitle="Total expenses including damage"
              value={(plData?.expenses || 0) + (plData?.damageLoss || 0)}
              icon={MoneyIcon}
              color="danger"
              isCurrency={true}
            />
          </Grid>
        </Grid>
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
    </CardContent>
  </Card>
</Container>
);
}
export default Report;