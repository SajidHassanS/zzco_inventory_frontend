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

const normBase = (raw) => {
  if (!raw) return "";
  return raw.endsWith("/") ? raw : `${raw}/`;
};

const MinusBalanceModal = ({ open, onClose, customer, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // ✅ NEW: Transfer Cheque State
  const [transferTo, setTransferTo] = useState(""); // "customer" | "supplier"
  const [transferToId, setTransferToId] = useState("");
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const RAW_BACKEND = process.env.REACT_APP_BACKEND_URL || "";
  const BASE = normBase(RAW_BACKEND);
  const API_URL = `${BASE}api/customers`;

  const dispatch = useDispatch();
  const banks = useSelector((state) => state.bank.banks || []);

  useEffect(() => {
    if (open) {
      dispatch(getBanks());
      fetchEntities();
      setErrors({});
      setLoading(false);
    }
  }, [dispatch, open]);

  // ✅ Fetch customers and suppliers for transfer
  const fetchEntities = async () => {
    try {
      const baseUrl = BASE;
      const [custResp, suppResp] = await Promise.all([
        axios.get(`${baseUrl}api/customers/allcustomer`, { withCredentials: true }),
        axios.get(`${baseUrl}api/suppliers`, { withCredentials: true }),
      ]);

      const customersData = Array.isArray(custResp.data) 
        ? custResp.data 
        : custResp.data?.customers || [];
      
      const suppliersData = Array.isArray(suppResp.data)
        ? suppResp.data
        : suppResp.data?.suppliers || [];

      setCustomers(customersData);
      setSuppliers(suppliersData);
    } catch (err) {
      console.error("Error fetching entities:", err);
    }
  };

  const validateForm = () => {
    const formErrors = {};

    const amt = Number(amount);
    if (!amount || !Number.isFinite(amt) || amt <= 0) {
      formErrors.amount = "Please provide a valid amount greater than 0";
    }
    if (!paymentMethod) {
      formErrors.paymentMethod = "Payment method is required";
    }

    // ✅ Transfer Cheque validations
    if (paymentMethod === "transfercheque") {
      if (!selectedBank) {
        formErrors.selectedBank = "Bank is required for transfer cheque";
      }
      if (!chequeDate) {
        formErrors.chequeDate = "Cheque date is required";
      }
      if (!image) {
        formErrors.image = "Cheque image is required";
      }
      if (!transferTo) {
        formErrors.transferTo = "Please select transfer destination type";
      }
      if (!transferToId) {
        formErrors.transferToId = "Please select who to transfer to";
      }
    }

    // ✅ UPDATED: Only validate bank for ONLINE (not cheque)
    if (paymentMethod === "online") {
      if (!selectedBank) {
        formErrors.selectedBank = "Bank selection is required for online payment";
      }
      if (!image) {
        formErrors.image = "Image is required for online payment";
      }
    }

    // ✅ For cheque: only require chequeDate and image (NO bank)
    if (paymentMethod === "cheque") {
      if (!chequeDate) {
        formErrors.chequeDate = "Cheque date is required for cheque payment";
      }
      if (!image) {
        formErrors.image = "Image is required for cheque payment";
      }
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

      // ✅ UPDATED: Only send bankId for online and transfercheque (not regular cheque)
      const base = {
        amount: amt,
        paymentMethod: method,
        description: cleanDesc,
        ...(method === "online" || method === "transfercheque" 
          ? { bankId: selectedBank } 
          : {}),
        ...(method === "cheque" || method === "transfercheque" 
          ? { chequeDate } 
          : {}),
        // ✅ Add transfer details for transfercheque
        ...(method === "transfercheque" 
          ? { 
              transferTo, 
              transferToId,
            } 
          : {}),
      };

      let resp;
      if (image && (method === "online" || method === "cheque" || method === "transfercheque")) {
        const fd = new FormData();
        Object.entries(base).forEach(([k, v]) => fd.append(k, v));
        fd.append("image", image);

        resp = await axios.post(
          `${API_URL}/minus-customer-balance/${customer._id}`,
          fd,
          { withCredentials: true }
        );
      } else {
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
          width: 500,
          maxHeight: "90vh",
          overflow: "auto",
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
          onChange={(e) => {
            setPaymentMethod(e.target.value.toLowerCase());
            // Reset transfer fields when changing payment method
            if (e.target.value.toLowerCase() !== "transfercheque") {
              setTransferTo("");
              setTransferToId("");
            }
          }}
          fullWidth
          margin="normal"
          error={!!errors.paymentMethod}
          helperText={
            errors.paymentMethod ||
            (paymentMethod === "credit"
              ? "Credit = ledger-only (no bank/cash movement)"
              : paymentMethod === "transfercheque"
              ? "Transfer this cheque to another customer or supplier"
              : "")
          }
          disabled={loading}
        >
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="online">Online</MenuItem>
          <MenuItem value="cheque">Cheque</MenuItem>
          <MenuItem value="credit">Credit</MenuItem>
          <MenuItem value="transfercheque">Transfer Cheque</MenuItem>
        </TextField>

        {/* ✅ UPDATED: Only show bank for ONLINE and TRANSFERCHEQUE (not regular cheque) */}
        {(paymentMethod === "online" || paymentMethod === "transfercheque") && (
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

        {(paymentMethod === "cheque" || paymentMethod === "transfercheque") && (
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

        {(paymentMethod === "online" || paymentMethod === "cheque" || paymentMethod === "transfercheque") && (
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
                style={{ width: "100%", maxHeight: 200, objectFit: "contain", marginTop: 10 }}
              />
            )}
          </Grid>
        )}

        {/* ✅ Transfer Cheque Options */}
        {paymentMethod === "transfercheque" && (
          <>
            <TextField
              label="Transfer To"
              select
              value={transferTo}
              onChange={(e) => {
                setTransferTo(e.target.value);
                setTransferToId(""); // Reset selection when changing type
              }}
              fullWidth
              margin="normal"
              error={!!errors.transferTo}
              helperText={errors.transferTo}
              disabled={loading}
            >
              <MenuItem value="">-- Select Type --</MenuItem>
              <MenuItem value="customer">Customer</MenuItem>
              <MenuItem value="supplier">Supplier</MenuItem>
            </TextField>

            {transferTo && (
              <TextField
                label={`Select ${transferTo === "customer" ? "Customer" : "Supplier"}`}
                select
                value={transferToId}
                onChange={(e) => setTransferToId(e.target.value)}
                fullWidth
                margin="normal"
                error={!!errors.transferToId}
                helperText={errors.transferToId}
                disabled={loading}
              >
                <MenuItem value="">
                  -- Select {transferTo === "customer" ? "Customer" : "Supplier"} --
                </MenuItem>
                {(transferTo === "customer" ? customers : suppliers)
                  .filter((entity) => {
                    // ✅ Safe filtering with null checks
                    if (!entity || !entity._id) return false;
                    if (!customer || !customer._id) return true;
                    return entity._id !== customer._id;
                  })
                  .map((entity) => (
                    <MenuItem key={entity._id} value={entity._id}>
                      {entity.username || entity.name}
                    </MenuItem>
                  ))}
              </TextField>
            )}
          </>
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
            paymentMethod === "transfercheque"
              ? `e.g. Cheque transferred to ${transferTo || "..."}`
              : paymentMethod === "credit"
              ? `e.g. Credit adjustment for ${customer?.username || customer?.name || "customer"}`
              : `e.g. Payment received from ${customer?.username || customer?.name || "customer"}`
          }
          disabled={loading}
        />

        <Button
          variant="contained"
          color="primary"
          type="submit"
          fullWidth
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? "Processing..." : "Subtract Balance"}
        </Button>
      </Box>
    </Modal>
  );
};

export default MinusBalanceModal;