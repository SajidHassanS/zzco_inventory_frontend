import React, { useEffect, useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress
} from '@mui/material';
import axios from 'axios';

const TransactionHistoryModal = ({ open, onClose, entry, entryType }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningBalance, setRunningBalance] = useState(0);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://13.60.223.186:5000/";

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!entry?._id) return;
      setLoading(true);
      try {
        // Determine the correct API path based on entry type
        const apiPath = entryType === "bank"
          ? `api/banks/${entry._id}/transactions`   // for Bank transactions
          : `api/cash/${entry._id}/transactions`;   // for Cash transactions

        // Make the request to fetch transactions
        const response = await axios.get(`${BACKEND_URL}${apiPath}`, {
          withCredentials: true,  // Make sure to include credentials for authentication
        });

        const history = response.data || [];
        let balance = 0;

        // Adjust transactions with debit, credit, and running balance
        const processed = history.map(tx => {
          let debit = 0;
          let credit = 0;

          // Check the transaction type and calculate debit or credit
          if (tx.type.toLowerCase() === 'subtract') {
            debit = tx.amount; // Debit for 'subtract' type
          } else if (tx.type.toLowerCase() === 'add') {
            credit = tx.amount; // Credit for 'add' type
          }

          balance += credit - debit;  // Update the running balance

          return {
            ...tx,
            debit,
            credit,
            runningBalance: balance
          };
        });

        setTransactions(processed);
        setRunningBalance(balance);
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
      <Box sx={{ width: 900, p: 3, mx: "auto", mt: 5, bgcolor: "background.paper", boxShadow: 24, borderRadius: 1 }}>
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
                  <TableCell>Debit</TableCell>
                  <TableCell>Credit</TableCell>
                  <TableCell>Running Balance</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <TableRow key={transaction._id}>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell sx={{ color: 'red' }}>{transaction.debit.toFixed(2)}</TableCell>
                      <TableCell sx={{ color: 'green' }}>{transaction.credit.toFixed(2)}</TableCell>
                      <TableCell>{transaction.runningBalance.toFixed(2)}</TableCell>
                      <TableCell>{new Date(transaction.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6}>No transactions available</TableCell>
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
