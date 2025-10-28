import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Grid,
} from "@mui/material";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { toast } from "react-toastify";

// normalize base so we always have exactly one trailing slash
const normBase = (raw) => {
  if (!raw) return "";
  return raw.endsWith("/") ? raw : `${raw}/`;
};

const MinusBalanceModal = ({ open, onClose, customer, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(""); // "cash" | "online" | "cheque" | "credit"
  const [chequeDate, setChequeDate] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const RAW_BACKEND = process.env.REACT_APP_BACKEND_URL || "";
  const BASE = normBase(RAW_BACKEND);
  const API_URL = `${BASE}api/customers`;

  const dispatch = useDispatch();
  const banks = useSelector((state) => state.bank.banks || []);

  useEffect(() => {
    if (open) {
      dispatch(getBanks());
      setErrors({});
      setLoading(false);
    }
  }, [dispatch, open]);

  const validateForm = () => {
    const formErrors = {};

    const amt = Number(amount);
    if (!amount || !Number.isFinite(amt) || amt <= 0) {
      formErrors.amount = "Please provide a valid amount greater than 0";
    }
    if (!paymentMethod) {
      formErrors.paymentMethod = "Payment method is required";
    }

    // Only require bank/image for online/cheque; only require chequeDate for cheque
    if (paymentMethod === "online" || paymentMethod === "cheque") {
      if (!selectedBank) {
        formErrors.selectedBank = "Bank selection is required for online/cheque payment";
      }
      if (!image) {
        formErrors.image = "Image is required for online or cheque payment";
      }
    }
    if (paymentMethod === "cheque" && !chequeDate) {
      formErrors.chequeDate = "Cheque date is required for cheque payment";
    }

    // No extra requirements for "credit"
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer?._id) {
      toast.error("Customer missing");
      return;
    }
    if (!validateForm()) return;

    setLoading(true);

    try {
      const amt = parseFloat(amount);
      const method = (paymentMethod || "").toLowerCase().trim();

      const cleanDesc =
        (description && description.trim()) ||
        `Payment received from ${customer?.username || customer?.name || "customer"}`;

      // Build payload. For credit, we send only the basics.
      const base = {
        amount: amt,
        paymentMethod: method, // "cash" | "online" | "cheque" | "credit"
        description: cleanDesc,
        ...(method === "online" || method === "cheque" ? { bankId: selectedBank } : {}),
        ...(method === "cheque" ? { chequeDate } : {}),
      };

      let resp;
      if (image && (method === "online" || method === "cheque")) {
        const fd = new FormData();
        Object.entries(base).forEach(([k, v]) => fd.append(k, v));
        fd.append("image", image);

        resp = await axios.post(
          `${API_URL}/minus-customer-balance/${customer._id}`,
          fd,
          { withCredentials: true } // don't set content-type manually
        );
      } else {
        // cash or credit, or online/cheque without image (shouldn't happen due to validation)
        resp = await axios.post(
          `${API_URL}/minus-customer-balance/${customer._id}`,
          base,
          { withCredentials: true }
        );
      }

      toast.success(resp?.data?.message || "Balance subtracted successfully");
      onSuccess?.(resp?.data?.customer);
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to subtract balance. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("File size must be less than 5MB");
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      return toast.error("Only JPEG and PNG files are allowed");
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

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
        <Typography variant="h6" gutterBottom>
          Subtract Balance from {customer?.username || customer?.name}
        </Typography>

        <TextField
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          fullWidth
          margin="normal"
          error={!!errors.amount}
          helperText={errors.amount}
          inputProps={{ min: 0, step: "0.01" }}
          disabled={loading}
        />

        <TextField
          label="Payment Method"
          select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value.toLowerCase())}
          fullWidth
          margin="normal"
          error={!!errors.paymentMethod}
          helperText={
            errors.paymentMethod ||
            (paymentMethod === "credit"
              ? "Credit = ledger-only (no bank/cash movement)"
              : "")
          }
          disabled={loading}
        >
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="online">Online</MenuItem>
          <MenuItem value="cheque">Cheque</MenuItem>
          <MenuItem value="credit">Credit</MenuItem>
        </TextField>

        {(paymentMethod === "online" || paymentMethod === "cheque") && (
          <TextField
            label="Select Bank"
            select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            fullWidth
            margin="normal"
            error={!!errors.selectedBank}
            helperText={errors.selectedBank}
            disabled={loading}
          >
            {banks?.length ? (
              banks.map((bank) => (
                <MenuItem key={bank._id} value={bank._id}>
                  {bank.bankName}
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>
                No banks found
              </MenuItem>
            )}
          </TextField>
        )}

        {paymentMethod === "cheque" && (
          <TextField
            label="Cheque Date"
            type="date"
            value={chequeDate}
            onChange={(e) => setChequeDate(e.target.value)}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            error={!!errors.chequeDate}
            helperText={errors.chequeDate}
            disabled={loading}
          />
        )}

        {(paymentMethod === "online" || paymentMethod === "cheque") && (
          <Grid item xs={12}>
            <TextField
              type="file"
              label="Upload Image"
              name="image"
              onChange={handleImageChange}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              error={!!errors.image}
              helperText={errors.image}
              disabled={loading}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                style={{ width: "100%", maxHeight: 200, objectFit: "contain" }}
              />
            )}
          </Grid>
        )}

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          margin="normal"
          multiline
          rows={2}
          placeholder={
            paymentMethod === "credit"
              ? `e.g. Credit adjustment for ${
                  customer?.username || customer?.name || "customer"
                }`
              : `e.g. Payment received from ${
                  customer?.username || customer?.name || "customer"
                }`
          }
          disabled={loading}
        />

        <Button
          variant="contained"
          color="primary"
          type="submit"
          fullWidth
          disabled={loading}
        >
          {loading ? "Processing..." : "Subtract Balance"}
        </Button>
      </Box>
    </Modal>
  );
};

export default MinusBalanceModal;
