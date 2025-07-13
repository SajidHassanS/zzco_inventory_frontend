import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
} from "@mui/material";
import axios from 'axios';
import { toast } from "react-toastify";

const EditBankModal = ({ open, onClose, entry, entryType, onSuccess, totalCashAmount }) => {
  const [bankName, setBankName] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("");
  const [type, setType] = useState("add");
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
   
  const API_URL = entryType === "bank"
    ? `${BACKEND_URL}api/banks`
    : `${BACKEND_URL}api/cash`;

  useEffect(() => {
    if (entry) {
      if (entryType === "bank") {
        setBankName(entry.bankName || "");
        setAmount(entry.balance || "");
      } else if (entryType === "cash") {
        setBalance(entry.balance || "");
        setType(entry.type || "add");
      }
    }
  }, [entry, entryType]);

  const handleSubmit = async () => {
    if (entryType === "cash" && type === "deduct" && parseFloat(balance) > totalCashAmount) {
      toast.error("Insufficient balance for this deduction.");
      return;
    }

    let formData = {};

    if (entryType === "bank") {
      formData = {
        bankName,
        amount: parseFloat(amount),
      };
    }

    if (entryType === "cash") {
      const adjustedBalance = type === "deduct" ? -Math.abs(parseFloat(balance)) : Math.abs(parseFloat(balance));
      formData = {
        balance: adjustedBalance,
        type,
      };
    }

    try {
      const response = await axios.put(`${API_URL}/update/${entry._id}`, formData);
      toast.success(response.data.message || "Entry updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update entry. Please try again.";
      toast.error(errorMessage);
      console.error(`Error updating ${entryType} details:`, errorMessage);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
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
        <Typography variant="h6" gutterBottom>
          {entryType === "bank" ? "Edit Bank Details" : "Edit Cash Entry"}
        </Typography>
        {entryType === "bank" && (
          <TextField
            label="Bank Name"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            fullWidth
            margin="normal"
          />
        )}
        {entryType === "bank" && (
          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            margin="normal"
          />
        )}
        {entryType === "cash" && (
          <TextField
            label="Balance"
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            fullWidth
            margin="normal"
          />
        )}
        {entryType === "cash" && (
          <Box mt={2}>
            <Typography variant="subtitle1">Transaction Type</Typography>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              fullWidth
            >
              <MenuItem value="add">Add</MenuItem>
              <MenuItem value="deduct">Deduct</MenuItem>
            </Select>
          </Box>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          fullWidth
        >
          Save Changes
        </Button>
      </Box>
    </Modal>
  );
};

export default EditBankModal;
