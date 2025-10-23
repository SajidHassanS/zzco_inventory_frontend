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
  const [page, setPage] = useState(0); // 0-based
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api/suppliers`;

  // Fetch & build running ledger
  useEffect(() => {
    if (!open || !supplier?._id) return;

    const fetchTransactions = async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/${supplier._id}/transaction-history`,
          { withCredentials: true }
        );

        const history = data?.transactionHistory || [];

        // Build debit/credit + running balance
        let balance = 0;
        const ledger = history.map((t, idx) => {
          const isDebit = String(t.type || "").toLowerCase() === "debit";
          const debit = isDebit ? Number(t.amount || 0) : 0;
          const credit = isDebit ? 0 : Number(t.amount || 0);
          balance += credit - debit;

          return {
            // give each row a stable id for tables that need it
            id: t._id || idx,
            ...t,
            debit,
            credit,
            runningBalance: balance,
          };
        });

        setTransactions(ledger);
        setTotalBalance(balance);
      } catch (err) {
        console.error("Error fetching transaction history:", err);
      }
    };

    fetchTransactions();
  }, [open, supplier?._id, API_URL]);

  // Pagination handlers expected by CustomTable
  const handlePageChange = (nextPage) => {
    setPage(Math.max(0, Number(nextPage) || 0));
  };

  const handleRowsPerPageChange = (nextRpp) => {
    setRowsPerPage(Number(nextRpp) || 5);
    setPage(0);
  };

  // PDF download (now includes Description + Qty)
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
      tr.date ? new Date(tr.date).toLocaleDateString() : "-",
      tr.productName || "-",
      tr.description || "-",                  // ✅ description in PDF
      (tr.quantity ?? "") === "" ? "-" : tr.quantity, // ✅ quantity in PDF
      tr.paymentMethod
        ? String(tr.paymentMethod).charAt(0).toUpperCase() +
          String(tr.paymentMethod).slice(1).toLowerCase()
        : "-",
      (tr.debit ?? 0).toFixed(2),
      (tr.credit ?? 0).toFixed(2),
      tr.chequeDate ? new Date(tr.chequeDate).toLocaleDateString() : "-",
      (tr.runningBalance ?? 0).toFixed(2),
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    const endY = doc.lastAutoTable?.finalY ?? 20;
    doc.text(
      `Total Balance: ${Number(totalBalance || 0).toFixed(2)}`,
      14,
      endY + 10
    );
    doc.save(
      `Supplier_Transaction_History_${supplier?.username || "supplier"}.pdf`
    );
  };

  // Columns for CustomTable (now includes Description + Qty)
  const columns = useMemo(
    () => [
      {
        field: "date",
        headerName: "Date",
        renderCell: (row) =>
          row.date ? new Date(row.date).toLocaleDateString() : "-",
      },
      { field: "productName", headerName: "Product Name" },
      { field: "description", headerName: "Description" }, // ✅ show dynamic description
      {
        field: "quantity",
        headerName: "Qty", // ✅ show quantity if you sent it in the tx
        renderCell: (row) =>
          (row.quantity ?? "") === "" ? "-" : String(row.quantity),
      },
      {
        field: "paymentMethod",
        headerName: "Payment Type",
        renderCell: (row) => {
          const pm = String(row.paymentMethod || "");
          if (!pm) return "-";
          return pm.charAt(0).toUpperCase() + pm.slice(1).toLowerCase();
        },
      },
      {
        field: "debit",
        headerName: "Debit",
        renderCell: (row) => (
          <span style={{ color: "red" }}>
            {(row.debit ?? 0).toFixed(2)}
          </span>
        ),
      },
      {
        field: "credit",
        headerName: "Credit",
        renderCell: (row) => (
          <span style={{ color: "green" }}>
            {(row.credit ?? 0).toFixed(2)}
          </span>
        ),
      },
      {
        field: "chequeDate",
        headerName: "Cheque Date",
        renderCell: (row) =>
          row.chequeDate ? new Date(row.chequeDate).toLocaleDateString() : "-",
      },
      {
        field: "runningBalance",
        headerName: "Running Balance",
        renderCell: (row) => (
          <span>{(row.runningBalance ?? 0).toFixed(2)}</span>
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

        {/* Footer */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 2,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: "bold",
              color: totalBalance >= 0 ? "green" : "red",
            }}
          >
            Total Balance: {Number(totalBalance || 0).toFixed(2)}
          </Typography>

          <Box>
            <Button
              variant="contained"
              color="secondary"
              onClick={downloadPDF}
              sx={{ mr: 2 }}
            >
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
