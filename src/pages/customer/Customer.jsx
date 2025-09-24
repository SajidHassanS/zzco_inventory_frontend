import React, { useEffect, useState } from "react";
import CustomerList from "./CustomerList";
import { Box, Button, Grid } from "@mui/material";
import axios from "axios";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AddCustomerModal from "../../components/Models/AddCustomer";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}api/customers/`;

const Customer = () => {
  const [openModal, setOpenModal] = useState(false);
  const [customers, setCustomers] = useState([]);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const fetchCustomers = async () => {
    try {
      const { data } = await axios.get(`${API_URL}allcustomer`, {
        withCredentials: true
      });
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customer data:", error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Optional helper the modal can call after a successful add
  const handleAddNewCustomer = newCustomer => {
    if (!newCustomer) return;
    setCustomers(prev => [newCustomer, ...prev]);
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

      <CustomerList customers={customers} refreshCustomers={fetchCustomers} />

      <AddCustomerModal
        open={openModal}
        handleClose={handleCloseModal}
        refreshCustomers={fetchCustomers} // optional re-fetch
        handleAddNewCustomer={handleAddNewCustomer} // optional local prepend
      />

      <ToastContainer />
    </Box>
  );
};

export default Customer;
