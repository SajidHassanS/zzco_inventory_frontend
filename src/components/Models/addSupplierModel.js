import React, { useEffect, useState } from "react";
import { Box, Button, Modal, TextField, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { getSuppliers, createSupplier, reset } from "../../redux/features/supplier/supplierSlice";

const AddSupplierModal = ({ open, handleClose }) => {
    const dispatch = useDispatch();

    const [username, setUsername] = useState("");
    // const [email, setEmail] = useState(""); 
    // const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
      // Handle form submission to add a new supplier
  const handleSubmit = () => {
    const supplierData = {
      username,
      // email,
      // password,
      phone,
    };
    dispatch(createSupplier(supplierData));
    handleClose();
  };
  const handleInputChange = (event) => {
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
    return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <Box sx={{ 
        width: 400, 
        p: 3, 
        mx: "auto", 
        mt: 5, 
        bgcolor: "background.paper", 
        boxShadow: 24, 
        borderRadius: 1 
      }}>
        <Typography variant="h6" id="modal-title">Add Supplier</Typography>
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
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubmit}
        >
          Submit
        </Button>
      </Box>
    </Modal>
  );
};

export default AddSupplierModal;