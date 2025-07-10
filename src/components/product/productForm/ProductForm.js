import React from "react";
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
} from "@mui/material";
import { styled } from "@mui/system";

const ImagePreview = styled("img")({
  width: "100%",
  maxHeight: "300px",
  objectFit: "cover",
  marginTop: "16px",
});

const ProductForm = ({
  banks = [],
  selectedBank = "",
  handleBankChange,
  product = {},
  imagePreview,
  handleInputChange,
  handleImageChange,
  handlePaymentMethodChange,
  paymentMethod = "",
  chequeDate = "",
  setChequeDate,
  saveProduct,
  warehouses = [],
  selectedWarehouse = "",
  handleWarehouseChange,
  shippingType = "",
  handleShippingTypeChange,
  suppliers = [],
  selectedSupplier = "",
  handleSupplierChange,
}) => {

  const handleFormSubmit = (event) => {
    event.preventDefault();
    saveProduct();
  };

  return (
    <div>
      <Card>
        <CardContent>
          <form onSubmit={handleFormSubmit}>
            <TextField
              label="Product Name"
              name="name"
              value={product?.name || ""}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />

            <TextField
              label="Product Category"
              name="category"
              value={product?.category || ""}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Select Supplier</InputLabel>
              <Select
                value={selectedSupplier || ""}
                onChange={handleSupplierChange}
              >
                <MenuItem value="">
                  <em>Select Supplier</em>
                </MenuItem>
                {suppliers.length > 0 ? (
                  suppliers.map((supplier) => (
                    supplier ? (
                      <MenuItem key={supplier._id} value={supplier._id}>
                        {supplier.username}
                      </MenuItem>
                    ) : null
                  ))
                ) : (
                  <MenuItem value="">
                    <em>No suppliers available</em>
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Shipping Type</InputLabel>
              <Select value={shippingType} onChange={handleShippingTypeChange}>
                <MenuItem value="local">Local</MenuItem>
                <MenuItem value="international">International</MenuItem>
              </Select>
            </FormControl>

            {shippingType === "local" && (
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Select Warehouse</InputLabel>
                <Select
                  value={selectedWarehouse || ""}
                  onChange={handleWarehouseChange}
                >
                  <MenuItem value="">
                    <em>Select Warehouse</em>
                  </MenuItem>
                  {warehouses.map((warehouse) => (
                    <MenuItem key={warehouse._id} value={warehouse._id}>
                      {warehouse?.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth margin="normal">
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentMethod}
                onChange={handlePaymentMethodChange}
                label="Payment Method"
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="credit">Credit</MenuItem>
              </Select>
            </FormControl>

            {paymentMethod === "online" && (
              <FormControl fullWidth margin="normal">
                <InputLabel id="bankID-label">Select Bank</InputLabel>
                <Select
                  labelId="bankID-label"
                  id="bankID"
                  value={selectedBank}
                  onChange={handleBankChange}
                  label="Bank Name"
                >
                  <MenuItem value="">
                    <em>Select Bank</em>
                  </MenuItem>
                  {banks.map((bank) => (
                    <MenuItem key={bank._id} value={bank._id}>
                      {bank?.bankName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {paymentMethod === "cheque" && (
              <TextField
                fullWidth
                label="Cheque Date"
                type="date"
                value={chequeDate}
                onChange={(e) => setChequeDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                margin="normal"
              />
            )}

            {(paymentMethod === "cheque" || paymentMethod === "online") && (
              <Grid item xs={12}>
                <TextField
                  type="file"
                  label="Upload Image"
                  name="image"
                  onChange={handleImageChange}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
                {imagePreview && <ImagePreview src={imagePreview} alt="Preview" />}
              </Grid>
            )}

            <TextField
              type="number"
              label="Product Price"
              name="price"
              value={product?.price || ""}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />

            <TextField
              type="number"
              label="Product Quantity"
              name="quantity"
              value={product?.quantity || ""}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
            >
              Save Product
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductForm;
