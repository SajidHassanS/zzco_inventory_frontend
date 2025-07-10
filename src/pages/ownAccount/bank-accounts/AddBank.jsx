import React, { useEffect, useState } from "react";
import BankList from "./BankList";
import { Box, Button, Grid, Modal, TextField, Typography } from "@mui/material";
import axios from 'axios';
import Select from 'react-select'; // Importing react-select for a searchable dropdown
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const Customer = () => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
// const BACKEND_URL = "https://zzcoinventorymanagmentbackend.up.railway.app";
const API_URL = `${BACKEND_URL}api/Cash/`;
  const [openModal, setOpenModal] = useState(false);
  const [openCashModal, setOpenCashModal] = useState(false);
  const [bankName, setBankName] = useState(""); // State for bank name
  const [amount, setAmount] = useState(""); // State for amount
  

  const handleOpenCashModal = () => setOpenCashModal(true);
  const handleCloseCashModal = () => setOpenCashModal(false);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const handleInputChange = (selectedOption) => {
    setBankName(selectedOption ? selectedOption.value : "");
  };

  const handleAmountChange = (event) => {
    setAmount(event.target.value);
  };

  const [banks, setBanks] = useState([]);
  const [cash, setCash] = useState([]);
  const [cashData, setCashData] = useState({
    totalBalance: 0,
    latestEntry: null,
    allEntries: []
  });


  const fetchBanks = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}api/banks/all`);
      setBanks(response.data);
      console.log("Fetched banks:", response.data);
    } catch (error) {
      console.error("There was an error fetching the bank data!", error);
    }
  };
  const fetchCash = async () => {
    try {
      const response = await axios.get(`${API_URL}/all`);
      // setCash(response);
      setCashData(response.data);
      console.log("Fetched cash:", response.data);
    } catch (error) {
      console.error("There was an error fetching the Cash data!", error);
    }
  };

  useEffect(() => {
    fetchBanks();
    fetchCash();
  }, []);

  const refreshBanks = () => {
    fetchBanks();
    fetchCash();
  };

  const handleSubmit = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}api/banks/add`, {
        bankName,
        amount,
      }, { withCredentials: true });

      if (res) {
        toast.success("Bank Added Successfully!");
      }
      handleCloseModal();
      refreshBanks(); // Refresh the bank list after adding a new bank
    } catch (error) {
      console.error("There was an error adding the bank!", error);
      toast.error("Failed to add bank. Please try again.");
    }
  };
// handle submit cash
  const handleCashSubmit = async () => {
    try {
      console.log(amount);
      const res = await axios.post(`${BACKEND_URL}api/cash/add`, {
        balance: amount,
        type:"add",
      }, { withCredentials: true });
      
      console.log(amount);
      if (res) {
        toast.success(res.data.message);
      }
      fetchCash();
      handleCloseCashModal();
    
    } catch (error) {
      console.error("There was an error adding Cash!", error);
      toast.error("Failed to add Cash. Please try again.");
    }
  };

  // Comprehensive list of banks in Pakistan
  const bankOptions = [
    { value: "Al Baraka Bank (Pakistan) Limited", label: "Al Baraka Bank (Pakistan) Limited" },
    { value: "Allied Bank Limited (ABL)", label: "Allied Bank Limited (ABL)" },
    { value: "Askari Bank", label: "Askari Bank" },
    { value: "Bank Alfalah Limited (BAFL)", label: "Bank Alfalah Limited (BAFL)" },
    { value: "Bank Al-Habib Limited (BAHL)", label: "Bank Al-Habib Limited (BAHL)" },
    { value: "BankIslami Pakistan Limited", label: "BankIslami Pakistan Limited" },
    { value: "Bank Makramah Limited (BML)", label: "Bank Makramah Limited (BML)" },
    { value: "Bank of Punjab (BOP)", label: "Bank of Punjab (BOP)" },
    { value: "Bank of Khyber", label: "Bank of Khyber" },
    { value: "Deutsche Bank A.G", label: "Deutsche Bank A.G" },
    { value: "Dubai Islamic Bank Pakistan Limited (DIB Pakistan)", label: "Dubai Islamic Bank Pakistan Limited (DIB Pakistan)" },
    { value: "Faysal Bank Limited (FBL)", label: "Faysal Bank Limited (FBL)" },
    { value: "First Women Bank Limited", label: "First Women Bank Limited" },
    { value: "Habib Bank Limited (HBL)", label: "Habib Bank Limited (HBL)" },
    { value: "Habib Metropolitan Bank Limited", label: "Habib Metropolitan Bank Limited" },
    { value: "Industrial and Commercial Bank of China", label: "Industrial and Commercial Bank of China" },
    { value: "Industrial Development Bank of Pakistan", label: "Industrial Development Bank of Pakistan" },
    { value: "JS Bank Limited", label: "JS Bank Limited" },
    { value: "MCB Bank Limited", label: "MCB Bank Limited" },
    { value: "MCB Islamic Bank Limited", label: "MCB Islamic Bank Limited" },
    { value: "Meezan Bank Limited", label: "Meezan Bank Limited" },
    { value: "National Bank of Pakistan (NBP)", label: "National Bank of Pakistan (NBP)" },
    { value: "Soneri Bank Limited", label: "Soneri Bank Limited" },
    { value: "Standard Chartered Bank (Pakistan) Limited (SC Pakistan)", label: "Standard Chartered Bank (Pakistan) Limited (SC Pakistan)" },
    { value: "Sindh Bank", label: "Sindh Bank" },
    { value: "The Bank of Tokyo-Mitsubishi UFJ (MUFG Bank Pakistan)", label: "The Bank of Tokyo-Mitsubishi UFJ (MUFG Bank Pakistan)" },
    { value: "United Bank Limited (UBL)", label: "United Bank Limited (UBL)" },
    { value: "Zarai Taraqiati Bank Limited", label: "Zarai Taraqiati Bank Limited" },
    { value: "Bank of Azad Jammu & Kashmir", label: "Bank of Azad Jammu & Kashmir" },
    { value: "Habib Bank AG Zurich", label: "Habib Bank AG Zurich" },
    { value: "Samba Bank (Pakistan) Limited", label: "Samba Bank (Pakistan) Limited" },
    { value: "Silkbank Limited", label: "Silkbank Limited" },
    { value: "UBL Islamic Banking", label: "UBL Islamic Banking" },
    { value: "HBL Islamic Banking", label: "HBL Islamic Banking" },
    { value: "Bank Al Habib Islamic Banking", label: "Bank Al Habib Islamic Banking" },
    { value: "Bank of Punjab Islamic Banking", label: "Bank of Punjab Islamic Banking" },
    { value: "Faysal Bank (Islamic)", label: "Faysal Bank (Islamic)" },
    { value: "HabibMetro (Sirat Islamic Banking)", label: "HabibMetro (Sirat Islamic Banking)" },
    { value: "Silk Bank (Emaan Islamic Banking)", label: "Silk Bank (Emaan Islamic Banking)" },
    { value: "Bank Of Khyber (Islamic Window)", label: "Bank Of Khyber (Islamic Window)" },
    // Add more banks if necessary
  ];

  return (
    <Box sx={{ m: 0, p: 3, width: "100%" }}>
      <Grid container justifyContent={"flex-end"} gap={2}>
        <Button 
          variant="outlined" 
          sx={{ borderColor: "dark", color: "dark" }}
          onClick={handleOpenModal}
        >
          Add Bank
        </Button>
        <Button 
          variant="outlined" 
          sx={{ borderColor: "dark", color: "dark" }}
          onClick={handleOpenCashModal}
        >
          Add Cash
        </Button>
      </Grid>
      <BankList banks={banks} refreshBanks={refreshBanks} cash={cashData} />
      
      <Modal
        open={openModal}
        onClose={handleCloseModal}
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
          <Typography variant="h6" id="modal-title">Add Bank</Typography>
          <Select
            options={bankOptions}
            onChange={handleInputChange}
            placeholder="Select a bank..."
            isSearchable
            name="bankName"
            styles={{ marginBottom: "16px" }}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Amount"
            name="amount"
            type="number"
            value={amount}
            onChange={handleAmountChange}
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
      
      <Modal
        open={openCashModal}
        onClose={handleCloseCashModal}
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
     
          <TextField
            fullWidth
            margin="normal"
            label="Amount"
            name="amount"
            type="number"
            value={amount}
            onChange={handleAmountChange}
          />
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleCashSubmit}
          >
            Submit
          </Button>
        </Box>
      </Modal>
    
      <ToastContainer />
    </Box>
  );
};

export default Customer;
