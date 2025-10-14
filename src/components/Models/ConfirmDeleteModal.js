import React from "react";
import { Modal, Box, Button, Typography } from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";

const ConfirmDeleteModal = ({ open, onClose, entry, entryType, onSuccess }) => {
  const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:5000/";
  const API_BASE = `${BACKEND_URL}api`;

  const handleDelete = async () => {
    if (!entry?._id) return;

    try {
      // base path by type
      const base =
        entryType === "bank"
          ? `${API_BASE}/banks`
          : entryType === "cash"
          ? `${API_BASE}/cash`
          : `${API_BASE}/suppliers`;

      // for cash, request hard delete: ?mode=hard
      const url =
        entryType === "cash"
          ? `${base}/delete/${entry._id}?mode=hard`
          : `${base}/delete/${entry._id}`;

      await axios.delete(url, { withCredentials: true });

      toast.success(`${entryType} deleted successfully.`);
      onSuccess?.();
    } catch (error) {
      toast.error(
        `Error deleting ${entryType}: ${
          error.response?.data?.message || "Unknown error"
        }`
      );
      console.error(error);
    } finally {
      onClose();
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
          Are you sure you want to delete this {entryType} entry?
        </Typography>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          fullWidth
        >
          Delete {entryType}
        </Button>
      </Box>
    </Modal>
  );
};

export default ConfirmDeleteModal;
