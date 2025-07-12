// src/components/Customer.jsx

import React, { useEffect, useState } from "react";
import BankList from "./BankList";
import { Box, Button, Grid, Modal, TextField, Typography } from "@mui/material";
import Select from "react-select";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Read backend URL and build API base (including your API Gateway stage)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}inventory/api`;

// Create an axios instance that always sends your JWT and cookies
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});
const token = localStorage.getItem("jwt");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

const Customer = () => {
  // Modal open/close state
  const [openModal, setOpenModal] = useState(false);
  const [openCashModal, setOpenCashModal] = useState(false);

  // Form fields
  const [bankName, setBankName] = useState("");
  const [amount, setAmount] = useState("");

  // Data lists
  const [banks, setBanks] = useState([]);
  const [cashData, setCashData] = useState({
    totalBalance: 0,
    latestEntry: null,
    allEntries: [],
  });

  // Handlers to open/close modals
  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);
  const handleOpenCashModal = () => setOpenCashModal(true);
  const handleCloseCashModal = () => setOpenCashModal(false);

  // Form change handlers
  const handleInputChange = (option) => setBankName(option?.value || "");
  const handleAmountChange = (e) => setAmount(e.target.value);

  // Fetch all banks
  const fetchBanks = async () => {
    try {
      const res = await api.get("/banks/all");
      setBanks(res.data);
    } catch (err) {
      console.error("Error fetching banks:", err);
      toast.error("Failed to load banks");
    }
  };

  // Fetch cash summary
  const fetchCash = async () => {
    try {
      const res = await api.get("/cash/all");
      setCashData(res.data);
    } catch (err) {
      console.error("Error fetching cash:", err);
      toast.error("Failed to load cash data");
    }
  };

  // Initial load
  useEffect(() => {
    fetchBanks();
    fetchCash();
  }, []);

  // Refresh both datasets
  const refreshAll = () => {
    fetchBanks();
    fetchCash();
  };

  // Submit new bank
  const handleSubmit = async () => {
    try {
      await api.post("/banks/add", { bankName, amount });
      toast.success("Bank added successfully!");
      handleCloseModal();
      refreshAll();
    } catch (err) {
      console.error("Error adding bank:", err);
      toast.error("Failed to add bank");
    }
  };

  // Submit new cash entry
  const handleCashSubmit = async () => {
    try {
      const res = await api.post("/cash/add", {
        balance: amount,
        type: "add",
      });
      toast.success(res.data.message || "Cash added successfully!");
      handleCloseCashModal();
      fetchCash();
    } catch (err) {
      console.error("Error adding cash:", err);
      toast.error("Failed to add cash");
    }
  };

  // Dropdown options for banks
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
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Grid container justifyContent="flex-end" spacing={2}>
        <Grid item>
          <Button variant="outlined" onClick={handleOpenModal}>
            Add Bank
          </Button>
        </Grid>
        <Grid item>
          <Button variant="outlined" onClick={handleOpenCashModal}>
            Add Cash
          </Button>
        </Grid>
      </Grid>

      <BankList banks={banks} refreshBanks={refreshAll} cash={cashData} />

      {/* Add Bank Modal */}
      <Modal open={openModal} onClose={handleCloseModal}>
        <Box
          sx={{
            width: 400,
            p: 3,
            m: "auto",
            mt: 8,
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 1,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Add Bank
          </Typography>
          <Select
            options={bankOptions}
            onChange={handleInputChange}
            placeholder="Select a bank…"
            isSearchable
          />
          <TextField
            fullWidth
            margin="normal"
            label="Amount"
            type="number"
            value={amount}
            onChange={handleAmountChange}
          />
          <Button variant="contained" onClick={handleSubmit}>
            Submit
          </Button>
        </Box>
      </Modal>

      {/* Add Cash Modal */}
      <Modal open={openCashModal} onClose={handleCloseCashModal}>
        <Box
          sx={{
            width: 400,
            p: 3,
            m: "auto",
            mt: 8,
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 1,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Add Cash
          </Typography>
          <TextField
            fullWidth
            margin="normal"
            label="Amount"
            type="number"
            value={amount}
            onChange={handleAmountChange}
          />
          <Button variant="contained" onClick={handleCashSubmit}>
            Submit
          </Button>
        </Box>
      </Modal>

      <ToastContainer position="bottom-right" />
    </Box>
  );
};

export default Customer;
