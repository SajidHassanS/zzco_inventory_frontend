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

const CREDIT_TYPES = new Set(["add", "credit", "deposit"]);
const DEBIT_TYPES  = new Set(["subtract", "deduct", "debit", "withdraw", "expense"]);

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pickDate = (tx) => new Date(tx?.date || tx?.createdAt || 0);

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
        const { data } = await axios.get(
          `${BACKEND_URL}api/cash/${cashEntry._id}/transactions`,
          { withCredentials: true }
        );

        const history = (Array.isArray(data) ? data : []).slice();

        // Sort ascending by effective date for correct running balance
        history.sort((a, b) => pickDate(a) - pickDate(b));

        let balance = 0;
        const processed = history.map((tx) => {
          const t = String(tx?.type || "").toLowerCase().trim();
          const amtAbs = Math.abs(toNum(tx?.amount));

          const isCredit = CREDIT_TYPES.has(t);
          const isDebit  = DEBIT_TYPES.has(t);

          const credit = isCredit ? amtAbs : 0;
          const debit  = isDebit  ? amtAbs : 0;

          balance += credit - debit;

          return {
            ...tx,
            debit,
            credit,
            runningBalance: balance,
            _displayDate: pickDate(tx),
          };
        });

        setTransactions(processed);
        setRunningBalance(balance);
      } catch (error) {
        console.error("Failed to fetch cash transactions", error?.response?.data || error);
        setTransactions([]);
        setRunningBalance(0);
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
            <Table size="small">
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
                      <TableCell>{tx.description || "-"}</TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell sx={{ color: "red" }}>
                        {toNum(tx.debit).toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ color: "green" }}>
                        {toNum(tx.credit).toFixed(2)}
                      </TableCell>
                      <TableCell>{toNum(tx.runningBalance).toFixed(2)}</TableCell>
                      <TableCell>
                        {tx._displayDate ? new Date(tx._displayDate).toLocaleString() : "-"}
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
