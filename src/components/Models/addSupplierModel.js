import React, { useState } from "react";
import { Box, Button, Modal, TextField, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import { createSupplier } from "../../redux/features/supplier/supplierSlice";

const AddSupplierModal = ({ open, handleClose, onSuccess }) => {
  const dispatch = useDispatch();

  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async () => {
    const supplierData = {
      username,
      phone
    };

    // Dispatch the createSupplier thunk and await the result
    const res = await dispatch(createSupplier(supplierData));

    if (res.payload && !res.error) {
      if (onSuccess) {
        onSuccess(res.payload); // Send new supplier back to parent
      }
      handleClose(); // Close modal
      setUsername(""); // Reset form
      setPhone("");
    }
  };

  const handleInputChange = event => {
    const { name, value } = event.target;
    switch (name) {
      case "username":
        setUsername(value);
        break;
      case "phone":
        setPhone(value);
        break;
      default:
        break;
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <Box
        sx={{
          width: 400,
          p: 3,
          mx: "auto",
          mt: 5,
          bgcolor: "background.paper",
          boxShadow: 24,
          borderRadius: 1
        }}
      >
        <Typography variant="h6" id="modal-title">
          Add Supplier
        </Typography>
        <TextField
          fullWidth
          margin="normal"
          label="Name"
          name="username"
          value={username}
          onChange={handleInputChange}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Phone"
          name="phone"
          value={phone}
          onChange={handleInputChange}
        />
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          Submit
        </Button>
      </Box>
    </Modal>
  );
};

export default AddSupplierModal;
