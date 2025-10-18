import React, { useState, useEffect } from "react";
import { Modal, Box, TextField, Button, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import {
  createSupplier,
  reset
} from "../../redux/features/supplier/supplierSlice";
import { toast } from "react-toastify";

const AddSupplierModal = ({ open, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const { isLoading, isError, isSuccess, message } = useSelector(
    state => state.supplier
  );

  const [username, setUsername] = useState("");
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = () => {
    const supplierData = {
      username,
      // email,
      // password,
      phone
    };

    dispatch(createSupplier(supplierData)); // Dispatch the createSupplier action
  };

  // Side effects handled in useEffect
  useEffect(
    () => {
      if (isSuccess) {
        toast.success("Supplier added successfully");
        onSuccess(); // Trigger the onSuccess callback passed from parent
        onClose(); // Close modal
        dispatch(reset()); // Reset the supplier state after success
      }

      if (isError) {
        toast.error(message); // Display error message
      }
    },
    [isSuccess, isError, message, onClose, onSuccess, dispatch]
  );

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
          borderRadius: 2
        }}
      >
        <Typography variant="h6" gutterBottom>
          Add New Supplier
        </Typography>
        <TextField
          label="Username"
          fullWidth
          margin="normal"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        {/* <TextField
          label="Email"
          fullWidth
          margin="normal"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          fullWidth
          margin="normal"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        /> */}
        <TextField
          label="Phone"
          fullWidth
          margin="normal"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          fullWidth
          disabled={isLoading} // Disable the button when loading
        >
          {isLoading ? "Adding Supplier..." : "Add Supplier"}
        </Button>
      </Box>
    </Modal>
  );
};

export default AddSupplierModal;
