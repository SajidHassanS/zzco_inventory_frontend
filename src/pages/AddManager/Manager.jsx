import React, { useEffect, useState } from "react";
import ManagerList from "./ManagerList";
import {
  Box,
  Button,
  Grid,
  Modal,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
} from "@mui/material";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const BACKEND_URL = `${API_URL}api/`;

const Manager = () => {
  const [openModal, setOpenModal] = useState(false);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [privileges, setPrivileges] = useState([]);
  const [managers, setManagers] = useState([]);
  const [editingManager, setEditingManager] = useState(null);
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

  const privilegeOptions = [
    { name: "Delete Customer", value: "deleteCustomer" },
    { name: "Delete Supplier", value: "deleteSupplier" },
    { name: "Delete Bank", value: "deleteBank" },
    { name: "Delete Product", value: "deleteProduct" },
    { name: "Delete Cheque", value: "deleteCheque" },
    { name: "Delete Warehouse", value: "deleteWarehouse" },
  ];

  const handleOpenModal = () => setOpenModal(true);
 
 
const handleCloseModal = () => {
  setOpenModal(false);
  setUsername("");
  setPhone("");
  setEmail("");
  setPassword("");
  setPrivileges([]);
  setEditingManager(null);
};


  const fetchManagers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}manager/allmanager`, {
        withCredentials: true,
      });
      setManagers(response.data);
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

const handleInputChange = (event) => {
  const { name, value } = event.target;
  if (name === "username") setUsername(value);
  if (name === "phone") setPhone(value);
  if (name === "email") setEmail(value);
  if (name === "password") setPassword(value);
};


  const handlePrivilegeChange = (event) => {
    setPrivileges(event.target.value);
  };

const handleEditClick = (manager) => {
  setEditingManager(manager);
  setUsername(manager.username);
  setPhone(manager.phone);
  setEmail(manager.email || "");
  setPrivileges(
    Object.keys(manager.privileges).filter((key) => manager.privileges[key])
  );
  setOpenModal(true);
};


  const handleDeleteManager = async (id) => {
    if (window.confirm("Are you sure you want to delete this manager?")) {
      try {
        await axios.delete(`${BACKEND_URL}manager/${id}`, {
          withCredentials: true,
        });
        toast.success("Manager deleted successfully!");
        fetchManagers();
      } catch (error) {
        console.error("Delete error:", error);
        toast.error("Failed to delete manager");
      }
    }
  };

  const handleSubmit = async () => {
    const privilegesObject = privilegeOptions.reduce((acc, option) => {
      acc[option.value] = privileges.includes(option.value);
      return acc;
    }, {});

    try {
 if (editingManager) {
  // Update
  await axios.put(
    `${BACKEND_URL}manager/${editingManager._id}`,
    {
      username,
      email,
      phone,
      privileges: privilegesObject,
    },
    { withCredentials: true }
  );
  toast.success("Manager updated successfully!");
} else {
  // Register
  await axios.post(
    `${BACKEND_URL}manager/managerRegister`,
    {
      username,
      email,
      password,
      phone,
      privileges: privilegesObject,
    },
    { withCredentials: true }
  );
  toast.success("Manager added successfully!");
}


      handleCloseModal();
      fetchManagers();
    } catch (error) {
      console.error("Error submitting manager:", error);
      toast.error("Failed to submit manager");
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

      <ManagerList
        managers={managers}
        onEdit={handleEditClick}
        onDelete={handleDeleteManager}
      />

      {/* Modal for Add/Update Manager */}
      <Modal
        open={openModal}
        onClose={handleCloseModal}
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
            borderRadius: 1,
          }}
        >
          <Typography variant="h6" id="modal-title">
            {editingManager ? "Update Manager" : "Add Manager"}
          </Typography>

          <TextField
            fullWidth
            margin="normal"
            label="Username"
            name="username"
            value={username}
            onChange={handleInputChange}
          />
{/* Email should ALWAYS be shown */}
<TextField
  fullWidth
  margin="normal"
  label="Email"
  name="email"
  type="email"
  value={email}
  onChange={handleInputChange}
/>

{/* Password only shown when adding a new manager */}
{!editingManager && (
  <TextField
    fullWidth
    margin="normal"
    label="Password"
    name="password"
    type="password"
    value={password}
    onChange={handleInputChange}
  />
)}


          <TextField
            fullWidth
            margin="normal"
            label="Phone"
            name="phone"
            value={phone}
            onChange={handleInputChange}
          />

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Privileges</InputLabel>
            <Select
              multiple
              value={privileges}
              onChange={handlePrivilegeChange}
              renderValue={(selected) =>
                selected
                  .map(
                    (priv) =>
                      privilegeOptions.find((option) => option.value === priv)
                        ?.name
                  )
                  .join(", ")
              }
            >
              {privilegeOptions.map((privilege) => (
                <MenuItem key={privilege.value} value={privilege.value}>
                  <Checkbox checked={privileges.includes(privilege.value)} />
                  <ListItemText primary={privilege.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            sx={{ mt: 2 }}
          >
            {editingManager ? "Update" : "Submit"}
          </Button>
        </Box>
      </Modal>

      <ToastContainer />
    </Box>
  );
};

export default Manager;
