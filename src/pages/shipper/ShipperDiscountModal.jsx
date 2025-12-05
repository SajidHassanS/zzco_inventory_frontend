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
  Typography,
  CircularProgress,
  Alert,
  Box,
} from "@mui/material";
import { Discount as DiscountIcon } from "@mui/icons-material";
import { applyShipperDiscount, getShippers } from "../../redux/features/shipper/shipperSlice";

const ShipperDiscountModal = ({ open, onClose, shipper }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.shipper);

  const [formData, setFormData] = useState({ amount: "", description: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setFormData({ amount: "", description: "" });
      setError("");
    }
  }, [open]);

  if (!shipper) return null;

  const currentBalance = Number(shipper.balance || 0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    const amount = Number(formData.amount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid discount amount");
      return;
    }
    if (amount > currentBalance) {
      setError(`Discount cannot be more than what you owe (Rs ${currentBalance.toLocaleString()})`);
      return;
    }

    try {
      await dispatch(
        applyShipperDiscount({
          id: shipper._id,
          data: {
            amount: formData.amount,
            description: formData.description || `Discount from ${shipper.username}`,
          },
        })
      ).unwrap();

      dispatch(getShippers());
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to apply discount");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <DiscountIcon color="warning" />
        Apply Discount: {shipper.username}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Current Balance (You Owe)
          </Typography>
          <Typography variant="h5" color="error.main">
            Rs {currentBalance.toLocaleString()}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Discount Amount *"
              name="amount"
              type="number"
              inputProps={{ min: 1, step: "any" }}
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="Enter discount amount"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>Rs</Typography>,
              }}
              helperText={`Max discount: Rs ${currentBalance.toLocaleString()}`}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Reason for discount"
              multiline
              rows={2}
            />
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mt: 2 }}>
          This discount will reduce the amount you owe to this shipper.
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleSubmit}
          disabled={isLoading || !formData.amount}
          startIcon={isLoading ? <CircularProgress size={20} /> : <DiscountIcon />}
        >
          {isLoading ? "Applying..." : "Apply Discount"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShipperDiscountModal;
