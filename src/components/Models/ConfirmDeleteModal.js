import React from "react";
import { Modal, Box, Button, Typography } from "@mui/material";
import axios from 'axios';
import { toast } from "react-toastify";

const ConfirmDeleteModal = ({ open, onClose, entry, entryType, onSuccess }) => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://your-backend-url/";
  const API_URL = entryType === "bank"
    ? `${BACKEND_URL}api/banks`
    : entryType === "cash"
    ? `${BACKEND_URL}api/cash`
    : `${BACKEND_URL}api/suppliers`;

  const handleDelete = async () => {
    if (!entry || !entry._id) return;
    try {
      await axios.delete(`${API_URL}/delete/${entry._id}`);
      toast.success(`${entryType} deleted successfully.`);
      onSuccess && onSuccess();
    } catch (error) {
      toast.error(`Error deleting ${entryType}: ${error.response?.data?.message || "Unknown error"}`);
      console.error(error);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 400, bgcolor: "background.paper", boxShadow: 24, p: 4, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Are you sure you want to delete this {entryType} entry?
        </Typography>
        <Button variant="contained" color="error" onClick={handleDelete} fullWidth>
          Delete {entryType}
        </Button>
      </Box>
    </Modal>
  );
};

export default ConfirmDeleteModal;
