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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  History as HistoryIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import {
  getShipperTransactions,
  deleteShipperTransaction,
  editShipperTransaction,
  getShippers,
} from "../../redux/features/shipper/shipperSlice";

// ✅ Helper: Check if transaction is within 2-hour edit window
const isWithinEditWindow = (transaction) => {
  const createdAt = new Date(transaction.createdAt || transaction.date);
  const now = new Date();
  const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
  return hoursDiff <= 2;
};

// ✅ Helper: Get remaining edit time
const getRemainingEditTime = (transaction) => {
  const createdAt = new Date(transaction.createdAt || transaction.date);
  const now = new Date();
  const msRemaining = (2 * 60 * 60 * 1000) - (now - createdAt);
  
  if (msRemaining <= 0) return null;
  
  const minutes = Math.floor(msRemaining / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${remainingMins}m left`;
  }
  return `${remainingMins}m left`;
};

const formatNumber = (num) => {
  return Number(num || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const ShipperTransactionHistory = ({ open, onClose, shipper, banks = [], onTransactionDeleted, onTransactionEdited }) => {
  const dispatch = useDispatch();
  const { transactionHistory, isLoading } = useSelector((state) => state.shipper);

  // Delete states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ NEW: Edit states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    amount: "",
    description: "",
    paymentMethod: "",
    bankId: "",
    chequeDate: "",
  });

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

      dispatch(getShippers());

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

  // ✅ NEW: Edit handlers
  const handleEditClick = (txn) => {
    if (!isWithinEditWindow(txn)) {
      toast.error("Cannot edit: 2-hour edit window has expired");
      return;
    }

    setTransactionToEdit(txn);
    setEditFormData({
      amount: txn.amount || "",
      description: txn.description || "",
      paymentMethod: String(txn.paymentMethod || "").toLowerCase(),
      bankId: txn.bankId || "",
      chequeDate: txn.chequeDate 
        ? new Date(txn.chequeDate).toISOString().split('T')[0] 
        : "",
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setTransactionToEdit(null);
    setEditFormData({
      amount: "",
      description: "",
      paymentMethod: "",
      bankId: "",
      chequeDate: "",
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleConfirmEdit = async () => {
    if (!transactionToEdit || !shipper?._id) return;

    if (!editFormData.amount || Number(editFormData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsEditing(true);
    try {
      const result = await dispatch(
        editShipperTransaction({
          shipperId: shipper._id,
          transactionId: transactionToEdit._id,
          data: {
            amount: editFormData.amount,
            description: editFormData.description,
            paymentMethod: editFormData.paymentMethod,
            bankId: editFormData.bankId || undefined,
            chequeDate: editFormData.chequeDate || undefined,
          },
        })
      ).unwrap();

      toast.success("Transaction edited successfully");
      handleCloseEditDialog();

      // Refresh data
      dispatch(getShippers());
      dispatch(getShipperTransactions(shipper._id));

      if (onTransactionEdited) {
        onTransactionEdited(result.shipper);
      }
    } catch (error) {
      console.error("Edit error:", error);
      toast.error(error || "Failed to edit transaction");
    } finally {
      setIsEditing(false);
    }
  };

  if (!shipper) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
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
                  <TableCell align="center" sx={{ width: 100 }}>Actions</TableCell>
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
                  rows.map((txn, index) => {
                    const canEdit = isWithinEditWindow(txn);
                    const remainingTime = getRemainingEditTime(txn);
                    
                    return (
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
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            {/* ✅ Edit Button */}
                            <Tooltip title={canEdit ? `Edit (${remainingTime})` : "Edit window expired"}>
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEditClick(txn)}
                                  disabled={!canEdit}
                                  sx={{ 
                                    opacity: canEdit ? 1 : 0.3,
                                    '&.Mui-disabled': { color: 'grey.400' }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            {/* Delete Button */}
                            <Tooltip title="Delete Transaction">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteClick(txn)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
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

      {/* ✅ NEW: Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'primary.main' }}>
          ✏️ Edit Transaction
          {transactionToEdit && (
            <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Time remaining: {getRemainingEditTime(transactionToEdit) || "Expired"}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Amount"
              type="number"
              value={editFormData.amount}
              onChange={(e) => handleEditFormChange('amount', e.target.value)}
              fullWidth
              required
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
            
            <TextField
              label="Description"
              value={editFormData.description}
              onChange={(e) => handleEditFormChange('description', e.target.value)}
              fullWidth
              multiline
              rows={2}
            />

            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={editFormData.paymentMethod}
                onChange={(e) => handleEditFormChange('paymentMethod', e.target.value)}
                label="Payment Method"
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="owncheque">Own Cheque</MenuItem>
                <MenuItem value="credit">Credit</MenuItem>
              </Select>
            </FormControl>

            {(editFormData.paymentMethod === 'online' || editFormData.paymentMethod === 'owncheque') && (
              <FormControl fullWidth>
                <InputLabel>Bank</InputLabel>
                <Select
                  value={editFormData.bankId}
                  onChange={(e) => handleEditFormChange('bankId', e.target.value)}
                  label="Bank"
                >
                  <MenuItem value="">Select Bank</MenuItem>
                  {banks.map((bank) => (
                    <MenuItem key={bank._id} value={bank._id}>
                      {bank.bankName} - Rs {formatNumber(bank.totalBalance || bank.balance || 0)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {(editFormData.paymentMethod === 'cheque' || editFormData.paymentMethod === 'owncheque') && (
              <TextField
                label="Cheque Date"
                type="date"
                value={editFormData.chequeDate}
                onChange={(e) => handleEditFormChange('chequeDate', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            )}

            <Box sx={{ bgcolor: '#fff3e0', p: 2, borderRadius: 1 }}>
              <Typography variant="body2" color="warning.dark">
                <strong>Note:</strong> Editing will reverse the original transaction effects and apply the new values.
                Bank/Cash balances will be adjusted accordingly.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseEditDialog} variant="outlined" disabled={isEditing}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmEdit} 
            variant="contained" 
            color="primary"
            disabled={isEditing}
            startIcon={isEditing ? <CircularProgress size={20} color="inherit" /> : <EditIcon />}
          >
            {isEditing ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ShipperTransactionHistory;