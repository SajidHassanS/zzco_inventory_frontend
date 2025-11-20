import React, { useState } from "react";
import { Modal, Box, TextField, Button, Typography } from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";

const ApplySupplierDiscountModal = ({ open, onClose, supplier, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // ✅ FIX: Check if balance is negative
    if (supplier.balance >= 0) {
      toast.error("Cannot apply discount. You haven't paid this supplier yet.");
      return;
    }

    // ✅ FIX: Discount cannot be more than what you paid (absolute value)
    const maxDiscount = Math.abs(supplier.balance);
    if (numAmount > maxDiscount) {
      toast.error(`Discount cannot be more than what you paid (Rs ${maxDiscount})`);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${BACKEND_URL}api/suppliers/${supplier._id}/discount`,
        {
          amount: numAmount,
          description: description || `Discount received from ${supplier.username}`,
        },
        { withCredentials: true }
      );

      toast.success(`✅ Discount of Rs ${numAmount} applied!`);
      
      // ✅ Show the change properly
      const prevBalance = response.data.previousBalance || supplier.balance;
      const newBalance = response.data.newBalance;
      toast.info(`Balance changed: Rs ${prevBalance.toFixed(2)} → Rs ${newBalance.toFixed(2)}`);
      
      onSuccess?.(response.data.supplier);
      onClose();

      // Reset form
      setAmount("");
      setDescription("");

    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to apply discount");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Calculate how much you paid (absolute value)
  const amountPaid = Math.abs(supplier?.balance || 0);

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" gutterBottom color="success.main">
          💰 Apply Discount from {supplier?.username}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Current Balance: <strong>Rs {supplier?.balance?.toFixed(2) || 0}</strong>
        </Typography>
        
        <Typography variant="body2" color="primary.main" sx={{ mb: 2 }}>
          Amount Paid to Supplier: <strong>Rs {amountPaid.toFixed(2)}</strong>
        </Typography>

        <Typography variant="caption" color="info.main" sx={{ display: "block", mb: 2, p: 1, bgcolor: "info.light", borderRadius: 1 }}>
          ℹ️ Discount will reduce the effective amount you paid. Your balance will become less negative.
        </Typography>

        <TextField
          label="Discount Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          fullWidth
          margin="normal"
          required
          inputProps={{ min: 0, max: amountPaid, step: 0.01 }}
          helperText={`Maximum: Rs ${amountPaid.toFixed(2)} (amount you paid)`}
        />

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          margin="normal"
          multiline
          rows={3}
          placeholder="e.g., Discount on bulk purchase, Promotional discount, Quality issue compensation, etc."
        />

        {/* ✅ Show calculation preview */}
        {amount && Number(amount) > 0 && (
          <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 1, p: 1, bgcolor: "success.light", borderRadius: 1 }}>
            ✅ New Balance: Rs {supplier.balance} + Rs {amount} = Rs {(supplier.balance + Number(amount)).toFixed(2)}
          </Typography>
        )}

        <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            color="success"
            type="submit"
            fullWidth
            disabled={loading}
          >
            {loading ? "Applying..." : "Apply Discount"}
          </Button>
          
          <Button
            variant="outlined"
            onClick={onClose}
            fullWidth
            disabled={loading}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ApplySupplierDiscountModal;