import React, { useEffect, useState } from "react";
import { Modal, Box, Typography, Button } from "@mui/material";
import axios from 'axios';
import CustomTable from "../CustomTable/CustomTable";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // ✅ Correct import

const SupplierTransactionHistoryModal = ({ open, onClose, supplier }) => {
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api/suppliers`;

  useEffect(() => {
    if (open && supplier) {
      const fetchTransactions = async () => {
        try {
          const response = await axios.get(
            `${API_URL}/${supplier._id}/transaction-history`,
            {
              withCredentials: true, // ✅ Ensures cookies (e.g., session tokens) are included
            }
          );
          const transactionHistory = response.data.transactionHistory || [];

          let balance = 0;
          const ledger = transactionHistory.map(transaction => {
            const isDebit = transaction.type.toLowerCase() === 'debit';
            const debit = isDebit ? transaction.amount : 0;
            const credit = isDebit ? 0 : transaction.amount;
            balance += credit - debit;

            return {
              ...transaction,
              debit,
              credit,
              runningBalance: balance,
            };
          });

          setTransactions(ledger);
          setTotalBalance(balance);
        } catch (error) {
          console.error("Error fetching transaction history:", error);
        }
      };
      fetchTransactions();
    }
  }, [open, supplier, API_URL]);

  // ✅ Function to download the PDF 
  const downloadPDF = () => { 
    const doc = new jsPDF();
    doc.text(`Ledger for ${supplier?.username}`, 14, 10);

    const tableColumn = ["Date", "Product Name", "Payment Type", "Debit", "Credit", "Cheque Date", "Running Balance"];
    const tableRows = transactions.map(transaction => [
      new Date(transaction.date).toLocaleDateString(),
      transaction.productName || "-",
      transaction.paymentMethod || "-",
      transaction.debit.toFixed(2),
      transaction.credit.toFixed(2),
      transaction.chequeDate ? new Date(transaction.chequeDate).toLocaleDateString() : "-",
      transaction.runningBalance.toFixed(2),
    ]);

    // ✅ Correct usage of autoTable
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.text(`Total Balance: ${totalBalance.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
    doc.save(`Supplier_Transaction_History_${supplier?.username}.pdf`);
  };

  const columns = [
    { field: 'date', headerName: 'Date', renderCell: (row) => new Date(row.date).toLocaleDateString() },
    { field: 'productName', headerName: 'Product Name' },
    { field: 'paymentMethod', headerName: 'Payment Type' },
    {
      field: 'debit', headerName: 'Debit',
      renderCell: (row) => <span style={{ color: 'red' }}>{row.debit.toFixed(2)}</span>
    },
    {
      field: 'credit', headerName: 'Credit',
      renderCell: (row) => <span style={{ color: 'green' }}>{row.credit.toFixed(2)}</span>
    },
    {
      field: 'chequeDate', headerName: 'Cheque Date',
      renderCell: (row) => row.chequeDate ? new Date(row.chequeDate).toLocaleDateString() : '-'
    },
    {
      field: 'runningBalance', headerName: 'Running Balance',
      renderCell: (row) => <span>{row.runningBalance.toFixed(2)}</span>
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
        <Typography variant="h6">Ledger for {supplier?.username}</Typography>

        <CustomTable
          columns={columns}
          data={transactions}
          page={page}
          rowsPerPage={rowsPerPage}
        />

        {/* Footer section with total balance, download PDF, and close buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 'bold', color: totalBalance >= 0 ? 'green' : 'red' }}
          >
            Total Balance: {totalBalance.toFixed(2)}
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
