// components/Models/MinusShipperBalanceModal.jsx
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
  Alert,
  CircularProgress,
  Typography,
  Paper,
  Box,
} from "@mui/material";
import { LocalShipping as ShipperIcon } from "@mui/icons-material";
import { minusShipperBalance, getShippers } from "../../redux/features/shipper/shipperSlice";
import { getBanks } from "../../redux/features/Bank/bankSlice";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "online", label: "Online (Bank Transfer)" },
  { value: "cheque", label: "Cheque" },
  { value: "owncheque", label: "Own Cheque (Immediate)" },
  { value: "credit", label: "Credit (Ledger Only)" },
];

const MinusShipperBalanceModal = ({ open, onClose, shipper }) => {
  const dispatch = useDispatch();

  const { isLoading } = useSelector((state) => state.shipper);
  const { banks } = useSelector((state) => state.bank);

  const [formData, setFormData] = useState({
    amount: "",
    paymentMethod: "cash",
    bankId: "",
    chequeDate: "",
    description: "",
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Load banks
  useEffect(() => {
    if (open) {
      dispatch(getBanks());
    }
  }, [open, dispatch]);

  // Reset form
  useEffect(() => {
    if (open) {
      setFormData({
        amount: "",
        paymentMethod: "cash",
        bankId: "",
        chequeDate: "",
        description: "",
      });
      setImage(null);
      setImagePreview(null);
    }
  }, [open]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!formData.amount || Number(formData.amount) <= 0) return;

    const data = new FormData();
    data.append("amount", formData.amount);
    data.append("paymentMethod", formData.paymentMethod);
    data.append("description", formData.description || `Payment received from ${shipper?.username}`);

    if (formData.paymentMethod === "online" || formData.paymentMethod === "owncheque") {
      data.append("bankId", formData.bankId);
    }

    if (formData.paymentMethod === "cheque" || formData.paymentMethod === "owncheque") {
      data.append("chequeDate", formData.chequeDate);
    }

    if (image) {
      data.append("image", image);
    }

    const result = await dispatch(minusShipperBalance({ id: shipper._id, formData: data }));
    if (minusShipperBalance.fulfilled.match(result)) {
      dispatch(getShippers());
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ShipperIcon color="success" />
        Receive from Shipper - {shipper?.username}
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
          <strong>Receive from Shipper:</strong> This will DECREASE shipper's balance and ADD to your cash/bank. (Rare - usually for refunds)
        </Alert>

        {/* Current Balance */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
          <Typography variant="body2" color="text.secondary">
            Current Balance
          </Typography>
          <Typography
            variant="h5"
            color={Number(shipper?.balance || 0) > 0 ? "error.main" : "success.main"}
          >
            Rs {Math.abs(Number(shipper?.balance || 0)).toLocaleString()}
            <Typography component="span" variant="body2" sx={{ ml: 1 }}>
              {Number(shipper?.balance || 0) > 0 ? "(You Owe)" : "(Overpaid)"}
            </Typography>
          </Typography>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount *"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleInputChange}
              inputProps={{ min: 1 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                label="Payment Method"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <MenuItem key={pm.value} value={pm.value}>
                    {pm.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {(formData.paymentMethod === "online" || formData.paymentMethod === "owncheque") && (
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Select Bank</InputLabel>
                <Select
                  name="bankId"
                  value={formData.bankId}
                  onChange={handleInputChange}
                  label="Select Bank"
                >
                  {(banks || []).map((bank) => (
                    <MenuItem key={bank._id} value={bank._id}>
                      {bank.bankName} (Rs {Number(bank.balance || 0).toLocaleString()})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {(formData.paymentMethod === "cheque" || formData.paymentMethod === "owncheque") && (
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

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              multiline
              rows={2}
              placeholder="e.g., Refund for overcharge"
            />
          </Grid>

          {/* Image Upload */}
          <Grid item xs={12}>
            <input
              accept="image/*"
              style={{ display: "none" }}
              id="shipper-minus-image"
              type="file"
              onChange={handleImageChange}
            />
            <label htmlFor="shipper-minus-image">
              <Button variant="outlined" component="span" fullWidth>
                Upload Receipt Image
              </Button>
            </label>
            {imagePreview && (
              <Box sx={{ mt: 1 }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ maxWidth: "100%", maxHeight: 150 }}
                />
              </Box>
            )}
          </Grid>

          {/* Balance Preview */}
          {formData.amount && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: "success.light" }}>
                <Typography variant="body2" color="success.contrastText">
                  After receiving:
                </Typography>
                <Typography variant="h6" color="success.contrastText">
                  Balance: Rs {(Number(shipper?.balance || 0) - Number(formData.amount)).toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={
            isLoading ||
            !formData.amount ||
            ((formData.paymentMethod === "online" || formData.paymentMethod === "owncheque") && !formData.bankId) ||
            ((formData.paymentMethod === "cheque" || formData.paymentMethod === "owncheque") && !formData.chequeDate)
          }
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? "Processing..." : "Receive Payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MinusShipperBalanceModal;