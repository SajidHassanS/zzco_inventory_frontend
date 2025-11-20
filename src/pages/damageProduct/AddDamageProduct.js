import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  Box,
  Alert,
  Container
} from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import {
  getAvailableProducts,
  createDamageProduct,
  RESET_DAMAGE_STATE
} from "../../redux/features/damageProduct/damageProductSlice";
import { getProducts } from "../../redux/features/product/productSlice";
import { SpinnerImg } from "../../components/loader/Loader";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";

const damageReasons = [
  "Physical Damage",
  "Expired",
  "Manufacturing Defect",
  "Water Damage",
  "Fire Damage",
  "Theft/Loss",
  "Other"
];

const AddDamageProduct = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { availableProducts, isLoading } = useSelector(
    (state) => state.damageProduct
  );

  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [damagedQuantity, setDamagedQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [damageReason, setDamageReason] = useState("Other");
  const [damageDate, setDamageDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [availableWarehouses, setAvailableWarehouses] = useState([]);
  const [maxQuantity, setMaxQuantity] = useState(0);
  const [productDetails, setProductDetails] = useState(null);

  useEffect(() => {
    dispatch(getAvailableProducts());
  }, [dispatch]);

  const handleProductChange = (e) => {
    const productId = e.target.value;
    setSelectedProduct(productId);
    setSelectedWarehouse("");
    setDamagedQuantity("");

    const product = availableProducts.find((p) => p._id === productId);
    if (product) {
      setProductDetails(product);
      setAvailableWarehouses(product.warehouses || []);
    }
  };

  const handleWarehouseChange = (e) => {
    const warehouseId = e.target.value;
    setSelectedWarehouse(warehouseId);

    const warehouse = availableWarehouses.find(
      (w) => w.warehouseId === warehouseId
    );
    if (warehouse) {
      setMaxQuantity(warehouse.quantity);
      setDamagedQuantity("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProduct || !selectedWarehouse || !damagedQuantity || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    const qty = Number(damagedQuantity);
    if (qty <= 0 || qty > maxQuantity) {
      toast.error(`Quantity must be between 1 and ${maxQuantity}`);
      return;
    }

    const damageData = {
      productId: selectedProduct,
      warehouseId: selectedWarehouse,
      damagedQuantity: qty,
      description,
      damageReason,
      damageDate
    };

    try {
      await dispatch(createDamageProduct(damageData)).unwrap();
      await dispatch(getProducts()); // Refresh products
      dispatch(RESET_DAMAGE_STATE());
      navigate("/damage-products");
    } catch (error) {
      console.error("Failed to create damage record:", error);
    }
  };

  if (isLoading) {
    return <SpinnerImg />;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ mb: 3 }}>
          Record Damaged Product
        </Typography>

        <Card sx={{ maxWidth: 600, margin: "auto" }}>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {/* Product Selection */}
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Select Product</InputLabel>
                <Select
                  value={selectedProduct}
                  onChange={handleProductChange}
                  label="Select Product"
                >
                  <MenuItem value="">
                    <em>Select Product</em>
                  </MenuItem>
                  {availableProducts.map((product) => (
                    <MenuItem key={product._id} value={product._id}>
                      {product.name} - {product.category} (Total: {product.totalQuantity})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Show product image and details */}
              {productDetails && (
                <Box sx={{ my: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    {productDetails.image?.filePath && (
                      <Grid item xs={12} md={4}>
                        <img
                          src={productDetails.image.filePath}
                          alt={productDetails.name}
                          style={{
                            width: "100%",
                            maxHeight: "150px",
                            objectFit: "cover",
                            borderRadius: "8px"
                          }}
                        />
                      </Grid>
                    )}
                    <Grid item xs={12} md={8}>
                      <Typography variant="body2">
                        <strong>Category:</strong> {productDetails.category}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Unit Cost:</strong> Rs {productDetails.unitCost}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Description:</strong>{" "}
                        {productDetails.description || "N/A"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Warehouse Selection */}
              {selectedProduct && (
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Select Warehouse</InputLabel>
                  <Select
                    value={selectedWarehouse}
                    onChange={handleWarehouseChange}
                    label="Select Warehouse"
                  >
                    <MenuItem value="">
                      <em>Select Warehouse</em>
                    </MenuItem>
                    {availableWarehouses.map((wh) => (
                      <MenuItem key={wh.warehouseId} value={wh.warehouseId}>
                        {wh.warehouseName} ({wh.quantity} available)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Damaged Quantity */}
              {selectedWarehouse && (
                <>
                  <TextField
                    type="number"
                    label="Damaged Quantity"
                    value={damagedQuantity}
                    onChange={(e) => setDamagedQuantity(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    inputProps={{ min: 1, max: maxQuantity }}
                    helperText={`Maximum available: ${maxQuantity}`}
                  />

                  {damagedQuantity && productDetails && (
                    <Alert severity="warning" sx={{ my: 2 }}>
                      <strong>Total Loss:</strong> Rs{" "}
                      {(Number(damagedQuantity) * productDetails.unitCost).toFixed(2)}
                    </Alert>
                  )}
                </>
              )}

              {/* Damage Reason */}
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Damage Reason</InputLabel>
                <Select
                  value={damageReason}
                  onChange={(e) => setDamageReason(e.target.value)}
                  label="Damage Reason"
                >
                  {damageReasons.map((reason) => (
                    <MenuItem key={reason} value={reason}>
                      {reason}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Damage Date */}
              <TextField
                type="date"
                label="Damage Date"
                value={damageDate}
                onChange={(e) => setDamageDate(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required
              />

              {/* Description */}
              <TextField
                label="Description / Notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                margin="normal"
                required
                multiline
                rows={4}
                placeholder="Describe the damage in detail..."
              />

              <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="error"
                  fullWidth
                  disabled={!selectedProduct || !selectedWarehouse || !damagedQuantity}
                >
                  Record Damage
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate("/damage-products")}
                >
                  Cancel
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Box>
      <ToastContainer />
    </Container>
  );
};

export default AddDamageProduct;