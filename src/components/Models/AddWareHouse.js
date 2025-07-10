import React, { useState, useEffect } from 'react';
import { Modal, Typography, Box, Button, TextField } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import {
    createWarehouse,
    getWarehouses,
    updateWarehouse,
    deleteWarehouse,
    selectWarehouses,
    selectIsLoading
  } from '../../redux/features/WareHouse/warehouseSlice';
const AddWarehouseModal = ({ open, onClose,}) => {
    const dispatch = useDispatch();
    const [newWarehouse, setNewWarehouse] = useState({ name: '', location: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewWarehouse(prev => ({ ...prev, [name]: value }));
  };
  const handleSubmit = () => {
   
      dispatch(createWarehouse(newWarehouse));
      onClose();
    //   onClose();
  };
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="warehouse-modal-title"
      aria-describedby="warehouse-modal-description"
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
      }}>
        <Typography id="warehouse-modal-title" variant="h6" component="h2">
          Add New Warehouse
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          name="name"
          label="Warehouse Name"
          type="text"
          fullWidth
          variant="standard"
          value={newWarehouse.name}
          onChange={handleInputChange}
        />
        <TextField
          margin="dense"
          name="location"
          label="Location"
          type="text"
          fullWidth
          variant="standard"
          value={newWarehouse.location}
          onChange={handleInputChange}
        />
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} sx={{ mr: 1 }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Add
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default AddWarehouseModal;