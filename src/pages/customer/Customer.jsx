import React, { useEffect, useState } from "react";
import CustomerList from "./CustomerList";
import { Box, Button, Grid } from "@mui/material";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AddCustomerModal from "../../components/Models/AddCustomer";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL?.replace(/\/$/, '');
const API_URL = `${BACKEND_URL}/api/customers`;

const Customer = () => {
  const [openModal, setOpenModal] = useState(false);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [customers, setCustomers] = useState([]);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === "username") setUsername(value);
    if (name === "phone") setPhone(value);
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API_URL}/allcustomer`, {
        withCredentials: true,
      });
      setCustomers(response.data);
      console.log("Fetched customers:", response.data);
    } catch (error) {
      console.error("Error fetching customer data:", error);
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
      const res = await axios.post(
        `${API_URL}/customerRegister`,
        {
          username,
          phone,
        },
        { withCredentials: true }
      );

      if (res) {
        toast.success("Customer Added Successfully!");
        refreshCustomers();
        setUsername("");
        setPhone("");
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      toast.error("Failed to add customer!");
    }
  };

  return (
    <Box sx={{ m: 0, p: 3, width: "100%" }}>
      <Grid container justifyContent="flex-end">
        <Button
          variant="outlined"
          sx={{ borderColor: "dark", color: "dark" }}
          onClick={handleOpenModal}
        >
          Add Customer
        </Button>
      </Grid>

      <CustomerList customers={customers} refreshCustomers={refreshCustomers} />

      <AddCustomerModal
        open={openModal}
        handleClose={handleCloseModal}
        refreshCustomers={refreshCustomers}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        username={username}
        phone={phone}
      />

      <ToastContainer />
    </Box>
  );
};

export default Customer;
