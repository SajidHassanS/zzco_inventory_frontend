// src/pages/shipper/MinusShipperBalanceModal.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Typography,
  Paper,
} from "@mui/material";
import { LocalShipping as ShipperIcon } from "@mui/icons-material";
import { minusShipperBalance, getShippers } from "../../redux/features/shipper/shipperSlice";

/**
 * CREDIT-ONLY minus modal.
 * Adds credit to the shipper ledger (you owe MORE). No bank/cash movement.
 */
const MinusShipperBalanceModal = ({ open, onClose, shipper }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.shipper);

  const [formData, setFormData] = useState({
    amount: "",
    description: "",
  });

  useEffect(() => {
    if (open) {
      setFormData({ amount: "", description: "" });
    }
  }, [open]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const amt = Number(formData.amount);
    if (!amt || amt <= 0) return;

    // Build FormData because your thunk/service expect multipart
    const fd = new FormData();
    fd.append("amount", String(amt));
    fd.append("paymentMethod", "credit"); // enforce CREDIT
    fd.append(
      "description",
      formData.description || `Credit added to ${shipper?.username} (you owe more)`
    );

    // 🔴 IMPORTANT: thunk expects `{ id, data }`, not `{ id, formData }`
    const result = await dispatch(
      minusShipperBalance({ id: shipper._id, data: fd })
    );

    if (minusShipperBalance.fulfilled.match(result)) {
      dispatch(getShippers());
      onClose();
    }
  };

  if (!shipper) return null;

  const currentBalance = Number(shipper.balance || 0);
  const typedAmount = Number(formData.amount || 0);
  const previewBalance =
    isNaN(typedAmount) || typedAmount <= 0
      ? currentBalance
      : currentBalance + typedAmount;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ShipperIcon color="warning" />
        Add Credit (Increase Payable) — {shipper?.username}
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
          <strong>Credit only:</strong> This adds credit to the shipper ledger and <b>increases the amount you owe</b>. There is no cash/bank movement.
        </Alert>

        {/* Current Balance */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
          <Typography variant="body2" color="text.secondary">
            Current Balance
          </Typography>
          <Typography variant="h5" color={currentBalance > 0 ? "error.main" : "success.main"}>
            Rs {Math.abs(currentBalance).toLocaleString()}
            <Typography component="span" variant="body2" sx={{ ml: 1 }}>
              {currentBalance > 0 ? "(You Owe)" : "(Overpaid)"}
            </Typography>
          </Typography>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount *"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleInputChange}
              inputProps={{ min: 1, step: "any" }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              multiline
              rows={2}
              placeholder="e.g., Additional freight to be paid later"
            />
          </Grid>

          {/* Balance Preview */}
          {typedAmount > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: "warning.light" }}>
                <Typography variant="body2">After credit:</Typography>
                <Typography variant="h6" color="error.main">
                  Balance: Rs {previewBalance.toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleSubmit}
          disabled={isLoading || !formData.amount || Number(formData.amount) <= 0}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? "Processing..." : "Add Credit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MinusShipperBalanceModal;
