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

            {/* Supplier */}
            <FormControl fullWidth margin="normal">
              <InputLabel id="supplier-label">Select Supplier</InputLabel>
              <Select
                labelId="supplier-label"
                label="Select Supplier"
                value={String(selectedSupplier || "")}    
                onChange={handleSupplierChange}
              >
                <MenuItem value="">
                  <em>Select Supplier</em>
                </MenuItem>
                {suppliers.length > 0 ? (
                  suppliers.map((supplier) =>
                    supplier ? (
                      <MenuItem key={supplier._id} value={supplier._id}>
                        {supplier.username}
                      </MenuItem>
                    ) : null
                  )
                ) : (
                  <MenuItem value="">
                    <em>No suppliers available</em>
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            {/* Shipping Type */}
            <FormControl fullWidth margin="normal">
              <InputLabel id="shipping-type-label">Shipping Type</InputLabel>
              <Select
                labelId="shipping-type-label"
                label="Shipping Type"
                value={shippingType}
                onChange={handleShippingTypeChange}
              >
                <MenuItem value="local">Local</MenuItem>
                <MenuItem value="international">International</MenuItem>
              </Select>
            </FormControl>

            {/* Warehouse (only for local) */}
            {shippingType === "local" && (
              <FormControl fullWidth margin="normal" required>
                <InputLabel id="warehouse-label">Select Warehouse</InputLabel>
                <Select
                  labelId="warehouse-label"
                  label="Select Warehouse"
                  value={String(selectedWarehouse || "")}   
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

            {/* Payment Method */}
            <FormControl fullWidth margin="normal">
              <InputLabel id="payment-method-label">Payment Method</InputLabel>
              <Select
                labelId="payment-method-label"
                label="Payment Method"
                value={paymentMethod}
                onChange={handlePaymentMethodChange}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="credit">Credit</MenuItem>
              </Select>
            </FormControl>

            {/* Bank (only for online) */}
            {paymentMethod === "online" && (
              <FormControl fullWidth margin="normal">
                <InputLabel id="bankID-label">Select Bank</InputLabel>
                <Select
                  labelId="bankID-label"
                  label="Select Bank"
                  value={String(selectedBank || "")}   
                  onChange={handleBankChange}
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

            {/* Cheque Date */}
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

            {/* Image (for cheque/online) */}
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
                {imagePreview && (
                  <ImagePreview src={imagePreview} alt="Preview" />
                )}
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

            {/* Submit button — let the form submit handler run */}
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
