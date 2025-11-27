import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Grid,
  Alert,
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

  // Transfer State (for both cheque and online transfer)
  const [transferTo, setTransferTo] = useState("");
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
    } else {
      // Reset on close
      setAmount("");
      setPaymentMethod("");
      setChequeDate("");
      setDescription("");
      setSelectedBank("");
      setImage(null);
      setImagePreview("");
      setTransferTo("");
      setTransferToId("");
      setErrors({});
    }
  }, [dispatch, open]);

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

  // Helper to get selected bank info
  const getSelectedBankInfo = () => {
    if (!selectedBank) return null;
    return banks.find((b) => b._id === selectedBank);
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

    // Transfer Cheque validations
    if (paymentMethod === "transfercheque") {
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

    // ✅ NEW: Transfer Online validations
    if (paymentMethod === "transferonline") {
      if (!image) {
        formErrors.image = "Screenshot/proof is required for online transfer";
      }
      if (!transferTo) {
        formErrors.transferTo = "Please select transfer destination type";
      }
      if (!transferToId) {
        formErrors.transferToId = "Please select who to transfer to";
      }
    }

    // Online: require bank and image
    if (paymentMethod === "online") {
      if (!selectedBank) {
        formErrors.selectedBank = "Bank selection is required for online payment";
      }
      if (!image) {
        formErrors.image = "Image is required for online payment";
      }
    }

    // Regular cheque: only require chequeDate and image (NO bank)
    if (paymentMethod === "cheque") {
      if (!chequeDate) {
        formErrors.chequeDate = "Cheque date is required for cheque payment";
      }
      if (!image) {
        formErrors.image = "Image is required for cheque payment";
      }
    }

    // Own Cheque: require bank, chequeDate, and image
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

      const base = {
        amount: amt,
        paymentMethod: method,
        description: cleanDesc,
        // Send bankId for online and owncheque
        ...((method === "online" || method === "owncheque") ? { bankId: selectedBank } : {}),
        // Send chequeDate for cheque, transfercheque, and owncheque
        ...((method === "cheque" || method === "transfercheque" || method === "owncheque") ? { chequeDate } : {}),
        // Add transfer details for transfercheque AND transferonline
        ...((method === "transfercheque" || method === "transferonline")
          ? {
              transferTo,
              transferToId,
            }
          : {}),
      };

      let resp;
      if (image && (method === "online" || method === "cheque" || method === "transfercheque" || method === "owncheque" || method === "transferonline")) {
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
      
      // Refresh banks to get updated balances
      dispatch(getBanks());
      
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

  // Check if current method is a transfer method
  const isTransferMethod = paymentMethod === "transfercheque" || paymentMethod === "transferonline";

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
            setSelectedBank("");
            // Reset transfer fields when changing to non-transfer method
            if (!["transfercheque", "transferonline"].includes(e.target.value.toLowerCase())) {
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
              ? "Transfer this cheque to another customer or supplier (pending)"
              : paymentMethod === "transferonline"
              ? "Transfer online payment to another customer or supplier (immediate)"
              : paymentMethod === "cheque"
              ? "Pending cheque - no immediate bank addition"
              : paymentMethod === "owncheque"
              ? "Cheque deposited to your bank - immediate addition"
              : "")
          }
          disabled={loading}
        >
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="online">Online Transfer</MenuItem>
          <MenuItem value="cheque">Cheque (Pending)</MenuItem>
          <MenuItem value="owncheque">Cheque to Own Account</MenuItem>
          <MenuItem value="credit">Credit</MenuItem>
          <MenuItem value="transfercheque">Transfer Cheque</MenuItem>
          <MenuItem value="transferonline">Transfer Online</MenuItem>
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
              disabled={loading}
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

        {/* Show cheque date for CHEQUE, TRANSFERCHEQUE, and OWN CHEQUE */}
        {(paymentMethod === "cheque" || paymentMethod === "transfercheque" || paymentMethod === "owncheque") && (
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

        {/* Show image upload for ONLINE, CHEQUE, TRANSFERCHEQUE, OWN CHEQUE, and TRANSFERONLINE */}
        {(paymentMethod === "online" || paymentMethod === "cheque" || paymentMethod === "transfercheque" || paymentMethod === "owncheque" || paymentMethod === "transferonline") && (
          <Grid item xs={12}>
            <TextField
              type="file"
              label={paymentMethod === "transferonline" ? "Upload Screenshot/Proof" : "Upload Image"}
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

        {/* Transfer Options (for both Transfer Cheque and Transfer Online) */}
        {isTransferMethod && (
          <>
            <Alert severity="warning" sx={{ mt: 2, mb: 1 }}>
              {paymentMethod === "transfercheque" 
                ? "⚠️ This will transfer the cheque to another entity (pending status)"
                : "⚠️ This will transfer the online payment to another entity (completed immediately)"}
            </Alert>
            
            <TextField
              label="Transfer To"
              select
              value={transferTo}
              onChange={(e) => {
                setTransferTo(e.target.value);
                setTransferToId("");
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
              : paymentMethod === "transferonline"
              ? `e.g. Online payment transferred to ${transferTo || "..."}`
              : paymentMethod === "credit"
              ? `e.g. Credit adjustment for ${customer?.username || customer?.name || "customer"}`
              : paymentMethod === "owncheque"
              ? `e.g. Cheque deposited from ${customer?.username || customer?.name || "customer"}`
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