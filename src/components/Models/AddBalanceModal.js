import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  MenuItem,
  Typography,
  Grid,
  Alert,
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
  const [paymentMethod, setPaymentMethod] = useState(initialState.paymentMethod);
  const [chequeDate, setChequeDate] = useState(initialState.chequeDate);
  const [description, setDescription] = useState(initialState.description);
  const [selectedBank, setSelectedBank] = useState(initialState.selectedBank);
  const [image, setImage] = useState(initialState.image);
  const [imagePreview, setImagePreview] = useState(initialState.imagePreview);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [bankBalanceWarning, setBankBalanceWarning] = useState("");

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
      setBankBalanceWarning("");
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
      setBankBalanceWarning("");
    }
  }, [dispatch, open]);

  // ✅ NEW: Check bank balance when amount or selected bank changes
  useEffect(() => {
    if ((paymentMethod === "online" || paymentMethod === "owncheque") && selectedBank && amount) {
      const bank = banks.find((b) => b._id === selectedBank);
      const amt = Number(amount);
      if (bank && Number.isFinite(amt) && amt > 0) {
        const bankBalance = Number(bank.balance || 0);
        if (amt > bankBalance) {
          setBankBalanceWarning(
            `⚠️ Insufficient balance! Bank "${bank.bankName}" has only Rs ${bankBalance.toLocaleString()}, but you're trying to pay Rs ${amt.toLocaleString()}`
          );
        } else {
          setBankBalanceWarning("");
        }
      } else {
        setBankBalanceWarning("");
      }
    } else {
      setBankBalanceWarning("");
    }
  }, [amount, selectedBank, paymentMethod, banks]);

  const validateForm = () => {
    const formErrors = {};
    const amt = Number(amount);

    if (!amount || !Number.isFinite(amt) || amt <= 0) {
      formErrors.amount = "Please provide a valid amount greater than 0";
    }
    if (!paymentMethod) {
      formErrors.paymentMethod = "Payment method is required";
    }

    // ✅ For ONLINE: require bank and image
    if (paymentMethod === "online") {
      if (!selectedBank) {
        formErrors.selectedBank = "Bank selection is required for online payment";
      }
      if (!image) {
        formErrors.image = "Image upload is required for online payment";
      }
      // Check balance
      if (selectedBank) {
        const bank = banks.find((b) => b._id === selectedBank);
        if (bank && amt > Number(bank.balance || 0)) {
          formErrors.selectedBank = `Insufficient balance in ${bank.bankName} (Available: Rs ${bank.balance})`;
        }
      }
    }

    // ✅ For regular CHEQUE: only require chequeDate and image (NO bank required)
    if (paymentMethod === "cheque") {
      if (!chequeDate) {
        formErrors.chequeDate = "Cheque date is required for cheque payment";
      }
      if (!image) {
        formErrors.image = "Image upload is required for cheque payment";
      }
    }

    // ✅ NEW: For OWN CHEQUE: require bank, chequeDate, image AND validate balance
    if (paymentMethod === "owncheque") {
      if (!selectedBank) {
        formErrors.selectedBank = "Bank selection is required for own cheque";
      }
      if (!chequeDate) {
        formErrors.chequeDate = "Cheque date is required";
      }
      if (!image) {
        formErrors.image = "Image upload is required for cheque";
      }
      // ✅ Validate bank balance
      if (selectedBank) {
        const bank = banks.find((b) => b._id === selectedBank);
        if (bank) {
          const bankBalance = Number(bank.balance || 0);
          if (amt > bankBalance) {
            formErrors.selectedBank = `Insufficient balance! ${bank.bankName} has Rs ${bankBalance.toLocaleString()}, you need Rs ${amt.toLocaleString()}`;
          }
        }
      }
    }

    // No extra requirements for "credit" or "cash"
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
        `Payout to ${customer?.username || customer?.name || "customer"}`;

      // ✅ UPDATED: Send bankId for online AND owncheque
      const base = {
        amount: amt,
        paymentMethod: method, // "cash" | "online" | "cheque" | "credit" | "owncheque"
        description: cleanDesc,
        ...((method === "online" || method === "owncheque") ? { bankId: selectedBank } : {}),
        ...((method === "cheque" || method === "owncheque") ? { chequeDate } : {}),
      };

      let resp;
      if (image && (method === "online" || method === "cheque" || method === "owncheque")) {
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
      
      // ✅ Refresh banks to get updated balances
      dispatch(getBanks());
      
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

  // ✅ Helper to get selected bank info
  const getSelectedBankInfo = () => {
    if (!selectedBank) return null;
    return banks.find((b) => b._id === selectedBank);
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
          width: 450,
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          maxHeight: "90vh",
          overflowY: "auto",
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
          onChange={(e) => {
            setPaymentMethod(e.target.value.toLowerCase());
            setSelectedBank(""); // Reset bank selection when method changes
            setBankBalanceWarning("");
          }}
          fullWidth
          margin="normal"
          error={!!errors.paymentMethod}
          helperText={
            errors.paymentMethod ||
            (paymentMethod === "credit"
              ? "Credit = ledger-only (no bank/cash movement)"
              : paymentMethod === "cheque"
              ? "Pending cheque - no immediate bank deduction"
              : paymentMethod === "owncheque"
              ? "Cheque from your bank account - immediate deduction"
              : "")
          }
        >
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="online">Online Transfer</MenuItem>
          <MenuItem value="cheque">Cheque (Pending)</MenuItem>
          <MenuItem value="owncheque">Cheque from Own Account</MenuItem>
          <MenuItem value="credit">Credit</MenuItem>
        </TextField>

        {/* ✅ Show bank dropdown for ONLINE and OWN CHEQUE */}
        {(paymentMethod === "online" || paymentMethod === "owncheque") && (
          <>
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
                    {bank.bankName} (Balance: Rs {Number(bank.balance || 0).toLocaleString()})
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="" disabled>
                  No banks found
                </MenuItem>
              )}
            </TextField>

            {/* ✅ Show bank balance warning */}
            {bankBalanceWarning && (
              <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                {bankBalanceWarning}
              </Alert>
            )}

            {/* ✅ Show selected bank balance info */}
            {getSelectedBankInfo() && !bankBalanceWarning && (
              <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
                Available Balance: Rs {Number(getSelectedBankInfo().balance || 0).toLocaleString()}
              </Alert>
            )}
          </>
        )}

        {/* ✅ Show cheque date for CHEQUE and OWN CHEQUE */}
        {(paymentMethod === "cheque" || paymentMethod === "owncheque") && (
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

        {/* ✅ Show image upload for CHEQUE, ONLINE, and OWN CHEQUE */}
        {(paymentMethod === "cheque" || paymentMethod === "online" || paymentMethod === "owncheque") && (
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
          placeholder={`e.g. Payout to ${customer?.username || customer?.name || "customer"}`}
        />

        <Button
          variant="contained"
          color="primary"
          type="submit"
          fullWidth
          disabled={loading || !!bankBalanceWarning}
          sx={{ mt: 2 }}
        >
          {loading ? "Processing..." : "Add Balance"}
        </Button>
      </Box>
    </Modal>
  );
};

export default AddBalanceModal;