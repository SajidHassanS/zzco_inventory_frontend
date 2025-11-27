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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Paper
} from "@mui/material";
import {
  LocalShipping as ShipperIcon,
  ArrowBack as BackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon
} from "@mui/icons-material";
import {
  createShipper,
  reset
} from "../../redux/features/shipper/shipperSlice";

const SHIPPER_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
  { value: "logistics", label: "Logistics Provider" }
];

const AddShipper = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isLoading, isSuccess, isError, message } = useSelector(
    state => state.shipper
  );

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    companyName: "",
    phone: "",
    alternatePhone: "",
    email: "",
    address: "",
    shipperType: "individual",
    notes: ""
  });

  // Service areas
  const [serviceAreas, setServiceAreas] = useState([]);
  const [newServiceArea, setNewServiceArea] = useState("");

  // Vehicles
  const [vehicles, setVehicles] = useState([]);
  const [newVehicle, setNewVehicle] = useState({
    vehicleNumber: "",
    vehicleType: "",
    capacity: ""
  });

  // Reset on success
  useEffect(
    () => {
      if (isSuccess) {
        dispatch(reset());
        navigate("/shippers");
      }
    },
    [isSuccess, dispatch, navigate]
  );

  // Cleanup
  useEffect(
    () => {
      return () => {
        dispatch(reset());
      };
    },
    [dispatch]
  );

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Service Areas handlers
  const handleAddServiceArea = () => {
    if (
      newServiceArea.trim() &&
      !serviceAreas.includes(newServiceArea.trim())
    ) {
      setServiceAreas(prev => [...prev, newServiceArea.trim()]);
      setNewServiceArea("");
    }
  };

  const handleRemoveServiceArea = area => {
    setServiceAreas(prev => prev.filter(a => a !== area));
  };

  // Vehicle handlers
  const handleVehicleInputChange = e => {
    const { name, value } = e.target;
    setNewVehicle(prev => ({ ...prev, [name]: value }));
  };

  const handleAddVehicle = () => {
    if (newVehicle.vehicleNumber.trim()) {
      setVehicles(prev => [...prev, { ...newVehicle }]);
      setNewVehicle({ vehicleNumber: "", vehicleType: "", capacity: "" });
    }
  };

  const handleRemoveVehicle = index => {
    setVehicles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = e => {
    e.preventDefault();

    if (!formData.username.trim()) {
      return;
    }

    const shipperData = {
      ...formData,
      serviceAreas,
      vehicles
    };

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
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <PersonIcon color="primary" />
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
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

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Contact Person"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Contact person name"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Company Name"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="Company/Business name"
                      InputProps={{
                        startAdornment: (
                          <BusinessIcon
                            sx={{ mr: 1, color: "text.secondary" }}
                          />
                        )
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Shipper Type</InputLabel>
                      <Select
                        name="shipperType"
                        value={formData.shipperType}
                        onChange={handleInputChange}
                        label="Shipper Type"
                      >
                        {SHIPPER_TYPES.map(type =>
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone *"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="Primary phone number"
                      InputProps={{
                        startAdornment: (
                          <PhoneIcon sx={{ mr: 1, color: "text.secondary" }} />
                        )
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Alternate Phone"
                      name="alternatePhone"
                      value={formData.alternatePhone}
                      onChange={handleInputChange}
                      placeholder="Secondary phone"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Email address"
                      InputProps={{
                        startAdornment: (
                          <EmailIcon sx={{ mr: 1, color: "text.secondary" }} />
                        )
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      multiline
                      rows={2}
                      placeholder="Full address"
                      InputProps={{
                        startAdornment: (
                          <LocationIcon
                            sx={{
                              mr: 1,
                              color: "text.secondary",
                              alignSelf: "flex-start",
                              mt: 1
                            }}
                          />
                        )
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      multiline
                      rows={2}
                      placeholder="Additional notes about this shipper..."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Service Areas & Vehicles */}
          <Grid item xs={12} md={4}>
            {/* Service Areas */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <LocationIcon color="primary" />
                  Service Areas
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder="Add service area"
                    value={newServiceArea}
                    onChange={e => setNewServiceArea(e.target.value)}
                    onKeyPress={e =>
                      e.key === "Enter" &&
                      (e.preventDefault(), handleAddServiceArea())}
                    fullWidth
                  />
                  <IconButton color="primary" onClick={handleAddServiceArea}>
                    <AddIcon />
                  </IconButton>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {serviceAreas.map((area, index) =>
                    <Chip
                      key={index}
                      label={area}
                      onDelete={() => handleRemoveServiceArea(area)}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  )}
                  {serviceAreas.length === 0 &&
                    <Typography variant="body2" color="text.secondary">
                      No service areas added
                    </Typography>}
                </Box>
              </CardContent>
            </Card>

            {/* Vehicles */}
            <Card>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <ShipperIcon color="primary" />
                  Vehicles
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={12}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Vehicle Number"
                      name="vehicleNumber"
                      value={newVehicle.vehicleNumber}
                      onChange={handleVehicleInputChange}
                      placeholder="e.g., ABC-1234"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Type"
                      name="vehicleType"
                      value={newVehicle.vehicleType}
                      onChange={handleVehicleInputChange}
                      placeholder="Truck, Van..."
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Capacity"
                      name="capacity"
                      value={newVehicle.capacity}
                      onChange={handleVehicleInputChange}
                      placeholder="e.g., 5 tons"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddVehicle}
                      fullWidth
                      size="small"
                    >
                      Add Vehicle
                    </Button>
                  </Grid>
                </Grid>

                {vehicles.map((vehicle, index) =>
                  <Paper
                    key={index}
                    sx={{
                      p: 1,
                      mb: 1,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {vehicle.vehicleNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {vehicle.vehicleType}{" "}
                        {vehicle.capacity && `• ${vehicle.capacity}`}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveVehicle(index)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                )}

                {vehicles.length === 0 &&
                  <Typography variant="body2" color="text.secondary">
                    No vehicles added
                  </Typography>}
              </CardContent>
            </Card>
          </Grid>

          {/* Submit Button */}
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
      </form>
    </Box>
  );
};

export default AddShipper;
