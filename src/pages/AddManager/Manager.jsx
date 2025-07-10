import React, { useEffect, useState } from "react";
import ManagerList from "./ManagerList";
import { Box, Button, Grid, Modal, TextField, Typography, MenuItem, Select, FormControl, InputLabel, Checkbox, ListItemText } from "@mui/material";
import axios from 'axios';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const API_URL  = process.env.REACT_APP_BACKEND_URL;
  
  const BACKEND_URL = `${API_URL}api/`;


const Customer = () => {
  const [openModal, setOpenModal] = useState(false);
  const [username, setUsername] = useState("");
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [privileges, setPrivileges] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Updated privilege options
  const privilegeOptions = [
    { name: "Delete Customer", value: "deleteCustomer" },
    { name: "Delete Supplier", value: "deleteSupplier" },
    { name: "Delete Bank", value: "deleteBank" },
    { name: "Delete Product", value: "deleteProduct" },
    { name: "Delete Cheque", value: "deleteCheque" },
    { name: "Delete Warehouse", value: "deleteWarehouse" },
  ];

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  // Fetch list of managers
  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}manager/allmanager`)
      setCustomers(response.data);
    } catch (error) {
      console.error("Error fetching manager data:", error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleInputChange = (event) => {
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

  // Handle privileges change in dropdown
  const handlePrivilegeChange = (event) => {
    setPrivileges(event.target.value);
  };

  // Submit new manager with selected privileges
  const handleSubmit = async () => {
    const privilegesObject = privilegeOptions.reduce((acc, option) => {
      acc[option.value] = privileges.includes(option.value);
      return acc;
    }, {});

    try {
      const res = await axios.post(`${BACKEND_URL}manager/managerRegister`
         ,
        {
          username,
         
          phone,
          privileges: privilegesObject, // Send object instead of array
        },
        { withCredentials: true }
      );

      if (res) {
        toast.success("Manager added successfully!");
      }
      handleCloseModal();
      fetchCustomers();
    } catch (error) {
      console.error("Error creating manager:", error);
      toast.error("Failed to add manager");
    }
  };

  return (
    <Box sx={{ m: 0, p: 3, width: "100%" }}>
      <Grid container justifyContent={"flex-end"}>
        <Button 
          variant="outlined" 
          sx={{ borderColor: "dark", color: "dark" }}
          onClick={handleOpenModal}
        >
          Add Manager
        </Button>
      </Grid>
      <ManagerList customers={customers} />

      {/* Modal for Adding Manager */}
      <Modal
        open={openModal}
        onClose={handleCloseModal}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <Box sx={{ width: 400, p: 3, mx: "auto", mt: 5, bgcolor: "background.paper", boxShadow: 24, borderRadius: 1 }}>
          <Typography variant="h6" id="modal-title">Add Manager</Typography>
          
          {/* Form Fields */}
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            name="username"
            value={username}
            onChange={handleInputChange}
          />
          {/* <TextField
            fullWidth
            margin="normal"
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={handleInputChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Password"
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

          {/* Privileges Dropdown with Checkboxes */}
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Privileges</InputLabel>
            <Select
              multiple
              value={privileges}
              onChange={handlePrivilegeChange}
              renderValue={(selected) => selected.map((priv) => privilegeOptions.find(option => option.value === priv).name).join(', ')}
            >
              {privilegeOptions.map((privilege) => (
                <MenuItem key={privilege.value} value={privilege.value}>
                  <Checkbox checked={privileges.includes(privilege.value)} />
                  <ListItemText primary={privilege.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="contained" color="primary" onClick={handleSubmit} sx={{ mt: 2 }}>
            Submit
          </Button>
        </Box>
      </Modal>
      <ToastContainer />
    </Box>
  );
};

export default Customer;
