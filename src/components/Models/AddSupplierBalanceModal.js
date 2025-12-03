import React, { useState, useEffect } from "react";
import { Modal, Box, TextField, Button, Typography, MenuItem, Grid, Alert } from "@mui/material";
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
  const [bankBalanceWarning, setBankBalanceWarning] = useState("");

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const dispatch = useDispatch();
  const banks = useSelector((state) => state.bank.banks || []);

  useEffect(() => {
    if (open) {
      dispatch(getBanks());
      setErrors({});
      setLoading(false);
      setBankBalanceWarning("");
    } else {
      setAmount("");
      setPaymentMethod("");
      setChequeDate("");
      setDescription("");
      setSelectedBank("");
      setImage(null);
      setImagePreview("");
      setErrors({});
      setBankBalanceWarning("");
    }
  }, [dispatch, open]);

  // Check bank balance when amount or selected bank changes (for online and owncheque)
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

  const SUPPLIER_API_URL = `${BACKEND_URL}api/suppliers`;
  const CASH_API_URL = `${BACKEND_URL}api/cash`;

  const getSelectedBankInfo = () => {
    if (!selectedBank) return null;
    return banks.find((b) => b._id === selectedBank);
  };

  const validateForm = () => {
    const formErrors = {};
    const n = Number(amount);

    if (!amount || !Number.isFinite(n) || n <= 0) {
      formErrors.amount = "Amount must be a positive number";
    }
    if (!paymentMethod) {
      formErrors.paymentMethod = "Payment method is required";
    }

    // Online: require bank and image, check balance
    if (paymentMethod === "online") {
      if (!selectedBank) {
        formErrors.selectedBank = "Bank selection is required for online payment";
      }
      if (!image) {
        formErrors.image = "Image upload is required for online payment";
      }
      if (selectedBank) {
        const bank = banks.find((b) => b._id === selectedBank);
        if (bank && n > Number(bank.balance || 0)) {
          formErrors.selectedBank = `Insufficient balance in ${bank.bankName} (Available: Rs ${bank.balance})`;
        }
      }
    }

    // ✅ Regular cheque: require chequeDate, image, and BANK (for supplier)
    if (paymentMethod === "cheque") {
      if (!chequeDate) {
        formErrors.chequeDate = "Cheque date is required for cheque";
      }
      if (!image) {
        formErrors.image = "Image upload is required for cheque";
      }
      if (!selectedBank) {
        formErrors.selectedBank = "Bank selection is required for cheque";
      }
    }

    // Own Cheque: require bank, chequeDate, image AND validate balance
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
      if (selectedBank) {
        const bank = banks.find((b) => b._id === selectedBank);
        if (bank) {
          const bankBalance = Number(bank.balance || 0);
          if (n > bankBalance) {
            formErrors.selectedBank = `Insufficient balance! ${bank.bankName} has Rs ${bankBalance.toLocaleString()}, you need Rs ${n.toLocaleString()}`;
          }
        }
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

      const validAmount = Number(amount);
      if (!Number.isFinite(validAmount)) {
        setErrors((prev) => ({ ...prev, amount: "Invalid amount" }));
        return;
      }

      const method = (paymentMethod || "").toLowerCase();

      const formData = new FormData();
      formData.append("amount", validAmount);
      formData.append("paymentMethod", method);
      formData.append("description", description?.trim() || "");
      formData.append("desc", description?.trim() || "");
      formData.append("name", supplier?.username || "");

      // ✅ Send bankId for online, cheque, and owncheque
      if (method === "online" || method === "cheque" || method === "owncheque") {
        formData.append("bankId", selectedBank);
      }

      // Send chequeDate for cheque and owncheque
      if (method === "cheque" || method === "owncheque") {
        formData.append("chequeDate", chequeDate);
        if (method === "cheque") {
          formData.append("status", "pending");
        }
      }

      if (image) {
        formData.append("image", image);
      }

      const supplierRes = await axios.post(
        `${SUPPLIER_API_URL}/${supplier._id}/transaction`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
      );

      if (supplierRes.status !== 200 && supplierRes.status !== 201) {
        throw new Error("Failed to add transaction to supplier");
      }

      toast.success(supplierRes.data.message || "Transaction added successfully");

      let ledgerRes;

      if (method === "cash") {
        ledgerRes = await axios.post(
          `${CASH_API_URL}/add`,
          {
            balance: validAmount,
            type: "deduct",
            description: description?.trim() || `Cash payment to supplier ${supplier.username}`,
          },
          { withCredentials: true }
        );
      } else if (method === "online") {
        ledgerRes = await axios.post(
          `${BACKEND_URL}api/banks/${selectedBank}/transaction`,
          {
            amount: validAmount,
            type: "subtract",
            description: description?.trim() || `Online payment to supplier ${supplier.username}`,
          },
          { withCredentials: true }
        );
      } else if (method === "owncheque") {
        toast.success("Cheque payment recorded; bank balance deducted immediately.");
      } else if (method === "cheque") {
        toast.info("Cheque added as pending. It will deduct once cleared.");
      } else if (method === "credit") {
        toast.info("Credit recorded (no immediate cash/bank movement).");
      }

      dispatch(getBanks());

      if (
        method === "cheque" ||
        method === "credit" ||
        method === "owncheque" ||
        ledgerRes?.status === 200 ||
        ledgerRes?.status === 201
      ) {
        if (method === "cash" || method === "online") {
          toast.success("Payment recorded in ledger");
        }

        const updatedSupplier = {
          ...supplier,
          balance: supplierRes?.data?.supplier?.balance ?? supplier.balance,
        };
        onSuccess?.(updatedSupplier);
        onClose?.();

        setAmount("");
        setPaymentMethod("");
        setChequeDate("");
        setDescription("");
        setSelectedBank("");
        setImage(null);
        setImagePreview("");
        setErrors({});
        setBankBalanceWarning("");
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

  // ✅ Updated: cheque also requires selectedBank now
  const disableSubmit =
    loading ||
    !amount ||
    parseFloat(amount) <= 0 ||
    !paymentMethod ||
    !!bankBalanceWarning ||
    (paymentMethod === "online" && (!selectedBank || !image)) ||
    (paymentMethod === "cheque" && (!selectedBank || !chequeDate || !image)) ||
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
          inputProps={{ min: 0, step: "0.01" }}
        />

        <TextField
          label="Payment Method"
          select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setSelectedBank("");
            setBankBalanceWarning("");
            if (e.target.value !== "cheque" && e.target.value !== "owncheque") {
              setChequeDate("");
            }
            if (e.target.value === "credit" || e.target.value === "cash") {
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
              ? "Pending cheque - bank will be deducted when cleared"
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

        {/* ✅ Show bank dropdown for ONLINE, CHEQUE, and OWN CHEQUE */}
        {(paymentMethod === "online" || paymentMethod === "cheque" || paymentMethod === "owncheque") && (
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

            {/* Show bank balance warning only for online and owncheque */}
            {(paymentMethod === "online" || paymentMethod === "owncheque") && bankBalanceWarning && (
              <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                {bankBalanceWarning}
              </Alert>
            )}

            {/* Show selected bank balance info for online and owncheque */}
            {(paymentMethod === "online" || paymentMethod === "owncheque") && getSelectedBankInfo() && !bankBalanceWarning && (
              <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
                Available Balance: Rs {Number(getSelectedBankInfo().balance || 0).toLocaleString()}
                {amount && (
                  <> → After payment: Rs {(Number(getSelectedBankInfo().balance || 0) - Number(amount || 0)).toLocaleString()}</>
                )}
              </Alert>
            )}

            {/* Info for pending cheque */}
            {paymentMethod === "cheque" && getSelectedBankInfo() && (
              <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
                Cheque will be linked to {getSelectedBankInfo().bankName}. Balance will be deducted when cheque is cleared.
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

        {/* Show image upload for CHEQUE, ONLINE, and OWN CHEQUE */}
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
          placeholder={
            paymentMethod === "credit"
              ? "e.g. Credit note / adjust supplier ledger"
              : paymentMethod === "owncheque"
              ? `e.g. Cheque payment to supplier ${supplier?.username || ""}`
              : `e.g. Payment to supplier ${supplier?.username || ""}`
          }
        />

        <Button
          variant="contained"
          color="primary"
          type="submit"
          fullWidth
          disabled={disableSubmit}
          sx={{ mt: 2 }}
        >
          {loading ? "Submitting..." : "Add Balance"}
        </Button>
      </Box>
    </Modal>
  );
};

export default AddSupplierBalanceModal;