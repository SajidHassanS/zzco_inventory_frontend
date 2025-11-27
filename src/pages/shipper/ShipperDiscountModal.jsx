// components/Models/ShipperDiscountModal.jsx
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
import { Discount as DiscountIcon } from "@mui/icons-material";
import { applyShipperDiscount, getShippers } from "../../redux/features/shipper/shipperSlice";

const ShipperDiscountModal = ({ open, onClose, shipper }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.shipper);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setAmount("");
      setDescription("");
    }
  }, [open]);

  const currentBalance = Number(shipper?.balance || 0);
  const maxDiscount = currentBalance > 0 ? currentBalance : 0;

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) return;

    const result = await dispatch(
      applyShipperDiscount({
        id: shipper._id,
        discountData: {
          amount: Number(amount),
          description: description || `Discount from ${shipper?.username}`,
        },
      })
    );

    if (applyShipperDiscount.fulfilled.match(result)) {
      dispatch(getShippers());
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <DiscountIcon color="warning" />
        Apply Discount - {shipper?.username}
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
          <strong>Discount:</strong> Shipper is giving you a discount. This will reduce how much you owe them (no cash/bank movement).
        </Alert>

        {/* Current Balance */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
          <Typography variant="body2" color="text.secondary">
            Current Balance (You Owe)
          </Typography>
          <Typography variant="h5" color="error.main">
            Rs {currentBalance.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Maximum discount: Rs {maxDiscount.toLocaleString()}
          </Typography>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Discount Amount *"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputProps={{ min: 1, max: maxDiscount }}
              error={Number(amount) > maxDiscount}
              helperText={Number(amount) > maxDiscount ? `Cannot exceed Rs ${maxDiscount}` : ""}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              placeholder="e.g., Bulk order discount"
            />
          </Grid>

          {/* Balance Preview */}
          {amount && Number(amount) <= maxDiscount && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: "success.light" }}>
                <Typography variant="body2" color="success.contrastText">
                  After discount:
                </Typography>
                <Typography variant="h6" color="success.contrastText">
                  New Balance: Rs {(currentBalance - Number(amount)).toLocaleString()}
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
          disabled={isLoading || !amount || Number(amount) <= 0 || Number(amount) > maxDiscount}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? "Applying..." : "Apply Discount"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShipperDiscountModal;