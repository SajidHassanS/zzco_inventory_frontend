import React, { useState } from "react";
import { Box, Button, Modal, TextField, Typography } from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}api/customers/`;

const AddCustomerModal = ({
  open,
  handleClose,
  refreshCustomers,          // optional
  handleAddNewCustomer       // optional
}) => {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setUsername("");
    setPhone("");
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!username.trim() || !phone.trim()) {
      toast.error("Please enter a name and phone.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await axios.post(
        `${API_URL}customerRegister`,
        { username: username.trim(), phone: phone.trim() },
        { withCredentials: true }
      );

      // ✅ success toast only once
      toast.success("Customer Added Successfully!");

      // ✅ safely call optional callbacks (won’t throw if undefined)
      if (typeof handleAddNewCustomer === "function") {
        handleAddNewCustomer(res.data);
      }
      if (typeof refreshCustomers === "function") {
        await refreshCustomers();
      }

      resetForm();
      handleClose();
    } catch (error) {
      console.error("There was an error creating the customer!", error);
      toast.error(
        error?.response?.data?.message || "Failed to add customer!"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) {
          resetForm();
          handleClose();
        }
      }}
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
        <Typography variant="h6" id="modal-title">Add Customer</Typography>

        <TextField
          fullWidth
          margin="normal"
          label="Name"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={submitting}
        />

        <TextField
          fullWidth
          margin="normal"
          label="Phone"
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={submitting}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={submitting}
          fullWidth
          sx={{ mt: 2 }}
        >
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </Box>
    </Modal>
  );
};

export default AddCustomerModal;
