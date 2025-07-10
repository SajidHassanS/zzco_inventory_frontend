import React, { useState, useEffect } from "react";
import { Modal, Box, TextField, Button, Typography } from "@mui/material";
import axios from 'axios';

const EditSupplierModal = ({ open, onClose, supplier, onSuccess }) => {
  const [username, setUsername] = useState("");
  // const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  // const BACKEND_URL = "https://zzcoinventorymanagmentbackend.up.railway.app";
  const API_URL = `${BACKEND_URL}api/suppliers`;

  useEffect(() => {
    if (supplier) {
      setUsername(supplier.username || "");
      // setEmail(supplier.email || "");
      setPhone(supplier.phone || "");
    }
  }, [supplier]);

  const handleSubmit = async () => {
    const updatedSupplierData = {
      username,
      // email,
      phone,
    };

    try {
      const response = await axios.put(`${API_URL}/update/${supplier._id}`, updatedSupplierData);
      console.log(response.data);
      onSuccess();
    } catch (error) {
      console.error('Error updating supplier:', error.response?.data || error);
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
          Edit Supplier Details
        </Typography>
        <TextField
          label="Username"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {/* <TextField
          label="Email"
          fullWidth
          margin="normal"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        /> */}
        <TextField
          label="Phone"
          fullWidth
          margin="normal"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Button variant="contained" color="primary" onClick={handleSubmit} fullWidth>
          Save Changes
        </Button>
      </Box>
    </Modal>
  );
};

export default EditSupplierModal;
