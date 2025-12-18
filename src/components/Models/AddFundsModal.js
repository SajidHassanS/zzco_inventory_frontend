// components/Models/AddFundsModal.jsx
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
import { Add } from "@mui/icons-material";
import axios from "axios";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://13.60.223.186:5000/";
const API_BASE = `${BACKEND_URL}api`;

const formatNumber = (num) => {
  const n = Number(num);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const AddFundsModal = ({ open, onClose, bank, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await axios.post(
        `${API_BASE}/banks/${bank._id}/transaction`,
        {
          amount: numAmount,
          type: "add",
          description: description.trim() || "Deposit",
        },
        { withCredentials: true }
      );

      setAmount("");
      setDescription("");
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to add funds:", err);
      setError(err.response?.data?.message || "Failed to add funds");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setDescription("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Add color="success" />
        Add Funds to {bank?.bankName}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current Balance:{" "}
            <strong style={{ color: "#388E3C" }}>
              Rs {formatNumber(bank?.balance || 0)}
            </strong>
          </Typography>

          <TextField
            label="Amount to Add"
            type="number"
            fullWidth
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>Rs</Typography>,
            }}
            sx={{ mb: 2 }}
            autoFocus
          />

          <TextField
            label="Description (Optional)"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Initial Deposit, Monthly Transfer"
            sx={{ mb: 1 }}
          />

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}

          {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: "#E8F5E9",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2">
                New Balance will be:{" "}
                <strong>
                  Rs {formatNumber((bank?.balance || 0) + Number(amount))}
                </strong>
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={loading || !amount}
          startIcon={loading ? <CircularProgress size={20} /> : <Add />}
        >
          {loading ? "Adding..." : "Add Funds"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddFundsModal;