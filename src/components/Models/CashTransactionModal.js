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
  const [runningBalance, setRunningBalance] = useState(0); // per-entry running total
  const [currentCashTotal, setCurrentCashTotal] = useState(null); // global cash total from server
  const [loading, setLoading] = useState(false);

  const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || "http://13.60.223.186:5000/";

  useEffect(() => {
    const fetchData = async () => {
      if (!cashEntry?._id) return;
      setLoading(true);
      try {
        // 1) Fetch transactions for this specific cash entry
        const { data } = await axios.get(
          `${BACKEND_URL}api/cash/${cashEntry._id}/transactions`,
          { withCredentials: true }
        );

        const history = (Array.isArray(data) ? data : []).slice();
        history.sort((a, b) => pickDate(a) - pickDate(b)); // oldest -> newest

        let bal = 0;
        const processed = history.map((tx) => {
          const t = String(tx?.type || "").toLowerCase().trim();
          const amtAbs = Math.abs(toNum(tx?.amount));
          const isCredit = CREDIT_TYPES.has(t);
          const isDebit  = DEBIT_TYPES.has(t);

          const credit = isCredit ? amtAbs : 0;
          const debit  = isDebit  ? amtAbs : 0;

          bal += credit - debit;

          return {
            ...tx,
            debit,
            credit,
            runningBalance: bal,
            _displayDate: pickDate(tx),
          };
        });

        setTransactions(processed);
        setRunningBalance(bal);

        // 2) Fetch the exact global cash total
        const { data: allCash } = await axios.get(
          `${BACKEND_URL}api/cash/all`,
          { withCredentials: true }
        );
        // Your /api/cash/all returns { totalBalance, latestEntry, allEntries }
        setCurrentCashTotal(Number(allCash?.totalBalance ?? 0));
      } catch (error) {
        console.error("Failed to fetch cash data", error?.response?.data || error);
        setTransactions([]);
        setRunningBalance(0);
        setCurrentCashTotal(null);
      } finally {
        setLoading(false);
      }
    };

    if (open) fetchData();
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
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2">
              Current Cash Total:&nbsp;
              {Number(currentCashTotal ?? 0).toFixed(2)}
            </Typography>
            <Button onClick={onClose} variant="outlined" size="small">
              Close
            </Button>
          </Box>
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
                  <TableCell>Entry Running Balance</TableCell>
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
                        {tx._displayDate
                          ? new Date(tx._displayDate).toLocaleString()
                          : "-"}
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
