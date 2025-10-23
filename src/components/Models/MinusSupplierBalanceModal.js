import React, { useState, useEffect } from "react";
import { Modal, Box, TextField, Button, Typography, MenuItem, Grid } from "@mui/material";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { toast } from "react-toastify";

// Format number into "lac" with sign, e.g., -420000 => "-4.20 lac"
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

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const dispatch = useDispatch();
  const banks = useSelector((state) => state.bank.banks);

  useEffect(() => {
    dispatch(getBanks());
  }, [dispatch]);

  const API_URL = `${BACKEND_URL}api/suppliers`;
  const CASH_API_URL = `${BACKEND_URL}api/cash`;

  const currentBalance = Number(supplier?.balance || 0);

  const validateForm = () => {
    const formErrors = {};
    const numericAmount = parseFloat((amount || "").toString().trim());

    if (isNaN(numericAmount) || numericAmount <= 0) {
      formErrors.amount = "Amount must be a valid positive number";
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

      const cleanDesc = (description || "").trim();

      // 1) Tell backend to subtract (this may push balance further negative)
      const formData = new FormData();
      formData.append("balance", numericAmount.toString());
      formData.append("paymentMethod", (paymentMethod || "").toLowerCase());
      formData.append("description", cleanDesc);  // ✅ explicit dynamic text
      formData.append("desc", cleanDesc);         // ✅ send alias too
      formData.append("bankId", selectedBank || "");
      formData.append("chequeDate", chequeDate || "");
      if (image) formData.append("image", image);

      const supplierRes = await axios.post(
        `${API_URL}/minus-supplier-balance/${supplier._id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
      );

      toast.success(supplierRes.data?.message || "Balance subtracted from supplier");

      // 2) Record in the correct ledger with the SAME description
      let ledgerRes;

      if (paymentMethod === "cash") {
        // money received -> cash add
        ledgerRes = await axios.post(
          `${CASH_API_URL}/add`,
          {
            balance: numericAmount,
            type: "add",
            description: cleanDesc || `Payment received from supplier ${supplier.username}`, // fallback
          },
          { withCredentials: true }
        );
      } else if (paymentMethod === "online") {
        // money received -> bank add
        ledgerRes = await axios.post(
          `${BACKEND_URL}api/banks/${selectedBank}/transaction`,
          {
            amount: numericAmount,
            type: "add",
            description: cleanDesc || `Online payment received from supplier ${supplier.username}`, // fallback
          },
          { withCredentials: true }
        );
      } else if (paymentMethod === "cheque") {
        // cheque stays pending – bank/cash will increase on clearance
        toast.info("Cheque recorded as pending. Cash/Bank will increase when the cheque is cleared.");
      }

      if (paymentMethod === "cheque" || ledgerRes?.status === 200 || ledgerRes?.status === 201) {
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
      console.error("Error:", error?.response?.data || error.message);
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
    (paymentMethod === "online" && !selectedBank) ||
    (paymentMethod === "cheque" && !chequeDate) ||
    ((paymentMethod === "online" || paymentMethod === "cheque") && !image);

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
          onChange={(e) => setPaymentMethod(e.target.value)}
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
            {banks.map((bank) => (
              <MenuItem key={bank._id} value={bank._id}>
                {bank.bankName}
              </MenuItem>
            ))}
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
        />

        <Button
          variant="contained"
          color="primary"
          type="submit"
          fullWidth
          disabled={disableSubmit}
        >
          {loading ? "Submitting..." : "Subtract Balance"}
        </Button>
      </Box>
    </Modal>
  );
};

export default MinusSupplierBalanceModal;
