import React, { useState, useEffect } from "react";
import { Modal, Box, TextField, Button, Typography, MenuItem, Grid, Alert } from "@mui/material";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { toast } from "react-toastify";

const withSlash = (u = "") => (u.endsWith("/") ? u : `${u}/`);

function formatLac(value) {
  const num = Number(value || 0);
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  return `${sign}${(abs / 100000).toFixed(2)} lac`;
}

const MinusSupplierBalanceModal = ({ open, onClose, supplier, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const RAW_BACKEND = process.env.REACT_APP_BACKEND_URL || "";
  const BACKEND_URL = withSlash(RAW_BACKEND);

  const dispatch = useDispatch();
  const banks = useSelector((state) => state.bank.banks || []);

  useEffect(() => {
    if (open) {
      dispatch(getBanks());
      setErrors({});
      setLoading(false);
    } else {
      // Reset on close
      setAmount("");
      setPaymentMethod("");
      setChequeDate("");
      setDescription("");
      setSelectedBank("");
      setImage(null);
      setImagePreview("");
      setErrors({});
    }
  }, [dispatch, open]);

  const API_URL = `${BACKEND_URL}api/suppliers`;
  const CASH_API_URL = `${BACKEND_URL}api/cash`;

  const currentBalance = Number(supplier?.balance || 0);

  // Helper to get selected bank info
  const getSelectedBankInfo = () => {
    if (!selectedBank) return null;
    return banks.find((b) => b._id === selectedBank);
  };

  const validateForm = () => {
    const formErrors = {};
    const numericAmount = parseFloat((amount || "").toString().trim());

    if (isNaN(numericAmount) || numericAmount <= 0) {
      formErrors.amount = "Amount must be a valid positive number";
    }
    if (!paymentMethod) {
      formErrors.paymentMethod = "Payment method is required";
    }

    // Online: require bank and image
    if (paymentMethod === "online") {
      if (!selectedBank) {
        formErrors.selectedBank = "Bank selection is required for online payment";
      }
      if (!image) {
        formErrors.image = "Image upload is required for online payment";
      }
    }

    // Regular cheque: only require chequeDate and image (NO bank)
    if (paymentMethod === "cheque") {
      if (!chequeDate) {
        formErrors.chequeDate = "Cheque date is required for cheque payment";
      }
      if (!image) {
        formErrors.image = "Image upload is required for cheque payment";
      }
    }

    // ✅ Own Cheque: require bank, chequeDate, and image
    if (paymentMethod === "owncheque") {
      if (!selectedBank) {
        formErrors.selectedBank = "Bank selection is required for own cheque";
      }
      if (!chequeDate) {
        formErrors.chequeDate = "Cheque date is required";
      }
      if (!image) {
        formErrors.image = "Image is required for cheque";
      }
    }

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (!supplier?._id) {
        toast.error("Supplier data is missing or invalid");
        return;
      }

      if (!validateForm()) return;

      const numericAmount = parseFloat(amount.trim());
      if (isNaN(numericAmount) || numericAmount <= 0) {
        toast.error("Amount is not a valid number.");
        return;
      }

      const method = (paymentMethod || "").toLowerCase().trim();
      const cleanDesc = (description || "").trim();

      // Build form data
      const formData = new FormData();
      formData.append("balance", numericAmount.toString());
      formData.append("paymentMethod", method);
      formData.append("description", cleanDesc);
      formData.append("desc", cleanDesc);
      
      // Send bankId for online and owncheque
      if (method === "online" || method === "owncheque") {
        formData.append("bankId", selectedBank);
      }
      
      // Send chequeDate for cheque and owncheque
      if (method === "cheque" || method === "owncheque") {
        formData.append("chequeDate", chequeDate || "");
      }
      
      if (image) formData.append("image", image);

      const supplierRes = await axios.post(
        `${API_URL}/minus-supplier-balance/${supplier._id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
      );

      toast.success(supplierRes.data?.message || "Balance subtracted from supplier");

      // Ledger entry handling
      let ledgerRes;
      if (method === "cash") {
        ledgerRes = await axios.post(
          `${CASH_API_URL}/add`,
          {
            balance: numericAmount,
            type: "add",
            description: cleanDesc || `Payment received from supplier ${supplier?.username || ""}`.trim(),
          },
          { withCredentials: true }
        );
      } else if (method === "online") {
        ledgerRes = await axios.post(
          `${BACKEND_URL}api/banks/${selectedBank}/transaction`,
          {
            amount: numericAmount,
            type: "add",
            description: cleanDesc || `Online payment received from supplier ${supplier?.username || ""}`.trim(),
          },
          { withCredentials: true }
        );
      } else if (method === "owncheque") {
        // Own cheque - bank already updated by backend
        toast.success("Cheque deposited to bank immediately.");
      } else if (method === "cheque") {
        toast.info("Cheque recorded as pending. Cash/Bank will increase when the cheque is cleared.");
      } else if (method === "credit") {
        toast.info("Credit recorded (no immediate cash/bank movement).");
      }

      // Refresh banks to get updated balances
      dispatch(getBanks());

      if (
        method === "cheque" ||
        method === "credit" ||
        method === "owncheque" ||
        ledgerRes?.status === 200 ||
        ledgerRes?.status === 201
      ) {
        onSuccess?.(supplierRes.data?.supplier || supplier);
        onClose?.();

        // reset
        setAmount("");
        setPaymentMethod("");
        setChequeDate("");
        setDescription("");
        setSelectedBank("");
        setImage(null);
        setImagePreview("");
        setErrors({});
      } else {
        throw new Error("Failed to post Cash/Bank ledger entry");
      }
    } catch (error) {
      const apiMsg = error?.response?.data?.message;
      if (apiMsg) toast.error(apiMsg);
      else toast.error("Failed to post transaction.");
      console.error("Supplier minus error:", error?.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPEG and PNG files are allowed");
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const disableSubmit =
    loading ||
    !amount ||
    parseFloat(amount) <= 0 ||
    !paymentMethod ||
    (paymentMethod === "online" && (!selectedBank || !image)) ||
    (paymentMethod === "cheque" && (!chequeDate || !image)) ||
    (paymentMethod === "owncheque" && (!selectedBank || !chequeDate || !image));

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
          Subtract Balance from {supplier?.username}
        </Typography>

        <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
          Current Balance: <strong>{formatLac(currentBalance)}</strong>
        </Typography>

        <TextField
          label="Amount"
          type="number"
          inputProps={{ min: 0, step: "0.01" }}
          value={amount}
          onChange={(e) => {
            const v = e.target.value;
            if (Number(v) < 0) return;
            setAmount(v);
          }}
          fullWidth
          margin="normal"
          error={!!errors.amount}
          helperText={errors.amount}
        />

        <TextField
          label="Payment Method"
          select
          value={paymentMethod}
          onChange={(e) => {
            const v = e.target.value;
            setPaymentMethod(v);
            setSelectedBank("");
            if (v !== "cheque" && v !== "owncheque") setChequeDate("");
            if (v === "credit" || v === "cash") {
              setImage(null);
              setImagePreview("");
            }
          }}
          fullWidth
          margin="normal"
          error={!!errors.paymentMethod}
          helperText={
            errors.paymentMethod ||
            (paymentMethod === "credit"
              ? "Credit = supplier ledger only (no bank/cash movement now)"
              : paymentMethod === "cheque"
              ? "Pending cheque - no immediate bank addition"
              : paymentMethod === "owncheque"
              ? "Cheque deposited to your bank - immediate addition"
              : "")
          }
        >
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="online">Online Transfer</MenuItem>
          <MenuItem value="cheque">Cheque (Pending)</MenuItem>
          <MenuItem value="owncheque">Cheque to Own Account</MenuItem>
          <MenuItem value="credit">Credit</MenuItem>
        </TextField>

        {/* Show bank dropdown for ONLINE and OWN CHEQUE */}
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
              {banks.length ? (
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

            {/* Show selected bank balance info */}
            {getSelectedBankInfo() && (
              <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
                Current Balance: Rs {Number(getSelectedBankInfo().balance || 0).toLocaleString()}
                {amount && (
                  <> → After deposit: Rs {(Number(getSelectedBankInfo().balance || 0) + Number(amount || 0)).toLocaleString()}</>
                )}
              </Alert>
            )}
          </>
        )}

        {/* Show cheque date for CHEQUE and OWN CHEQUE */}
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

        {/* Show image upload for ONLINE, CHEQUE, and OWN CHEQUE */}
        {(paymentMethod === "online" || paymentMethod === "cheque" || paymentMethod === "owncheque") && (
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
                style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8 }}
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
              ? "e.g. Credit note / write-off / adjustment"
              : paymentMethod === "owncheque"
              ? `e.g. Cheque deposited from supplier ${supplier?.username || ""}`
              : `e.g. Payment received from supplier ${supplier?.username || ""}`
          }
        />

        <Button variant="contained" color="primary" type="submit" fullWidth disabled={disableSubmit}>
          {loading ? "Submitting..." : "Subtract Balance"}
        </Button>
      </Box>
    </Modal>
  );
};

export default MinusSupplierBalanceModal;