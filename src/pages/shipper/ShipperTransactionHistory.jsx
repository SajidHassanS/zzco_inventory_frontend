// pages/Shipper/ShipperTransactionHistory.jsx
import React, { useEffect, useMemo } from "react";
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

  // --- Show newest at the bottom: sort ASC by (date || createdAt) ---
  const rows = useMemo(() => {
    const source =
      (Array.isArray(transactionHistory) && transactionHistory.length > 0
        ? transactionHistory
        : shipper?.transactionHistory) || [];

    // Do not mutate original array
    return [...source].sort((a, b) => {
      const da = new Date(a?.date || a?.createdAt || 0).getTime();
      const db = new Date(b?.date || b?.createdAt || 0).getTime();
      return da - db; // ASC => last added ends up at the bottom
    });
  }, [transactionHistory, shipper]);

  if (!shipper) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HistoryIcon color="info" />
        Transaction History: {shipper.username}
      </DialogTitle>

      <DialogContent>
        {/* Summary */}
        <Box
          sx={{
            mb: 2,
            p: 2,
            bgcolor: "grey.100",
            borderRadius: 1,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              Current Balance
            </Typography>
            <Typography
              variant="h5"
              color={Number(shipper.balance || 0) > 0 ? "error.main" : "success.main"}
            >
              Rs {Number(shipper.balance || 0).toLocaleString()}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="body2" color="text.secondary">
              Total Transactions
            </Typography>
            <Typography variant="h5">{rows.length}</Typography>
          </Box>
        </Box>

        {/* Scrollable table with sticky header; newest ends at bottom */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            maxHeight: 420,          // <— vertical scrollbar appears when needed
            overflowY: "auto",
          }}
        >
          <Table size="small" stickyHeader>
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
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">No transactions found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((txn, index) => (
                  <TableRow key={txn._id || index} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(txn.date || txn.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={txn.description || "N/A"}
                      >
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
                        variant="outlined"
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
