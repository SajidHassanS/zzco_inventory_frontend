// components/Models/TransferModal.jsx

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Typography,
  Divider,
  CircularProgress
} from "@mui/material";
import { SwapHoriz, AccountBalance, Money } from "@mui/icons-material";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://13.60.223.186:5000/";
const API_BASE = `${BACKEND_URL}api`;

const formatNumber = (num) => {
  const n = Number(num);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const TransferModal = ({ open, onClose, banks = [], cashBalance = 0, onSuccess }) => {
  const [fromType, setFromType] = useState("bank");
  const [toType, setToType] = useState("cash");
  const [fromBankId, setFromBankId] = useState("");
  const [toBankId, setToBankId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFromType("bank");
      setToType("cash");
      setFromBankId(banks[0]?._id || "");
      setToBankId("");
      setAmount("");
      setDescription("");
      setError("");
    }
  }, [open, banks]);

  // Handle fromType change
  const handleFromTypeChange = (newFromType) => {
    setFromType(newFromType);
    
    if (newFromType === "cash") {
      // If source is cash, destination must be bank
      setToType("bank");
      setFromBankId("");
      // Set first bank as default destination
      setToBankId(banks[0]?._id || "");
    } else {
      // If source is bank, set first bank as source
      setFromBankId(banks[0]?._id || "");
    }
  };

  // Handle toType change
  const handleToTypeChange = (newToType) => {
    setToType(newToType);
    
    if (newToType === "cash") {
      setToBankId("");
    } else {
      // Find first bank that's not the source
      const availableBanks = banks.filter(b => b._id !== fromBankId);
      setToBankId(availableBanks[0]?._id || banks[0]?._id || "");
    }
  };

  // Get available banks for destination (exclude source bank if fromType is bank)
  const getDestinationBanks = () => {
    if (fromType === "cash") {
      // If source is cash, show ALL banks as destination options
      return banks;
    }
    // If source is bank, exclude the selected source bank
    return banks.filter(b => b._id !== fromBankId);
  };

  const getSourceBalance = () => {
    if (fromType === "cash") return cashBalance;
    const bank = banks.find(b => b._id === fromBankId);
    return bank?.balance || 0;
  };

  const handleTransfer = async () => {
    setError("");

    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (fromType === "bank" && !fromBankId) {
      setError("Please select a source bank");
      return;
    }

    if (toType === "bank" && !toBankId) {
      setError("Please select a destination bank");
      return;
    }

    if (fromType === "bank" && toType === "bank" && fromBankId === toBankId) {
      setError("Cannot transfer to the same account");
      return;
    }

    const transferAmount = Number(amount);
    if (transferAmount > getSourceBalance()) {
      setError(`Insufficient balance. Available: Rs ${formatNumber(getSourceBalance())}`);
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE}/banks/transfer`,
        {
          fromType,
          toType,
          fromBankId: fromType === "bank" ? fromBankId : undefined,
          toBankId: toType === "bank" ? toBankId : undefined,
          amount: transferAmount,
          description: description.trim() || "Account Transfer"
        },
        { withCredentials: true }
      );

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const getFromLabel = () => {
    if (fromType === "cash") return "Cash";
    const bank = banks.find(b => b._id === fromBankId);
    return bank?.bankName || "Select Bank";
  };

  const getToLabel = () => {
    if (toType === "cash") return "Cash";
    const bank = banks.find(b => b._id === toBankId);
    return bank?.bankName || "Select Bank";
  };

  // Get destination banks
  const destinationBanks = getDestinationBanks();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <SwapHoriz color="primary" />
        Transfer Funds
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}

        {/* FROM Section */}
        <Box sx={{ mb: 3, mt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            From
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Source Type</InputLabel>
            <Select
              value={fromType}
              label="Source Type"
              onChange={(e) => handleFromTypeChange(e.target.value)}
            >
              <MenuItem value="bank">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AccountBalance fontSize="small" /> Bank Account
                </Box>
              </MenuItem>
              <MenuItem value="cash">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Money fontSize="small" /> Cash
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {fromType === "bank" && (
            <FormControl fullWidth>
              <InputLabel>Select Source Bank</InputLabel>
              <Select
                value={fromBankId}
                label="Select Source Bank"
                onChange={(e) => setFromBankId(e.target.value)}
              >
                {banks.map((bank) => (
                  <MenuItem key={bank._id} value={bank._id}>
                    {bank.bankName} - Rs {formatNumber(bank.balance)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {fromType === "cash" && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Available Cash: Rs {formatNumber(cashBalance)}
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 2 }}>
          <SwapHoriz color="action" />
        </Divider>

        {/* TO Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            To
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Destination Type</InputLabel>
            <Select
              value={toType}
              label="Destination Type"
              onChange={(e) => handleToTypeChange(e.target.value)}
              disabled={fromType === "cash"} // If from cash, must go to bank
            >
              <MenuItem value="bank">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AccountBalance fontSize="small" /> Bank Account
                </Box>
              </MenuItem>
              {fromType !== "cash" && (
                <MenuItem value="cash">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Money fontSize="small" /> Cash
                  </Box>
                </MenuItem>
              )}
            </Select>
          </FormControl>

          {toType === "bank" && (
            <FormControl fullWidth>
              <InputLabel>Select Destination Bank</InputLabel>
              <Select
                value={toBankId}
                label="Select Destination Bank"
                onChange={(e) => setToBankId(e.target.value)}
              >
                {destinationBanks.map((bank) => (
                  <MenuItem key={bank._id} value={bank._id}>
                    {bank.bankName} - Rs {formatNumber(bank.balance)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {toType === "cash" && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Funds will be added to Cash
            </Alert>
          )}
        </Box>

        {/* Amount & Description */}
        <TextField
          fullWidth
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <Typography sx={{ mr: 1 }}>Rs</Typography>
          }}
        />

        <TextField
          fullWidth
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Deposit to bank, Withdraw for expenses"
        />

        {/* Transfer Summary */}
        {amount && Number(amount) > 0 && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              bgcolor: "#e3f2fd",
              borderRadius: 1,
              border: "1px solid #90caf9"
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Transfer Summary
            </Typography>
            <Typography variant="h6">
              Rs {formatNumber(amount)} from {getFromLabel()} → {getToLabel()}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleTransfer}
          disabled={loading || !amount}
          startIcon={loading ? <CircularProgress size={20} /> : <SwapHoriz />}
        >
          {loading ? "Transferring..." : "Transfer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransferModal;