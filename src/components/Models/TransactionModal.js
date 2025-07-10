import React, { useEffect, useState } from 'react';
import { Modal, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, CircularProgress } from '@mui/material';
import axios from 'axios';

const TransactionHistoryModal = ({ open, onClose, entry, entryType }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000/";

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!entry?._id) return;
      setLoading(true);
      try {
        // 🔹 Determine correct endpoint based on entryType
        const apiPath = entryType === "bank"
          ? `api/banks/${entry._id}/transactions`
          : `api/cash/${entry._id}/transactions`;

        const response = await axios.get(`${BACKEND_URL}${apiPath}`);
        setTransactions(response.data); // Expecting an array
      } catch (error) {
        console.error("Failed to fetch transactions", error.response?.data || error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchTransactions();
    }
  }, [entry, entryType, open, BACKEND_URL]);

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ width: 600, p: 3, mx: "auto", mt: 5, bgcolor: "background.paper", boxShadow: 24, borderRadius: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">Transaction History</Typography>
          <Button onClick={onClose} variant="outlined" size="small">
            Close
          </Button>
        </Box>

        <Typography variant="subtitle2" color="text.secondary" mb={2}>
          {entryType === "bank" ? "Bank" : "Cash"} Transactions
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" mt={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <TableRow key={transaction._id}>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell>{transaction.amount}</TableCell>
                      <TableCell>{new Date(transaction.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4}>No transactions available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Modal>
  );
};

export default TransactionHistoryModal;
