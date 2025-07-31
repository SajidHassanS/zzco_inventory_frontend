import React, { useState } from "react";
import { Box, Button, Modal, TextField, Typography } from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}api/customers/`;

const AddCustomerModal = ({
  open,
  handleClose,
  refreshCustomers,
  handleAddNewCustomer
}) => {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");

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

  const handleSubmit = async () => {
    try {
      const res = await axios.post(
        `${API_URL}customerRegister`,
        {
          username,
          phone
        },
        { withCredentials: true }
      );

      if (res) {
        toast.success("Customer Added Successfully!");
        // Pass the new customer data to refresh customers in the parent component
        handleAddNewCustomer(res.data); // Update the customers in the parent component
      }
      handleClose();
    } catch (error) {
      console.error("There was an error creating the customer!", error);
      toast.error("Failed to add customer!");
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
          Add Customer
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

export default AddCustomerModal;
