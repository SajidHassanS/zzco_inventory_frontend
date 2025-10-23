import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  MenuItem,
  Typography,
  Grid,
} from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { toast } from "react-toastify";

// normalize base so we always have exactly one trailing slash
const normBase = (raw) => (raw ? (raw.endsWith("/") ? raw : `${raw}/`) : "");

const initialState = {
  amount: "",
  paymentMethod: "",
  chequeDate: "",
  description: "",
  selectedBank: "",
  image: null,
  imagePreview: "",
};

const AddBalanceModal = ({ open, onClose, customer, onSuccess }) => {
  const [amount, setAmount] = useState(initialState.amount);
  const [paymentMethod, setPaymentMethod] = useState(initialState.paymentMethod); // "cash" | "online" | "cheque"
  const [chequeDate, setChequeDate] = useState(initialState.chequeDate);
  const [description, setDescription] = useState(initialState.description);
  const [selectedBank, setSelectedBank] = useState(initialState.selectedBank);
  const [image, setImage] = useState(initialState.image);
  const [imagePreview, setImagePreview] = useState(initialState.imagePreview);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const RAW_BACKEND = process.env.REACT_APP_BACKEND_URL || "";
  const BASE = normBase(RAW_BACKEND);
  const API_URL = `${BASE}api/customers`;

  const dispatch = useDispatch();
  const banks = useSelector((state) => state.bank.banks);

  useEffect(() => {
    if (open) {
      dispatch(getBanks());
      setErrors({});
      setLoading(false);
    } else {
      // reset on close
      setAmount(initialState.amount);
      setPaymentMethod(initialState.paymentMethod);
      setChequeDate(initialState.chequeDate);
      setDescription(initialState.description);
      setSelectedBank(initialState.selectedBank);
      setImage(initialState.image);
      setImagePreview(initialState.imagePreview);
      setErrors({});
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
    if (paymentMethod === "online" && !selectedBank) {
      formErrors.selectedBank = "Bank selection is required for online payment";
    }
    if (paymentMethod === "cheque" && !chequeDate) {
      formErrors.chequeDate = "Cheque date is required for cheque payment";
    }
    if ((paymentMethod === "online" || paymentMethod === "cheque") && !image) {
      formErrors.image = "Image upload is required for online or cheque payment";
    }

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

      // backend will auto-pick Cash doc; we do NOT send cashId
      const base = {
        amount: amt,
        paymentMethod: method, // "cash" | "online" | "cheque"
        description: cleanDesc,
        ...(method === "online" ? { bankId: selectedBank } : {}),
        ...(method === "cheque" ? { chequeDate } : {}),
      };

      let resp;
      if (image) {
        const fd = new FormData();
        Object.entries(base).forEach(([k, v]) => fd.append(k, v));
        fd.append("image", image);

        resp = await axios.post(
          `${API_URL}/add-customer-balance/${customer._id}`,
          fd,
          { withCredentials: true }
        );
      } else {
        resp = await axios.post(
          `${API_URL}/add-customer-balance/${customer._id}`,
          base,
          { withCredentials: true }
        );
      }

      toast.success(resp?.data?.message || "Balance added successfully");
      onSuccess?.(resp?.data?.customer);
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to add balance. Please try again."
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
          Add Balance to {customer?.username || customer?.name}
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
        />

        <TextField
          label="Payment Method"
          select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value.toLowerCase())}
          fullWidth
          margin="normal"
          error={!!errors.paymentMethod}
          helperText={errors.paymentMethod}
        >
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="online">Online</MenuItem>
          <MenuItem value="cheque">Cheque</MenuItem>
        </TextField>

        {paymentMethod === "online" && (
          <TextField
            label="Select Bank"
            select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            fullWidth
            margin="normal"
            error={!!errors.selectedBank}
            helperText={errors.selectedBank}
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
          />
        )}

        {(paymentMethod === "cheque" || paymentMethod === "online") && (
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
          placeholder={`e.g. Payment received from ${customer?.username || customer?.name || "customer"}`}
        />

        <Button
          variant="contained"
          color="primary"
          type="submit"
          fullWidth
          disabled={loading}
        >
          {loading ? "Processing..." : "Add Balance"}
        </Button>
      </Box>
    </Modal>
  );
};

export default AddBalanceModal;
