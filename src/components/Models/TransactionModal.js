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

  // Fallback description so the cell never appears empty
  const getDescription = (tx, isBank) => {
    if (tx?.description) return tx.description;

    // common alt fields some APIs use
    if (tx?.note) return tx.note;
    if (tx?.remarks) return tx.remarks;
    if (tx?.reason) return tx.reason;
    if (tx?.title) return tx.title;

    const t = (tx?.type || "").toLowerCase();
    const amt = Number(tx?.amount || 0).toFixed(2);

    if (isBank) {
      if (t === "add" || t === "credit") return `Deposit Rs ${amt}`;
      if (t === "subtract" || t === "deduct" || t === "debit") return `Withdrawal Rs ${amt}`;
      return `Bank transaction Rs ${amt}`;
    } else {
      if (t === "add" || t === "credit") return `Cash received Rs ${amt}`;
      if (t === "subtract" || t === "deduct" || t === "debit") return `Cash spent Rs ${amt}`;
      return `Cash transaction Rs ${amt}`;
    }
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!entry?._id) return;
      setLoading(true);
      try {
        const isBank = entryType === "bank";
        const apiPath = isBank
          ? `api/banks/${entry._id}/transactions`
          : `api/cash/${entry._id}/transactions`;

        const { data } = await axios.get(`${BACKEND_URL}${apiPath}`, {
          withCredentials: true,
        });

        const history = Array.isArray(data) ? data : [];
        let balance = 0;

        const processed = history.map((tx) => {
          const typeLower = (tx?.type || "").toLowerCase();

          // normalize to numbers
          const rawAmt = Number(tx?.amount || 0);

          // consider various spellings from different services
          const isCredit = typeLower === "add" || typeLower === "credit";
          const isDebit  = typeLower === "subtract" || typeLower === "deduct" || typeLower === "debit";

          const credit = isCredit ? rawAmt : 0;
          const debit  = isDebit  ? rawAmt : 0;

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
        console.error("Failed to fetch transactions", error?.response?.data || error);
        setTransactions([]);
        setRunningBalance(0);
      } finally {
        setLoading(false);
      }
    };

    if (open) fetchTransactions();
  }, [entry, entryType, open, BACKEND_URL]);

  const isBank = entryType === "bank";

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ width: 900, p: 3, mx: "auto", mt: 5, bgcolor: "background.paper", boxShadow: 24, borderRadius: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">
            {isBank ? "Bank" : "Cash"} Transaction History
          </Typography>
          <Button onClick={onClose} variant="outlined" size="small">
            Close
          </Button>
        </Box>

        {entry?.bankName && isBank && (
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            Bank: {entry.bankName}
          </Typography>
        )}

        <Typography variant="subtitle2" color="text.secondary" mb={2}>
          Running balance shown is cumulative within this ledger.
        </Typography>

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
                      <TableCell>{getDescription(tx, isBank)}</TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell sx={{ color: 'red' }}>
                        {Number(tx.debit || 0).toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ color: 'green' }}>
                        {Number(tx.credit || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {Number(tx.runningBalance || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "-"}
                      </TableCell>
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
