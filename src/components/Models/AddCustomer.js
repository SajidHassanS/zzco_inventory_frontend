import React, { useState } from "react";
import { Box, Button, Modal, TextField, Typography } from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const API_URL = `${BACKEND_URL}api/customers/`;

const AddCustomerModal = ({ open, handleClose, refreshCustomers }) => {
  const [username, setUsername] = useState("");
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const handleInputChange = event => {
    const { name, value } = event.target;
    switch (name) {
      case "username":
        setUsername(value);
        break;
      // case "email":
      //   setEmail(value);
      //   break;
      // case "password":
      //   setPassword(value);
      //   break;
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
          // email,
          // password,
          phone
        },
        { withCredentials: true }
      );

      if (res) {
        toast.success("Customer Added Successfully!");
        refreshCustomers(); // Refresh the customer list after adding a new customer
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
        {/* <TextField
          fullWidth
          margin="normal"
          label="Email (optional)"
          name="email"
          type="email"
          value={email}
          onChange={handleInputChange}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Password (optional)"
          name="password"
          type="password"
          value={password}
          onChange={handleInputChange}
        /> */}
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
