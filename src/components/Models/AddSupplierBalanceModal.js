import React, { useState, useEffect } from "react";
import { Modal, Box, TextField, Button, Typography, MenuItem, Grid } from "@mui/material";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { toast } from "react-toastify";

const AddSupplierBalanceModal = ({ open, onClose, supplier, onSuccess }) => {
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

    if (!supplier?._id) {
      toast.error("Supplier data is missing or invalid");
      setLoading(false);
      return;
    }
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    const validAmount = Number(amount);
    if (!Number.isFinite(validAmount)) {
      setErrors((prev) => ({ ...prev, amount: "Invalid amount" }));
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("amount", validAmount);
    formData.append("paymentMethod", paymentMethod);     // controller normalizes case
    formData.append("description", description?.trim() || "");
    formData.append("desc", description?.trim() || "");  // safety: controller accepts desc too
    // optional name (if you want it in productName)
    formData.append("name", supplier?.username || "");

    if (paymentMethod === "online" || paymentMethod === "cheque") {
      formData.append("bankId", selectedBank);
      if (image) formData.append("image", image);
    }
    if (paymentMethod === "cheque") {
      formData.append("chequeDate", chequeDate);
      formData.append("status", "pending");
    }

    try {
      // 1) Add supplier transaction with your dynamic description
      const supplierRes = await axios.post(
        `${SUPPLIER_API_URL}/${supplier._id}/transaction`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (supplierRes.status !== 200 && supplierRes.status !== 201) {
        throw new Error("Failed to add transaction to supplier");
      }

      toast.success(supplierRes.data.message || "Transaction added successfully");

      // 2) Mirror it into the correct ledger with the SAME description
      let deductionResponse;

      if (paymentMethod === "cash") {
        // cash: record as a deduct (money left you)
        deductionResponse = await axios.post(
          `${CASH_API_URL}/add`,
          {
            balance: validAmount,
            type: "deduct",
            description: description?.trim() || `Cash payment to supplier ${supplier.username}`,
          },
          { withCredentials: true }
        );
      } else if (paymentMethod === "online") {
        // bank: subtract from bank with same description
        deductionResponse = await axios.post(
          `${BACKEND_URL}api/banks/${selectedBank}/transaction`,
          {
            amount: validAmount,
            type: "subtract",
            description: description?.trim() || `Online payment to supplier ${supplier.username}`,
          },
          { withCredentials: true }
        );
      } else if (paymentMethod === "cheque") {
        // cheque: do not deduct yet (pending)
        toast.info("Cheque added as pending. It will be deducted once cleared.");
      }

      if (
        paymentMethod === "cheque" ||
        deductionResponse?.status === 200 ||
        deductionResponse?.status === 201
      ) {
        if (paymentMethod !== "cheque") {
          toast.success("Payment recorded in ledger");
        }
        // 3) Bubble new supplier balance up
        const updatedSupplier = {
          ...supplier,
          balance: supplierRes?.data?.supplier?.balance ?? supplier.balance,
        };
        onSuccess?.(updatedSupplier);
        onClose?.();

        // reset form for next time
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
          helperText={errors.paymentMethod}
        >
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="online">Online</MenuItem>
          <MenuItem value="cheque">Cheque</MenuItem>
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
