import React from "react";
import { Modal, Box, Button, Typography } from "@mui/material";
import axios from 'axios';

const ConfirmDeleteSupplierModal = ({ open, onClose, supplier, onSuccess }) => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  const API_URL = `${BACKEND_URL}api/suppliers`;

  const handleDelete = async () => {
    if (!supplier || !supplier._id) return; // Ensure valid supplier is selected
    console.log(`Deleting supplier:`, supplier._id); // Log to confirm
    try {
      const response = await axios.delete(`${API_URL}/delete/${supplier._id}`, {
  withCredentials: true, // ✅ this enables cookie/session authentication
});

      console.log(response.data);
      onSuccess();
    } catch (error) {
      console.error('Error deleting supplier:', error.response?.data || error);
    }
    onClose();
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
          Are you sure you want to delete this supplier?
        </Typography>
        <Button variant="contained" color="error" onClick={handleDelete} fullWidth>
          Delete Supplier
        </Button>
      </Box>
    </Modal>
  );
};

export default ConfirmDeleteSupplierModal;
