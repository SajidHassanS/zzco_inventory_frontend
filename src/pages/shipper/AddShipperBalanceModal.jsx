// src/pages/Shipper/AddShipperBalanceModal.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Box,
} from "@mui/material";
import { LocalShipping as ShipperIcon } from "@mui/icons-material";
import {
  addShipperBalance,
  getShippers,
} from "../../redux/features/shipper/shipperSlice";
import { getBanks } from "../../redux/features/Bank/bankSlice";

const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "Online", label: "Online (Bank Transfer)" },
  { value: "Cheque", label: "Cheque (Pending)" },
  { value: "Owncheque", label: "Own Cheque (Immediate)" },
  { value: "Credit", label: "Credit (Ledger Only - No Cash Deduction)" },
];

const AddShipperBalanceModal = ({ open, onClose, shipper }) => {
  const dispatch = useDispatch();

  const { banks } = useSelector((state) => state.bank || { banks: [] });
  const { isLoading } = useSelector((state) => state.shipper);

  // Form state
  const [formData, setFormData] = useState({
    amount: "",
    paymentMethod: "Cash",
    description: "",
    bankId: "",
    chequeDate: "",
  });
  const [error, setError] = useState("");

  // Load banks + reset form when modal opens
  useEffect(() => {
    if (open) {
      dispatch(getBanks());
      setFormData({
        amount: "",
        paymentMethod: "Cash",
        description: "",
        bankId: "",
        chequeDate: "",
      });
      setError("");
    }
  }, [open, dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const method = formData.paymentMethod.toLowerCase();
    const currentBalance = Number(shipper?.balance || 0);

    // Prevent paying more than owed (except "credit")
    if (method !== "credit" && amount > currentBalance) {
      setError(
        `Cannot pay more than what you owe (Rs ${currentBalance.toLocaleString()})`
      );
      return;
    }

    // Require bank for online, cheque, owncheque
    if (
      (method === "online" ||
        method === "cheque" ||
        method === "owncheque") &&
      !formData.bankId
    ) {
      setError("Please select a bank");
      return;
    }

    // Require cheque date for cheque/owncheque
    if (
      (method === "cheque" || method === "owncheque") &&
      !formData.chequeDate
    ) {
      setError("Please select a cheque date");
      return;
    }

    try {
      await dispatch(
        addShipperBalance({
          id: shipper._id,
          data: {
            amount: formData.amount,
            paymentMethod: formData.paymentMethod, // backend lowercases this
            description:
              formData.description || `Payment to ${shipper.username}`,
            bankId: formData.bankId || undefined,
            chequeDate: formData.chequeDate || undefined,
          },
        })
      ).unwrap();

      dispatch(getShippers());
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to process payment");
    }
  };

  const method = formData.paymentMethod.toLowerCase();
  const needsBank =
    method === "online" || method === "cheque" || method === "owncheque";
  const needsChequeDate = method === "cheque" || method === "owncheque";
  const currentBalance = Number(shipper?.balance || 0);

  const getSelectedBankInfo = () => {
    if (!formData.bankId) return null;
    return (banks || []).find((b) => b._id === formData.bankId) || null;
  };

  if (!shipper) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ShipperIcon color="primary" />
        Pay Shipper: {shipper.username}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            You Owe This Shipper
          </Typography>
          <Typography
            variant="h5"
            color={currentBalance > 0 ? "error.main" : "success.main"}
          >
            Rs {currentBalance.toLocaleString()}
          </Typography>
          {currentBalance <= 0 && (
            <Typography variant="caption" color="success.main">
              Balance is settled
            </Typography>
          )}
        </Box>

        <Grid container spacing={2}>
          {/* Amount */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Payment Amount *"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="Enter amount to pay"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>Rs</Typography>,
              }}
              helperText={
                method !== "credit"
                  ? `Max: Rs ${currentBalance.toLocaleString()}`
                  : "Credit has no limit"
              }
            />
          </Grid>

          {/* Payment Method */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Payment Method *</InputLabel>
              <Select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={(e) => {
                  handleInputChange(e);
                  // Reset bank and cheque date when changing method
                  setFormData((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value,
                    bankId: "",
                    chequeDate: "",
                  }));
                }}
                label="Payment Method *"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <MenuItem key={pm.value} value={pm.value}>
                    {pm.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Bank Selection (Online, Cheque, Own Cheque) */}
          {needsBank && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Bank *</InputLabel>
                <Select
                  name="bankId"
                  value={formData.bankId}
                  onChange={handleInputChange}
                  label="Select Bank *"
                >
                  {(banks || []).map((bank) => (
                    <MenuItem key={bank._id} value={bank._id}>
                      {bank.bankName} - Rs{" "}
                      {Number(
                        bank.totalBalance || bank.balance || 0
                      ).toLocaleString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Info for pending cheque */}
              {method === "cheque" && getSelectedBankInfo() && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Cheque will be linked to {getSelectedBankInfo().bankName}.
                  Bank balance will be deducted when the cheque is cleared.
                </Alert>
              )}

              {/* Warning for online/owncheque balance */}
              {(method === "online" || method === "owncheque") &&
                getSelectedBankInfo() &&
                formData.amount && (
                  <Alert
                    severity={
                      Number(formData.amount) >
                      Number(
                        getSelectedBankInfo().balance ||
                          getSelectedBankInfo().totalBalance ||
                          0
                      )
                        ? "error"
                        : "info"
                    }
                    sx={{ mt: 1 }}
                  >
                    {Number(formData.amount) >
                    Number(
                      getSelectedBankInfo().balance ||
                        getSelectedBankInfo().totalBalance ||
                        0
                    ) ? (
                      `⚠️ Insufficient balance! Bank has Rs ${Number(
                        getSelectedBankInfo().balance ||
                          getSelectedBankInfo().totalBalance ||
                          0
                      ).toLocaleString()}`
                    ) : (
                      <>
                        Available: Rs{" "}
                        {Number(
                          getSelectedBankInfo().balance ||
                            getSelectedBankInfo().totalBalance ||
                            0
                        ).toLocaleString()}
                        {" → After payment: Rs "}
                        {(
                          Number(
                            getSelectedBankInfo().balance ||
                              getSelectedBankInfo().totalBalance ||
                              0
                          ) - Number(formData.amount || 0)
                        ).toLocaleString()}
                      </>
                    )}
                  </Alert>
                )}
            </Grid>
          )}

          {/* Cheque Date (Cheque / Own Cheque) */}
          {needsChequeDate && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cheque Date *"
                name="chequeDate"
                type="date"
                value={formData.chequeDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Optional description"
              multiline
              rows={2}
            />
          </Grid>
        </Grid>

        {/* Method notes */}
        {method === "credit" && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Credit method only updates the ledger. No cash or bank will be
            deducted.
          </Alert>
        )}
        {method === "cash" && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This will deduct Rs {formData.amount || 0} from your cash balance.
          </Alert>
        )}
        {method === "online" && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This will deduct Rs {formData.amount || 0} from the selected bank.
          </Alert>
        )}
        {method === "owncheque" && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This will immediately deduct Rs {formData.amount || 0} from the
            selected bank.
          </Alert>
        )}
        {method === "cheque" && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Cheque will be recorded as pending. Bank will be deducted when the
            cheque is cleared.
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={
            isLoading ||
            !formData.amount ||
            (method !== "credit" && currentBalance <= 0) ||
            (needsBank && !formData.bankId) ||
            (needsChequeDate && !formData.chequeDate)
          }
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? "Processing..." : "Pay Shipper"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddShipperBalanceModal;
