// src/components/Models/SupplierTransactionHistoryModal.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Modal, Box, Typography, Button } from "@mui/material";
import axios from "axios";
import CustomTable from "../CustomTable/CustomTable";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SupplierTransactionHistoryModal = ({ open, onClose, supplier }) => {
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);

  // Local pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api/suppliers`;

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Parse qty from flexible description patterns
  const parseQtyFromDesc = (desc) => {
    const s = String(desc || "");

    // 1) "<num> x" or "<num> ×"
    let m = s.match(/(\d+)\s*[x×]\s/i);
    if (m) return Number(m[1]);

    // 2) "qty: <num>" or "quantity: <num>" or "qty <num>"
    m = s.match(/qty(?:uantity)?\s*[:\-]?\s*(\d+)/i);
    if (m) return Number(m[1]);

    // 3) "<num> pcs|pieces|units|bags|boxes|kg|liters"
    m = s.match(/(\d+)\s*(pcs?|pieces?|units?|bags?|boxes?|kg|kilograms?|lts?|liters?)/i);
    if (m) return Number(m[1]);

    // 4) "<num> @ <price>" (common “qty @ unitPrice” style)
    m = s.match(/(\d+)\s*@\s*\d+(?:[.,]\d+)?/i);
    if (m) return Number(m[1]);

    // 5) "(qty <num>)" or "(qty: <num>)"
    m = s.match(/\(?\s*qty\s*[:\-]?\s*(\d+)\s*\)?/i);
    if (m) return Number(m[1]);

    return 0;
  };

  // Prefer explicit quantity-like fields; fallback to description
  const normalizeQty = (t) => {
    const direct =
      toNum(t?.quantity) ||
      toNum(t?.qty) ||
      toNum(t?.stockSold) ||
      toNum(t?.units) ||
      toNum(t?.count);

    if (direct > 0) return direct;
    return parseQtyFromDesc(t?.description);
  };

  // Fetch & build running ledger (+ normalize quantity)
  useEffect(() => {
    if (!open || !supplier?._id) return;

    const fetchTransactions = async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/${supplier._id}/transaction-history`,
          { withCredentials: true }
        );

        const history = Array.isArray(data?.transactionHistory)
          ? data.transactionHistory
          : [];

        let balance = 0;
        const ledger = history.map((t, idx) => {
          const type = String(t?.type || "").toLowerCase();
          const amount = toNum(t?.amount);
          const debit = type === "debit" ? amount : 0;
          const credit = type === "credit" ? amount : 0;
          balance += credit - debit;

          const quantity = normalizeQty(t);

          return {
            id: t._id || idx,
            ...t,
            quantity,
            debit,
            credit,
            runningBalance: balance,
          };
        });

        setTransactions(ledger);
        setTotalBalance(balance);
      } catch (err) {
        console.error("Error fetching supplier transaction history:", err);
      }
    };

    fetchTransactions();
  }, [open, supplier?._id, API_URL]);

  // Pagination handlers expected by CustomTable
  const handlePageChange = (nextPage) => setPage(Math.max(0, Number(nextPage) || 0));
  const handleRowsPerPageChange = (nextRpp) => {
    setRowsPerPage(Number(nextRpp) || 5);
    setPage(0);
  };

  // PDF download (includes Description + Qty)
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text(`Ledger for ${supplier?.username || "-"}`, 14, 10);

    const tableColumn = [
      "Date",
      "Product Name",
      "Description",
      "Qty",
      "Payment Type",
      "Debit",
      "Credit",
      "Cheque Date",
      "Running Balance",
    ];

    const tableRows = transactions.map((tr) => [
      tr?.date ? new Date(tr.date).toLocaleDateString() : "-",
      tr?.productName || "-",
      tr?.description || "-",
      toNum(tr?.quantity) > 0 ? tr.quantity : "-",
      tr?.paymentMethod
        ? String(tr.paymentMethod).charAt(0).toUpperCase() +
          String(tr.paymentMethod).slice(1).toLowerCase()
        : "-",
      Number(tr?.debit ?? 0).toFixed(2),
      Number(tr?.credit ?? 0).toFixed(2),
      tr?.chequeDate ? new Date(tr.chequeDate).toLocaleDateString() : "-",
      Number(tr?.runningBalance ?? 0).toFixed(2),
    ]);

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    const endY = doc.lastAutoTable?.finalY ?? 20;
    doc.text(`Total Balance: ${Number(totalBalance || 0).toFixed(2)}`, 14, endY + 10);
    doc.save(`Supplier_Transaction_History_${supplier?.username || "supplier"}.pdf`);
  };

  // Columns for CustomTable (use normalized quantity)
  const columns = useMemo(
    () => [
      {
        field: "date",
        headerName: "Date",
        renderCell: (row) =>
          row?.date ? new Date(row.date).toLocaleDateString() : "-",
      },
      { field: "productName", headerName: "Product Name" },
      { field: "description", headerName: "Description" },
      {
        field: "quantity",
        headerName: "Qty",
        renderCell: (row) => (toNum(row?.quantity) > 0 ? row.quantity : "-"),
      },
      {
        field: "paymentMethod",
        headerName: "Payment Type",
        renderCell: (row) => {
          const pm = String(row?.paymentMethod || "");
          return pm ? pm.charAt(0).toUpperCase() + pm.slice(1).toLowerCase() : "-";
        },
      },
      {
        field: "debit",
        headerName: "Debit",
        renderCell: (row) => (
          <span style={{ color: "red" }}>{Number(row?.debit ?? 0).toFixed(2)}</span>
        ),
      },
      {
        field: "credit",
        headerName: "Credit",
        renderCell: (row) => (
          <span style={{ color: "green" }}>{Number(row?.credit ?? 0).toFixed(2)}</span>
        ),
      },
      {
        field: "chequeDate",
        headerName: "Cheque Date",
        renderCell: (row) =>
          row?.chequeDate ? new Date(row.chequeDate).toLocaleDateString() : "-",
      },
      {
        field: "runningBalance",
        headerName: "Running Balance",
        renderCell: (row) => (
          <span>{Number(row?.runningBalance ?? 0).toFixed(2)}</span>
        ),
      },
    ],
    []
  );

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          width: 1000,
          p: 3,
          mx: "auto",
          mt: 5,
          bgcolor: "background.paper",
          boxShadow: 24,
          borderRadius: 1,
          overflow: "auto",
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Ledger for {supplier?.username}
        </Typography>

        <CustomTable
          columns={columns}
          data={transactions}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: "bold", color: totalBalance >= 0 ? "green" : "red" }}
          >
            Total Balance: {Number(totalBalance || 0).toFixed(2)}
          </Typography>

          <Box>
            <Button variant="contained" color="secondary" onClick={downloadPDF} sx={{ mr: 2 }}>
              Download PDF
            </Button>
            <Button variant="contained" color="primary" onClick={onClose}>
              Close
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default SupplierTransactionHistoryModal;
