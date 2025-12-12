// pages/Shipper/ShipperTransactionHistory.jsx
import React, { useEffect, useMemo, useState } from "react";
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
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  History as HistoryIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import {
  getShipperTransactions,
  deleteShipperTransaction,
  getShippers,
} from "../../redux/features/shipper/shipperSlice";

const ShipperTransactionHistory = ({ open, onClose, shipper, onTransactionDeleted }) => {
  const dispatch = useDispatch();
  const { transactionHistory, isLoading } = useSelector((state) => state.shipper);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Sort ASC by date (newest at bottom)
  const rows = useMemo(() => {
    const source =
      (Array.isArray(transactionHistory) && transactionHistory.length > 0
        ? transactionHistory
        : shipper?.transactionHistory) || [];

    return [...source].sort((a, b) => {
      const da = new Date(a?.date || a?.createdAt || 0).getTime();
      const db = new Date(b?.date || b?.createdAt || 0).getTime();
      return da - db;
    });
  }, [transactionHistory, shipper]);

  // Handle delete click
  const handleDeleteClick = (txn) => {
    setSelectedTransaction(txn);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!selectedTransaction || !shipper?._id) return;

    setIsDeleting(true);
    try {
      const result = await dispatch(
        deleteShipperTransaction({
          shipperId: shipper._id,
          transactionId: selectedTransaction._id,
        })
      ).unwrap();

      toast.success("Transaction deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedTransaction(null);

      // Refresh shipper list to update balances
      dispatch(getShippers());

      // Notify parent if callback provided
      if (onTransactionDeleted) {
        onTransactionDeleted(result.shipper);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error || "Failed to delete transaction");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!shipper) return null;

  return (
    <>
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

          {/* Table */}
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ maxHeight: 420, overflowY: "auto" }}
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
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
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
                          sx={{
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
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
                            label="Credit"
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            icon={<ArrowDownIcon fontSize="small" />}
                            label="Payment"
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
                      <TableCell align="center">
                        <Tooltip title="Delete Transaction">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(txn)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle sx={{ color: "error.main" }}>⚠️ Delete Transaction</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to delete this transaction? This will:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mt: 1 }}>
            <li>Reverse the shipper balance</li>
            <li>Reverse any bank/cash movements</li>
            <li>Delete related cheque records</li>
            <li>Delete related history records</li>
          </Box>

          {selectedTransaction && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Amount:</strong> Rs {Number(selectedTransaction.amount || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {selectedTransaction.type}
              </Typography>
              <Typography variant="body2">
                <strong>Method:</strong> {selectedTransaction.paymentMethod}
              </Typography>
              <Typography variant="body2">
                <strong>Description:</strong> {selectedTransaction.description || "N/A"}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ShipperTransactionHistory;