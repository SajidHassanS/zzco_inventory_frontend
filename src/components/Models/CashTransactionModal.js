import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import axios from "axios";

const CashTransactionHistoryModal = ({ open, onClose, cashEntry }) => {
  const [transactions, setTransactions] = useState([]);
  const [runningBalance, setRunningBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || "http://13.60.223.186:5000/";

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!cashEntry?._id) return;
      setLoading(true);
      try {
        const response = await axios.get(
          `${BACKEND_URL}api/cash/${cashEntry._id}/transactions`,
          { withCredentials: true }
        );

        const history = (response.data || []).slice();

        // sort ASC by time so running balance is correct
        history.sort(
          (a, b) =>
            new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)
        );

        let balance = 0;
        const processed = history.map((tx) => {
          const isDebit = (tx.type || "").toLowerCase() === "deduct";
          const amount = Number(tx.amount) || 0;
          const debit = isDebit ? amount : 0;
          const credit = isDebit ? 0 : amount;
          balance += credit - debit;
          return {
            ...tx,
            debit,
            credit,
            runningBalance: balance,
          };
        });

        setTransactions(processed);
        setRunningBalance(balance);
      } catch (error) {
        console.error("Failed to fetch cash transactions", error);
      } finally {
        setLoading(false);
      }
    };

    if (open) fetchTransactions();
  }, [cashEntry, open, BACKEND_URL]);

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
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">Cash Transaction History</Typography>
          <Button onClick={onClose} variant="outlined" size="small">
            Close
          </Button>
        </Box>

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
                  transactions.map((tx) => (
                    <TableRow key={tx._id}>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell sx={{ color: "red" }}>
                        {tx.debit.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ color: "green" }}>
                        {tx.credit.toFixed(2)}
                      </TableCell>
                      <TableCell>{tx.runningBalance.toFixed(2)}</TableCell>
                      <TableCell>
                        {new Date(tx.createdAt || tx.date).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6}>No cash transactions found</TableCell>
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
