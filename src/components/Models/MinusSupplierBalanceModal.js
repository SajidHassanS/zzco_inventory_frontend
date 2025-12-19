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

  // ✅ NEW: Transfer state
  const [transferTo, setTransferTo] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [shippers, setShippers] = useState([]);

  const RAW_BACKEND = process.env.REACT_APP_BACKEND_URL || "";
  const BACKEND_URL = withSlash(RAW_BACKEND);

  const dispatch = useDispatch();
  const banks = useSelector((state) => state.bank.banks || []);

  useEffect(() => {
    if (open) {
      dispatch(getBanks());
      fetchEntities(); // ✅ Fetch entities for transfer
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

  // ✅ NEW: Fetch customers, suppliers, shippers for transfer options
  const fetchEntities = async () => {
    try {
      const [custResp, suppResp, shipResp] = await Promise.all([
        axios.get(`${BACKEND_URL}api/customers/allcustomer`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}api/suppliers`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}api/shippers`, { withCredentials: true }),
      ]);

      const customersData = Array.isArray(custResp.data)
        ? custResp.data
        : custResp.data?.customers || [];

      const suppliersData = Array.isArray(suppResp.data)
        ? suppResp.data
        : suppResp.data?.suppliers || [];

      const shippersData = Array.isArray(shipResp.data)
        ? shipResp.data
        : shipResp.data?.shippers || shipResp.data || [];

      setCustomers(customersData);
      setSuppliers(suppliersData);
      setShippers(shippersData);
    } catch (err) {
      console.error("Error fetching entities:", err);
    }
  };

  const API_URL = `${BACKEND_URL}api/suppliers`;

  const currentBalance = Number(supplier?.balance || 0);

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

    // ✅ NEW: Transfer cheque validation
    if (paymentMethod === "transfercheque") {
      if (!chequeDate) formErrors.chequeDate = "Cheque date is required";
      if (!image) formErrors.image = "Cheque image is required";
      if (!transferTo) formErrors.transferTo = "Please select transfer destination type";
      if (!transferToId) formErrors.transferToId = "Please select who to transfer to";
    }

    // ✅ NEW: Transfer online validation
    if (paymentMethod === "transferonline") {
      if (!image) formErrors.image = "Screenshot/proof is required for online transfer";
      if (!transferTo) formErrors.transferTo = "Please select transfer destination type";
      if (!transferToId) formErrors.transferToId = "Please select who to transfer to";
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

      if (!validateForm()) {
        setLoading(false);
        return;
      }

      const numericAmount = parseFloat(amount.trim());
      if (isNaN(numericAmount) || numericAmount <= 0) {
        toast.error("Amount is not a valid number.");
        setLoading(false);
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
      
      // Send chequeDate for cheque, owncheque, and transfercheque
      if (method === "cheque" || method === "owncheque" || method === "transfercheque") {
        formData.append("chequeDate", chequeDate || "");
      }

      // ✅ NEW: Transfer fields
      if (method === "transfercheque" || method === "transferonline") {
        formData.append("transferTo", transferTo);
        formData.append("transferToId", transferToId);
      }
      
      if (image) formData.append("image", image);

      const supplierRes = await axios.post(
        `${API_URL}/minus-supplier-balance/${supplier._id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
      );

      toast.success(supplierRes.data?.message || "Balance subtracted from supplier");

      // Refresh banks to get updated balances
      dispatch(getBanks());

      onSuccess?.(supplierRes.data?.supplier || supplier);
      onClose?.();

      // Reset form
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

  const isTransferMethod = paymentMethod === "transfercheque" || paymentMethod === "transferonline";

  const disableSubmit =
    loading ||
    !amount ||
    parseFloat(amount) <= 0 ||
    !paymentMethod ||
    (paymentMethod === "online" && (!selectedBank || !image)) ||
    (paymentMethod === "cheque" && (!chequeDate || !image)) ||
    (paymentMethod === "owncheque" && (!selectedBank || !chequeDate || !image)) ||
    (paymentMethod === "transfercheque" && (!chequeDate || !image || !transferTo || !transferToId)) ||
    (paymentMethod === "transferonline" && (!image || !transferTo || !transferToId));

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
          disabled={loading}
        />

        <TextField
          label="Payment Method"
          select
          value={paymentMethod}
          onChange={(e) => {
            const v = e.target.value;
            setPaymentMethod(v);
            setSelectedBank("");
            if (v !== "cheque" && v !== "owncheque" && v !== "transfercheque") setChequeDate("");
            if (v === "credit" || v === "cash") {
              setImage(null);
              setImagePreview("");
            }
            // Reset transfer fields if not transfer method
            if (v !== "transfercheque" && v !== "transferonline") {
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
              ? "Credit = supplier ledger only (no bank/cash movement now)"
              : paymentMethod === "cheque"
              ? "Pending cheque - no immediate bank addition"
              : paymentMethod === "owncheque"
              ? "Cheque deposited to your bank - immediate addition"
              : paymentMethod === "transfercheque"
              ? "Transfer this cheque to another entity (pending)"
              : paymentMethod === "transferonline"
              ? "Transfer online payment to another entity (immediate)"
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
          <MenuItem value="transferonline">Transfer To Others</MenuItem>
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

        {/* Show cheque date for CHEQUE, OWN CHEQUE, and TRANSFER CHEQUE */}
        {(paymentMethod === "cheque" || paymentMethod === "owncheque" || paymentMethod === "transfercheque") && (
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

        {/* Show image upload for ONLINE, CHEQUE, OWN CHEQUE, TRANSFER CHEQUE, TRANSFER ONLINE */}
        {(paymentMethod === "online" || 
          paymentMethod === "cheque" || 
          paymentMethod === "owncheque" ||
          paymentMethod === "transfercheque" ||
          paymentMethod === "transferonline") && (
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
                style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8 }}
              />
            )}
          </Grid>
        )}

        {/* ✅ NEW: TRANSFER OPTIONS */}
        {(paymentMethod === "transfercheque" || paymentMethod === "transferonline") && (
          <>
            <Alert severity="warning" sx={{ mt: 2, mb: 1 }}>
              {paymentMethod === "transfercheque"
                ? "⚠️ This will transfer the cheque to another entity (pending)"
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
              <MenuItem value="shipper">Shipper</MenuItem>
            </TextField>

            {transferTo && (
              <TextField
                label={`Select ${
                  transferTo === "customer" ? "Customer" : transferTo === "supplier" ? "Supplier" : "Shipper"
                }`}
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
                  -- Select {transferTo === "customer" ? "Customer" : transferTo === "supplier" ? "Supplier" : "Shipper"} --
                </MenuItem>

                {(transferTo === "customer"
                  ? customers
                  : transferTo === "supplier"
                  ? suppliers
                  : shippers
                )
                  .filter((entity) => {
                    if (!entity || !entity._id) return false;
                    // Avoid offering the same supplier as destination
                    if (transferTo === "supplier" && supplier && supplier._id) {
                      return entity._id !== supplier._id;
                    }
                    return true;
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
            paymentMethod === "credit"
              ? "e.g. Credit note / write-off / adjustment"
              : paymentMethod === "owncheque"
              ? `e.g. Cheque deposited from supplier ${supplier?.username || ""}`
              : paymentMethod === "transfercheque"
              ? `e.g. Cheque transferred to ${transferTo || "..."}`
              : paymentMethod === "transferonline"
              ? `e.g. Online payment transferred to ${transferTo || "..."}`
              : `e.g. Payment received from supplier ${supplier?.username || ""}`
          }
          disabled={loading}
        />

        <Button variant="contained" color="primary" type="submit" fullWidth disabled={disableSubmit} sx={{ mt: 2 }}>
          {loading ? "Submitting..." : "Subtract Balance"}
        </Button>
      </Box>
    </Modal>
  );
};

export default MinusSupplierBalanceModal;