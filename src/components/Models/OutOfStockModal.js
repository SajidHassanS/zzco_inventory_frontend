import { Box, Typography } from "@mui/material";
import React from "react";
import Modal from "react-modal";

const OutOfStockModal = ({
  isOpen,
  onRequestClose,
  selectedProductDetails
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onRequestClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <Box
        sx={{
          // width: 400,
          p: 3,
          mx: "auto",
          mt: 5,
          bgcolor: "background.paper",
          boxShadow: 24,
          borderRadius: 1
        }}
      >
        <button
          onClick={onRequestClose}
          style={{ position: "absolute", top: "10px", right: "10px" }}
        >
          Close
        </button>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexDirection: "column"
          }}
        >
          <Typography variant="h6" id="modal-title">
            Out of Stock Products
          </Typography>
          <table border="1" p="2px">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Payment Method</th>
                <th>Shipping Type</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {selectedProductDetails.map((product, index) =>
                <tr key={index}>
                  <td>
                    {product.name}
                  </td>
                  <td>
                    {product.category}
                  </td>
                  <td>
                    {product.price}
                  </td>
                  <td>
                    {product.paymentMethod}
                  </td>
                  <td>
                    {product.shippingType}
                  </td>
                  <td>
                    {product.status ? "Available" : "Out of Stock"}
                  </td>
                  <td>
                    {new Date(product.createdAt).toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Box>
    </Modal>
  );
};

export default OutOfStockModal;
