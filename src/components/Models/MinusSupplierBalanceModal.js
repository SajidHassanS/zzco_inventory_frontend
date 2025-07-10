import React, { useState, useEffect } from "react";
import { Modal, Box, TextField, Button, Typography, MenuItem, Grid } from "@mui/material";
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { toast } from "react-toastify";

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

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
  // const BACKEND_URL = "https://zzcoinventorymanagmentbackend.up.railway.app";

  const dispatch = useDispatch();
  const banks = useSelector((state) => state.bank.banks);

  useEffect(() => {
    dispatch(getBanks());
  }, [dispatch]);

  const API_URL = `${BACKEND_URL}api/suppliers`;

  const validateForm = () => {
    let formErrors = {};
    const numericAmount = parseFloat(amount.trim()); // Parse amount as a float number after trimming whitespace

    // Validate if amount is a valid number
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
  
    if (!validateForm()) {
      return;
    }
  
    const numericAmount = parseFloat(amount.trim());
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Amount is not a valid number.");
      return;
    }
  
    const formData = new FormData();
    formData.append("balance", numericAmount.toString());
    formData.append("paymentMethod", capitalizeFirstLetter(paymentMethod));
    formData.append("description", description);
    formData.append("bankId", selectedBank || "");
    formData.append("chequeDate", chequeDate || "");
  
    if (image) {
      formData.append("image", image);
    }
  
    try {
      const response = await axios.post(`${API_URL}/minus-supplier-balance/${supplier._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
  
      toast.success(response.data.message || "Balance subtracted successfully");
  
      // Call the onSuccess callback with the updated supplier object
      onSuccess(response.data.supplier);
  
      onClose();
    } catch (error) {
      console.error("Error occurred:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to subtract balance. Please try again.");
    }
  };
  
  

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
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
            InputLabelProps={{
              shrink: true,
            }}
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
              <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '200px' }} />
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
          onClick={handleSubmit}
          fullWidth
        >
          Subtract Balance
        </Button>
      </Box>
    </Modal>
  );
};

export default MinusSupplierBalanceModal;
