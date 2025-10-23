import React, { useEffect, useState } from "react";
import { Modal, Box, Typography, Button } from "@mui/material";
import axios from "axios";
import CustomTable from "../CustomTable/CustomTable";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TransactionHistoryModal = ({ open, onClose, customer }) => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalBalance, setTotalBalance] = useState(0);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api/customers`;

  useEffect(() => {
    if (!open || !customer?._id) return;

    const fetchTransactions = async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/transactionHistory/${customer._id}`,
          { withCredentials: true }
        );

        const history = Array.isArray(data?.transactionHistory)
          ? data.transactionHistory
          : [];

        let balance = 0;
        const ledger = history.map((t) => {
          const type = String(t?.type || "").toLowerCase();
          const amt = Number(t?.amount || 0);
          const debit = type === "debit" ? amt : 0;
          const credit = type === "credit" ? amt : 0;
          balance += credit - debit;

          return {
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
  }, [open, customer?._id, API_URL]);

  // PDF export (now includes Description)
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text(`Ledger for ${customer?.username || "-"}`, 14, 10);

    const tableColumn = [
      "Date",
      "Description",
      "Payment Type",
      "Debit",
      "Credit",
      "Cheque Date",
      "Running Balance",
    ];

    const tableRows = transactions.map((tr) => [
      tr?.date ? new Date(tr.date).toLocaleDateString() : "-",
      (tr?.description || "-"),
      (tr?.paymentMethod || "-"),
      Number(tr?.debit ?? 0).toFixed(2),
      Number(tr?.credit ?? 0).toFixed(2),
      tr?.chequeDate ? new Date(tr.chequeDate).toLocaleDateString() : "-",
      Number(tr?.runningBalance ?? 0).toFixed(2),
    ]);

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });

    const endY = doc.lastAutoTable?.finalY ?? 20;
    doc.text(`Total Balance: ${Number(totalBalance || 0).toFixed(2)}`, 14, endY + 10);
    doc.save(`Customer_Transaction_History_${customer?.username || "customer"}.pdf`);
  };

  // Table columns (added Description)
  const columns = [
    {
      field: "date",
      headerName: "Date",
      renderCell: (row) => (row?.date ? new Date(row.date).toLocaleDateString() : "-"),
    },
    {
      field: "description",
      headerName: "Description",
      renderCell: (row) => row?.description || "-",
    },
    { field: "paymentMethod", headerName: "Payment Type" },
    {
      field: "debit",
      headerName: "Debit",
      renderCell: (row) => (
        <span style={{ color: "red" }}>
          {Number(row?.debit ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      field: "credit",
      headerName: "Credit",
      renderCell: (row) => (
        <span style={{ color: "green" }}>
          {Number(row?.credit ?? 0).toFixed(2)}
        </span>
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
      renderCell: (row) => <span>{Number(row?.runningBalance ?? 0).toFixed(2)}</span>,
    },
  ];

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          width: 900,
          p: 3,
          mx: "auto",
          mt: 5,
          bgcolor: "background.paper",
          boxShadow: 24,
          borderRadius: 1,
          overflow: "auto",
        }}
      >
        <Typography variant="h6">Ledger for {customer?.username}</Typography>

        <CustomTable
          columns={columns}
          data={transactions}
          page={page}
          rowsPerPage={rowsPerPage}
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

export default TransactionHistoryModal;
