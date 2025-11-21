import React, { useState, useEffect } from "react";
import { Modal, Box, TextField, Button, Typography, MenuItem, Grid } from "@mui/material";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { toast } from "react-toastify";

const AddSupplierBalanceModal = ({ open, onClose, supplier, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(""); // cash | online | cheque | credit
  const [chequeDate, setChequeDate] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const dispatch = useDispatch();
  const banks = useSelector((state) => state.bank.banks || []);

  useEffect(() => {
    if (open) dispatch(getBanks());
  }, [dispatch, open]);

  const SUPPLIER_API_URL = `${BACKEND_URL}api/suppliers`;
  const CASH_API_URL = `${BACKEND_URL}api/cash`;

  const validateForm = () => {
    const formErrors = {};
    const n = Number(amount);

    if (!amount || !Number.isFinite(n) || n <= 0) {
      formErrors.amount = "Amount must be a positive number";
    }
    if (!paymentMethod) {
      formErrors.paymentMethod = "Payment method is required";
    }

    // ✅ UPDATED: Only require bank for ONLINE (not cheque)
    if (paymentMethod === "online") {
      if (!selectedBank) {
        formErrors.selectedBank = "Bank selection is required for online payment";
      }
      if (!image) {
        formErrors.image = "Image upload is required for online payment";
      }
    }

    // ✅ For cheque: only require chequeDate and image (NO bank)
    if (paymentMethod === "cheque") {
      if (!chequeDate) {
        formErrors.chequeDate = "Cheque date is required for cheque";
      }
      if (!image) {
        formErrors.image = "Image upload is required for cheque";
      }
    }

    // credit: no extra requirements

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

      const validAmount = Number(amount);
      if (!Number.isFinite(validAmount)) {
        setErrors((prev) => ({ ...prev, amount: "Invalid amount" }));
        return;
      }

      // Build form data for supplier transaction
      const formData = new FormData();
      formData.append("amount", validAmount);
      formData.append("paymentMethod", (paymentMethod || "").toLowerCase()); // controller normalizes
      formData.append("description", description?.trim() || "");
      formData.append("desc", description?.trim() || ""); // alias
      formData.append("name", supplier?.username || "");

      // ✅ UPDATED: Only send bankId for ONLINE (not cheque)
      if (paymentMethod === "online") {
        formData.append("bankId", selectedBank);
        if (image) formData.append("image", image);
      }
      
      if (paymentMethod === "cheque") {
        formData.append("chequeDate", chequeDate);
        formData.append("status", "pending");
        if (image) formData.append("image", image);
      }

      // 1) Create supplier-side transaction (source of truth)
      const supplierRes = await axios.post(
        `${SUPPLIER_API_URL}/${supplier._id}/transaction`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (supplierRes.status !== 200 && supplierRes.status !== 201) {
        throw new Error("Failed to add transaction to supplier");
      }

      toast.success(supplierRes.data.message || "Transaction added successfully");

      // 2) Mirror to cash/bank ledgers where applicable
      let ledgerRes;

      if (paymentMethod === "cash") {
        // Paying supplier with cash -> cash deduct
        ledgerRes = await axios.post(
          `${CASH_API_URL}/add`,
          {
            balance: validAmount,
            type: "deduct",
            description:
              description?.trim() ||
              `Cash payment to supplier ${supplier.username}`,
          },
          { withCredentials: true }
        );
      } else if (paymentMethod === "online") {
        // Paying supplier online -> bank subtract
        ledgerRes = await axios.post(
          `${BACKEND_URL}api/banks/${selectedBank}/transaction`,
          {
            amount: validAmount,
            type: "subtract",
            description:
              description?.trim() ||
              `Online payment to supplier ${supplier.username}`,
          },
          { withCredentials: true }
        );
      } else if (paymentMethod === "cheque") {
        // Cheque recorded as pending; bank will move on clearance
        toast.info("Cheque added as pending. It will deduct once cleared.");
      } else if (paymentMethod === "credit") {
        // Credit = ledger-only (supplier balance), no cash/bank movement
        toast.info("Credit recorded (no immediate cash/bank movement).");
      }

      if (
        paymentMethod === "cheque" ||
        paymentMethod === "credit" ||
        ledgerRes?.status === 200 ||
        ledgerRes?.status === 201
      ) {
        if (paymentMethod === "cash" || paymentMethod === "online") {
          toast.success("Payment recorded in ledger");
        }
        // 3) Notify parent with updated supplier balance (if returned)
        const updatedSupplier = {
          ...supplier,
          balance: supplierRes?.data?.supplier?.balance ?? supplier.balance,
        };
        onSuccess?.(updatedSupplier);
        onClose?.();

        // reset form
        setAmount("");
        setPaymentMethod("");
        setChequeDate("");
        setDescription("");
        setSelectedBank("");
        setImage(null);
        setImagePreview("");
        setErrors({});
      } else {
        throw new Error("Failed to record payment in ledger");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add balance or record payment");
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
          Add Balance to {supplier?.username}
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
        />

        <TextField
          label="Payment Method"
          select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          fullWidth
          margin="normal"
          error={!!errors.paymentMethod}
          helperText={
            errors.paymentMethod ||
            (paymentMethod === "credit"
              ? "Credit = supplier ledger only (no bank/cash movement now)"
              : "")
          }
        >
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="online">Online</MenuItem>
          <MenuItem value="cheque">Cheque</MenuItem>
          <MenuItem value="credit">Credit</MenuItem>
        </TextField>

        {/* ✅ UPDATED: Only show bank for ONLINE (not cheque) */}
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
                style={{ width: "100%", maxHeight: "200px" }}
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
              ? "e.g. Credit note / adjust supplier ledger"
              : `e.g. Payment to supplier ${supplier?.username || ""}`
          }
        />

        <Button
          variant="contained"
          color="primary"
          type="submit"
          fullWidth
          disabled={loading}
        >
          {loading ? "Submitting..." : "Add Balance"}
        </Button>
      </Box>
    </Modal>
  );
};

export default AddSupplierBalanceModal;