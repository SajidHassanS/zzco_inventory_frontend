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
  CircularProgress,
} from '@mui/material';
import axios from 'axios';

const CashTransactionHistoryModal = ({ open, onClose, cashEntry }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://13.60.223.186:5000/";

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!cashEntry?._id) return;
      setLoading(true);
      try {
        const response = await axios.get(
          `${BACKEND_URL}api/cash/${cashEntry._id}/transactions`,
          {
            withCredentials: true, // ✅ This ensures cookies like session tokens are sent
          }
        );
        setTransactions(response.data);
      } catch (error) {
        console.error("Failed to fetch cash transactions", error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchTransactions();
    }
  }, [cashEntry, open, BACKEND_URL]);



  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ width: 600, p: 3, mx: "auto", mt: 5, bgcolor: "background.paper", boxShadow: 24, borderRadius: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">Cash Transaction History</Typography>
          <Button onClick={onClose} variant="outlined" size="small">Close</Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" mt={3}><CircularProgress /></Box>
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
                    <TableCell colSpan={4}>No cash transactions found</TableCell>
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

export default CashTransactionHistoryModal;
