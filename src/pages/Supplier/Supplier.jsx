import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SupplierList from "./SupplierList";  // Assuming you have the SupplierList component here
import { Box, Button, Grid, Modal, TextField, Typography } from "@mui/material";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getSuppliers, createSupplier, reset } from "../../redux/features/supplier/supplierSlice";
import AddSupplierModal from '../../components/Models/addSupplierModel'; // Import the new modal component

const Supplier = () => {
  const dispatch = useDispatch();
  const { suppliers, isLoading, isError, message } = useSelector((state) => state.supplier);

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

  // Fetch suppliers when component is mounted
  useEffect(() => {
    dispatch(getSuppliers());

    return () => {
      dispatch(reset());
    };
  }, [dispatch]);

  // Handle form submission to add a new supplier
  const handleSubmit = () => {
    const supplierData = {
      username,
      // email,
      // password,
      phone,
    };
    dispatch(createSupplier(supplierData));
    handleCloseModal();
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Box sx={{ m: 0, p: 3, width: "100%" }}>
      <Grid container justifyContent={"flex-end"}>
        <Button 
          variant="outlined" 
          sx={{ borderColor: "dark", color: "dark" }}
          onClick={handleOpenModal}
        >
          Add Supplier
        </Button>
      </Grid>

      {/* Pass suppliers to SupplierList */}
      <SupplierList suppliers={suppliers} />

      {/* Add Supplier Modal */}
      <AddSupplierModal 
        open={openModal} 
        handleClose={handleCloseModal} 
        // handleSubmit={handleSubmit} 
        // username={username} 
        // email={email} 
        // password={password} 
        // phone={phone} 
        // handleInputChange={handleInputChange} 
      />
      {/* <Modal
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
          <Typography variant="h6" id="modal-title">Add Supplier</Typography>
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
          />
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
      </Modal> */}

      <ToastContainer />
    </Box>
  );
};

export default Supplier;
