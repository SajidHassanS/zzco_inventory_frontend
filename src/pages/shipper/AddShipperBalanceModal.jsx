// components/Models/AddShipperBalanceModal.jsx
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
  Divider,
  Box,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  LocalShipping as ShipperIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { addShipperBalance, getShippers } from "../../redux/features/shipper/shipperSlice";
import { getBanks } from "../../redux/features/Bank/bankSlice";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "online", label: "Online (Bank Transfer)" },
  { value: "cheque", label: "Cheque" },
  { value: "owncheque", label: "Own Cheque (Immediate)" },
  { value: "credit", label: "Credit (Ledger Only)" },
];

const AddShipperBalanceModal = ({ open, onClose, shipper }) => {
  const dispatch = useDispatch();

  const { isLoading } = useSelector((state) => state.shipper);
  const { banks } = useSelector((state) => state.bank);

  // Form state
  const [formData, setFormData] = useState({
    amount: "",
    paymentMethod: "cash",
    bankId: "",
    chequeDate: "",
    description: "",
    // Shipment details
    fromLocation: "",
    toLocation: "",
    vehicleNumber: "",
    driverName: "",
    driverPhone: "",
    biltyNumber: "",
    weight: "",
    shipmentDate: new Date().toISOString().split("T")[0],
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [bankBalanceWarning, setBankBalanceWarning] = useState("");

  // Load banks
  useEffect(() => {
    if (open) {
      dispatch(getBanks());
    }
  }, [open, dispatch]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        amount: "",
        paymentMethod: "cash",
        bankId: "",
        chequeDate: "",
        description: "",
        fromLocation: "",
        toLocation: "",
        vehicleNumber: "",
        driverName: "",
        driverPhone: "",
        biltyNumber: "",
        weight: "",
        shipmentDate: new Date().toISOString().split("T")[0],
      });
      setImage(null);
      setImagePreview(null);
      setBankBalanceWarning("");
    }
  }, [open]);

  // Check bank balance
  useEffect(() => {
    if ((formData.paymentMethod === "online" || formData.paymentMethod === "owncheque") && formData.bankId && formData.amount) {
      const bank = banks.find((b) => b._id === formData.bankId);
      const amt = Number(formData.amount);
      if (bank && amt > Number(bank.balance || 0)) {
        setBankBalanceWarning(
          `⚠️ Insufficient balance! "${bank.bankName}" has only Rs ${Number(bank.balance || 0).toLocaleString()}`
        );
      } else {
        setBankBalanceWarning("");
      }
    } else {
      setBankBalanceWarning("");
    }
  }, [formData.amount, formData.bankId, formData.paymentMethod, banks]);

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
    data.append("description", formData.description || `Shipping fare to ${shipper?.username}`);

    if (formData.paymentMethod === "online" || formData.paymentMethod === "owncheque") {
      data.append("bankId", formData.bankId);
    }

    if (formData.paymentMethod === "cheque" || formData.paymentMethod === "owncheque") {
      data.append("chequeDate", formData.chequeDate);
    }

    // Shipment details
    if (formData.fromLocation) data.append("fromLocation", formData.fromLocation);
    if (formData.toLocation) data.append("toLocation", formData.toLocation);
    if (formData.vehicleNumber) data.append("vehicleNumber", formData.vehicleNumber);
    if (formData.driverName) data.append("driverName", formData.driverName);
    if (formData.driverPhone) data.append("driverPhone", formData.driverPhone);
    if (formData.biltyNumber) data.append("biltyNumber", formData.biltyNumber);
    if (formData.weight) data.append("weight", formData.weight);
    if (formData.shipmentDate) data.append("shipmentDate", formData.shipmentDate);

    if (image) {
      data.append("image", image);
    }

    const result = await dispatch(addShipperBalance({ id: shipper._id, formData: data }));
    if (addShipperBalance.fulfilled.match(result)) {
      dispatch(getShippers());
      onClose();
    }
  };

  const selectedBank = banks.find((b) => b._id === formData.bankId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ShipperIcon color="error" />
        Pay Shipper - {shipper?.username}
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
          <strong>Pay Shipper:</strong> This will INCREASE shipper's balance (you owe them more) and DEDUCT from your cash/bank.
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
              {Number(shipper?.balance || 0) > 0 ? "(You Owe)" : Number(shipper?.balance || 0) < 0 ? "(Overpaid)" : "(Settled)"}
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
            <Grid item xs={12} sm={6}>
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
              {bankBalanceWarning && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {bankBalanceWarning}
                </Alert>
              )}
            </Grid>
          )}

          {(formData.paymentMethod === "cheque" || formData.paymentMethod === "owncheque") && (
            <Grid item xs={12} sm={6}>
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
              placeholder="e.g., Shipping from Lahore to Karachi"
            />
          </Grid>

          {/* Shipment Details Accordion */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Shipment Details (Optional)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="From Location"
                      name="fromLocation"
                      value={formData.fromLocation}
                      onChange={handleInputChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="To Location"
                      name="toLocation"
                      value={formData.toLocation}
                      onChange={handleInputChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Vehicle Number"
                      name="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={handleInputChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Bilty Number"
                      name="biltyNumber"
                      value={formData.biltyNumber}
                      onChange={handleInputChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Driver Name"
                      name="driverName"
                      value={formData.driverName}
                      onChange={handleInputChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Driver Phone"
                      name="driverPhone"
                      value={formData.driverPhone}
                      onChange={handleInputChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Weight (kg)"
                      name="weight"
                      type="number"
                      value={formData.weight}
                      onChange={handleInputChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Shipment Date"
                      name="shipmentDate"
                      type="date"
                      value={formData.shipmentDate}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Image Upload */}
          <Grid item xs={12}>
            <input
              accept="image/*"
              style={{ display: "none" }}
              id="shipper-balance-image"
              type="file"
              onChange={handleImageChange}
            />
            <label htmlFor="shipper-balance-image">
              <Button variant="outlined" component="span" fullWidth>
                Upload Receipt/Proof Image
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
              <Paper sx={{ p: 2, bgcolor: "error.light" }}>
                <Typography variant="body2" color="error.contrastText">
                  After this payment:
                </Typography>
                <Typography variant="h6" color="error.contrastText">
                  Balance: Rs {(Number(shipper?.balance || 0) + Number(formData.amount)).toLocaleString()}
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
          color="error"
          onClick={handleSubmit}
          disabled={
            isLoading ||
            !formData.amount ||
            ((formData.paymentMethod === "online" || formData.paymentMethod === "owncheque") && !formData.bankId) ||
            ((formData.paymentMethod === "cheque" || formData.paymentMethod === "owncheque") && !formData.chequeDate)
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