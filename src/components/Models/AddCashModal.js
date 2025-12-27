import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import axios from "axios";
import { toast } from "react-toastify";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://13.60.223.186:5000/";

const AddCashModal = ({ open, onClose, type, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdd = type === "add";

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${BACKEND_URL}api/cash/add`,
        {
          balance: numAmount,
          type: isAdd ? "add" : "deduct",
          description: description.trim() || (isAdd ? "Cash added manually" : "Cash deducted manually"),
        },
        { withCredentials: true }
      );

      toast.success(isAdd ? "Cash added successfully!" : "Cash deducted successfully!");
      setAmount("");
      setDescription("");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Cash operation error:", error);
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAmount("");
      setDescription("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {isAdd ? (
            <Add sx={{ color: "green", fontSize: 28 }} />
          ) : (
            <Remove sx={{ color: "red", fontSize: 28 }} />
          )}
          <Typography variant="h6">
            {isAdd ? "Add Cash" : "Deduct Cash"}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            autoFocus
            disabled={loading}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>Rs</Typography>,
            }}
          />

          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            disabled={loading}
            placeholder={isAdd ? "e.g., Cash received from sale" : "e.g., Petty cash expense"}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          color={isAdd ? "success" : "error"}
          startIcon={loading ? <CircularProgress size={18} /> : isAdd ? <Add /> : <Remove />}
        >
          {isAdd ? "Add Cash" : "Deduct Cash"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCashModal;