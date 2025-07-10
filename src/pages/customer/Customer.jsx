import React, { useEffect, useState } from "react";
import CustomerList from "./CustomerList";
import { Box, Button, Grid, Modal, TextField, Typography } from "@mui/material";
import axios from 'axios';
import { toast,ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AddCustomerModal from "../../components/Models/AddCustomer"; // Import the new component
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
// const BACKEND_URL ="https://zzcoinventorymanagmentbackend.up.railway.app";
const API_URL = `${BACKEND_URL}api/customers/`;

const Customer = () => {
  const [openModal, setOpenModal] = useState(false);
  const [username, setUsername] = useState("");  
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

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

  const [customers, setCustomers] = useState([]);
  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API_URL}allcustomer`, );
      setCustomers(response.data);
      console.log("response", response); 
    } catch (error) {
      console.error("There was an error fetching the customer data!", error);
    }
  };
  useEffect(() => {
    fetchCustomers();
  }, []);
  const refreshCustomers = () => {
    fetchCustomers();
  };
  const handleSubmit = async () => {
    try {
      const res = await axios.post(`${API_URL}/customerRegister/customerRegister`, {
        username,
         
        phone,
      }, { withCredentials: true });
  
      if (res) {
        toast.success("Customer Added Successfully!");
        refreshCustomers(); // Refresh the customer list after adding a new customer
      }
      handleCloseModal();
    } catch (error) {
      console.error("There was an error creating the customer!", error);
      toast.error("Failed to add customer!");
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
          Add Customer
        </Button>
      </Grid>
      <CustomerList customers={customers} refreshCustomers={refreshCustomers} />
      
      <AddCustomerModal // Use the new component
        open={openModal}
        handleClose={handleCloseModal}
        refreshCustomers={refreshCustomers}
      />
      <ToastContainer />
    </Box>
  );
};

export default Customer;
