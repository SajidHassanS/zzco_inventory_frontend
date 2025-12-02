// pages/Shipper/AddShipper.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert
} from "@mui/material";
import {
  LocalShipping as ShipperIcon,
  ArrowBack as BackIcon,
  Phone as PhoneIcon
} from "@mui/icons-material";
import {
  createShipper,
  reset
} from "../../redux/features/shipper/shipperSlice";

const AddShipper = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isLoading, isSuccess, isError, message } = useSelector(
    state => state.shipper
  );

  // Track if form was submitted
  const [submitted, setSubmitted] = useState(false);

  // Form state - name, phone, and initial amount
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    initialBalance: "",
    description: ""
  });

  // Reset state on mount
  useEffect(
    () => {
      dispatch(reset());
    },
    [dispatch]
  );

  // Redirect on success ONLY after form submission
  useEffect(
    () => {
      if (isSuccess && submitted) {
        dispatch(reset());
        navigate("/shippers");
      }
    },
    [isSuccess, submitted, dispatch, navigate]
  );

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = e => {
    e.preventDefault();

    if (!formData.username.trim()) {
      return;
    }

    const shipperData = {
      username: formData.username,
      phone: formData.phone,
      initialBalance: formData.initialBalance
        ? parseFloat(formData.initialBalance)
        : 0,
      description:
        formData.description || `Initial credit for ${formData.username}`
    };

    setSubmitted(true);
    dispatch(createShipper(shipperData));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => navigate("/shippers")}
        >
          Back
        </Button>
        <Typography
          variant="h4"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <ShipperIcon fontSize="large" />
          Add New Shipper
        </Typography>
      </Box>

      {/* Error Alert */}
      {isError &&
        <Alert severity="error" sx={{ mb: 2 }}>
          {message}
        </Alert>}

      <form onSubmit={handleSubmit}>
        <Card sx={{ maxWidth: 500 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Shipper Name *"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter shipper name"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Phone number"
                  InputProps={{
                    startAdornment: (
                      <PhoneIcon sx={{ mr: 1, color: "text.secondary" }} />
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Initial Amount (Credit)"
                  name="initialBalance"
                  type="number"
                  value={formData.initialBalance}
                  onChange={handleInputChange}
                  placeholder="Amount you owe this shipper"
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>Rs</Typography>
                  }}
                  helperText="This is recorded as credit (no cash/bank deduction)"
                />
              </Grid>

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

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  disabled={isLoading || !formData.username.trim()}
                  startIcon={
                    isLoading ? <CircularProgress size={20} /> : <ShipperIcon />
                  }
                >
                  {isLoading ? "Creating Shipper..." : "Create Shipper"}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </form>
    </Box>
  );
};

export default AddShipper;
