import React, { useEffect, useState, useCallback } from 'react';
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
  IconButton,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const CREDIT_TYPES = new Set(['add', 'credit', 'deposit']);
const DEBIT_TYPES  = new Set(['subtract', 'deduct', 'debit', 'withdraw', 'expense']);

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pickDate = (tx) => new Date(tx?.date || tx?.createdAt || 0);

const TransactionHistoryModal = ({ open, onClose, entry, entryType, onChanged }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningBalance, setRunningBalance] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || 'http://13.60.223.186:5000/';

  const isBank = entryType === 'bank';

  const getDescription = (tx, isBankTx) => {
    if (tx?.description) return tx.description;
    if (tx?.note) return tx.note;
    if (tx?.remarks) return tx.remarks;
    if (tx?.reason) return tx.reason;
    if (tx?.title) return tx.title;

    const t = String(tx?.type || '').toLowerCase();
    const amt = Math.abs(toNum(tx?.amount)).toFixed(2);

    if (isBankTx) {
      if (CREDIT_TYPES.has(t)) return `Deposit Rs ${amt}`;
      if (DEBIT_TYPES.has(t))  return `Withdrawal Rs ${amt}`;
      return `Bank transaction Rs ${amt}`;
    } else {
      if (CREDIT_TYPES.has(t)) return `Cash received Rs ${amt}`;
      if (DEBIT_TYPES.has(t))  return `Cash spent Rs ${amt}`;
      return `Cash transaction Rs ${amt}`;
    }
  };

  const loadTransactions = useCallback(async () => {
    if (!entry?._id) return;
    setLoading(true);
    try {
      const apiPath = isBank
        ? `api/banks/${entry._id}/transactions`
        : `api/cash/${entry._id}/transactions`;

      const { data } = await axios.get(`${BACKEND_URL}${apiPath}`, {
        withCredentials: true,
      });

      const history = (Array.isArray(data) ? data : []).slice();

      // Sort ascending by effective date for correct running balance
      history.sort((a, b) => pickDate(a) - pickDate(b));

      let balance = 0;
      const processed = history.map((tx) => {
        const t = String(tx?.type || '').toLowerCase().trim();
        const amtAbs = Math.abs(toNum(tx?.amount));
        const isCredit = CREDIT_TYPES.has(t);
        const isDebit  = DEBIT_TYPES.has(t);

        const credit = isCredit ? amtAbs : 0;
        const debit  = isDebit  ? amtAbs : 0;

        balance += credit - debit;

        return { ...tx, debit, credit, runningBalance: balance, _displayDate: pickDate(tx) };
      });

      setTransactions(processed);
      setRunningBalance(balance);
    } catch (error) {
      console.error('Failed to fetch transactions', error?.response?.data || error);
      setTransactions([]);
      setRunningBalance(0);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL, entry, isBank]);

  useEffect(() => {
    if (open) loadTransactions();
  }, [open, loadTransactions]);

  const handleDelete = async (txId) => {
    if (!isBank) return;
    if (!window.confirm('Delete this transaction permanently? Balance will be adjusted.')) return;
    try {
      setDeletingId(txId);
      await axios.delete(
        `${BACKEND_URL}api/banks/${entry._id}/transactions/${txId}`,
        { withCredentials: true }
      );
      await loadTransactions();
      if (typeof onChanged === 'function') onChanged(); // let parent refresh bank list
    } catch (e) {
      console.error('Delete failed', e?.response?.data || e);
      alert(e?.response?.data?.message || 'Failed to delete transaction');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          width: 900,
          p: 3,
          mx: 'auto',
          mt: 5,
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: 1,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">
            {isBank ? 'Bank' : 'Cash'} Transaction History
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
          Running balance is computed in chronological order for this ledger only.
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
                  {isBank && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <TableRow key={tx._id}>
                      <TableCell>{getDescription(tx, isBank)}</TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell sx={{ color: 'red' }}>
                        {toNum(tx.debit).toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ color: 'green' }}>
                        {toNum(tx.credit).toFixed(2)}
                      </TableCell>
                      <TableCell>{toNum(tx.runningBalance).toFixed(2)}</TableCell>
                      <TableCell>
                        {tx._displayDate ? new Date(tx._displayDate).toLocaleString() : '-'}
                      </TableCell>
                      {isBank && (
                        <TableCell align="right">
                          <Tooltip title="Delete permanently (adjust balance)">
                            <span>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleDelete(tx._id)}
                                disabled={deletingId === tx._id}
                              >
                                {deletingId === tx._id ? (
                                  <CircularProgress size={18} />
                                ) : (
                                  <DeleteIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isBank ? 7 : 6}>
                      No transactions available
                    </TableCell>
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
