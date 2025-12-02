// pages/Shipper/ShipperTransactionHistory.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Box,
} from "@mui/material";
import {
  History as HistoryIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from "@mui/icons-material";
import { getShipperTransactions } from "../../redux/features/shipper/shipperSlice";

const ShipperTransactionHistory = ({ open, onClose, shipper }) => {
  const dispatch = useDispatch();
  const { transactionHistory, isLoading } = useSelector((state) => state.shipper);

  useEffect(() => {
    if (open && shipper?._id) {
      dispatch(getShipperTransactions(shipper._id));
    }
  }, [open, shipper, dispatch]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPaymentMethod = (method) => {
    const methodLower = String(method || "").toLowerCase();
    const colors = {
      cash: "success",
      online: "primary",
      cheque: "warning",
      owncheque: "secondary",
      credit: "info",
    };
    return (
      <Chip
        label={method || "N/A"}
        size="small"
        color={colors[methodLower] || "default"}
        variant="outlined"
      />
    );
  };

  if (!shipper) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HistoryIcon color="info" />
        Transaction History: {shipper.username}
      </DialogTitle>

      <DialogContent>
        {/* Current Balance Summary */}
        <Box sx={{ mb: 2, p: 2, bgcolor: "grey.100", borderRadius: 1, display: "flex", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Current Balance
            </Typography>
            <Typography variant="h5" color={Number(shipper.balance || 0) > 0 ? "error.main" : "success.main"}>
              Rs {Number(shipper.balance || 0).toLocaleString()}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="body2" color="text.secondary">
              Total Transactions
            </Typography>
            <Typography variant="h5">
              {transactionHistory?.length || shipper.transactionHistory?.length || 0}
            </Typography>
          </Box>
        </Box>

        {/* Transaction Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Method</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Type</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (transactionHistory || shipper.transactionHistory || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">No transactions found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                (transactionHistory || shipper.transactionHistory || []).map((txn, index) => (
                  <TableRow key={txn._id || index} hover>
                    <TableCell>
                      <Typography variant="body2">{formatDate(txn.date || txn.createdAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {txn.description || "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatPaymentMethod(txn.paymentMethod)}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        color={txn.type === "credit" ? "error.main" : "success.main"}
                      >
                        Rs {Number(txn.amount || 0).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {txn.type === "credit" ? (
                        <Chip
                          icon={<ArrowUpIcon fontSize="small" />}
                          label="Paid"
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          icon={<ArrowDownIcon fontSize="small" />}
                          label="Discount"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={txn.status || "completed"}
                        size="small"
                        color={txn.status === "pending" ? "warning" : "success"}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShipperTransactionHistory;
