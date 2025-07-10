import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  createWarehouse,
  getWarehouses,
  updateWarehouse,
  deleteWarehouse,
  selectWarehouses,
  selectIsLoading
} from '../../redux/features/WareHouse/warehouseSlice';
import {
  Button,
  Modal,
  Typography,
  CircularProgress,
  Box,
  IconButton,
  TextField
} from '@mui/material';
import CustomTable from '../../components/CustomTable/CustomTable';
import axios from 'axios';
import { toast } from 'react-toastify';
import { selectCanDelete } from '../../redux/features/auth/authSlice';

const WarehouseManager = () => {
  const dispatch = useDispatch();
  const warehouses = useSelector(selectWarehouses);
  const isLoading = useSelector(selectIsLoading);
  const canDeleteWarehouse = useSelector(selectCanDelete);

  // Check if the user has an admin role
  const isAdmin = localStorage.getItem("userRole") === "Admin";

  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [open, setOpen] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({ name: '', location: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [warehouseProducts, setWarehouseProducts] = useState([]);
  const [warehouseList, setWarehouseList] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  // const BACKEND_URL = "https://zzcoinventorymanagmentbackend.up.railway.app";
  const API_URL = `${BACKEND_URL}api/warehouses`;
console.log("warehouseProducts",warehouseProducts);
  useEffect(() => {
    dispatch(getWarehouses());
  }, [dispatch]);

  useEffect(() => {
    setWarehouseList(warehouses);
  }, [warehouses]);
console.log("warehouses",warehouses);
  const handleClickOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setNewWarehouse({ name: '', location: '' });
    setEditingWarehouse(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewWarehouse(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setNewWarehouse({ name: warehouse.name, location: warehouse.location });
    setOpen(true);
  };

  const handleDelete = (id) => {
    console.log("id",id);
    if (!isAdmin && !canDeleteWarehouse) {
    
      toast.error("You do not have permission to delete this warehouse.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      dispatch(deleteWarehouse(id));
      setWarehouseList(prevList => prevList.filter(warehouse => warehouse._id !== id));
    }
  };

  const handleSubmit = () => {
    if (editingWarehouse) {
      dispatch(updateWarehouse({ id: editingWarehouse._id, formData: newWarehouse }));
    } else {
      dispatch(createWarehouse(newWarehouse));
    }
    handleClose();
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewProducts = async (warehouseId) => {
    setLoadingProducts(true);
    try {
      console.log("warehouseId",warehouseId);
      const response = await axios.get(`${API_URL}/allproducts/${warehouseId}`, { withCredentials: true });
      console.log("res",response);
      if (response.data.message === "No products found for this warehouse") {
        toast.info("No products found for this warehouse");
        setWarehouseProducts([]);
      } else {
        setWarehouseProducts(response.data);
        setProductsModalOpen(true);
      }
    } catch (error) {
      toast.error("Failed to fetch warehouse products");
    }
    setLoadingProducts(false);
  };

  const columns = [
    { field: 'name', headerName: 'Name' },
    { field: 'location', headerName: 'Location' ,
      renderCell: (params) => params?.location ? params.location : "N/A"
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      renderCell: (params) => params?.createdAt ? new Date(params.createdAt).toLocaleString() : "N/A"
    },
    {
      field: 'updatedAt',
      headerName: 'Updated At',
      renderCell: (params) => params?.updatedAt ? new Date(params.updatedAt).toLocaleString() : "N/A"
    },
    {
      field: 'actions',
      headerName: 'Actions',
      renderCell: (params) => (
        <>
          <IconButton onClick={() => handleViewProducts(params._id)}>
            {productsModalOpen ? null : <VisibilityIcon />}
          </IconButton>
          <IconButton onClick={() => handleEdit(params)}>
          {productsModalOpen ? null : <EditIcon/>}
         
          </IconButton>
          {(isAdmin || canDeleteWarehouse) && (
            <IconButton onClick={() => handleDelete(params._id)}>
          {productsModalOpen ? null : <DeleteIcon/>}
          
            </IconButton>
          )}
        </>
      ),
    },
  ];
  const column = [
    { field: 'name', headerName: 'Name' },
    { field: 'quantity', headerName: 'Quantity' ,
      renderCell: (params) => params?.quantity ? params.quantity : "N/A"
    },
    { field: 'price', headerName: 'Price' ,
      renderCell: (params) => params?.price ? params.price : "N/A"
    },
    { field: 'category', headerName: 'Category' ,
      renderCell: (params) => params?.category ? params.category : "N/A"
    },
    { field: 'shippingType', headerName: 'Shipping Type' ,
      renderCell: (params) => params?.shippingType ? params.shippingType : "N/A"
    },
    { field: 'receivedQuantity', headerName: 'Received Quantity' ,
      renderCell: (params) => params?.receivedQuantity ? params.receivedQuantity : "N/A"
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      renderCell: (params) => params?.createdAt ? new Date(params.createdAt).toLocaleString() : "N/A"
    },
    // {
    //   field: 'updatedAt',
    //   headerName: 'Updated At',
    //   renderCell: (params) => params?.updatedAt ? new Date(params.updatedAt).toLocaleString() : "N/A"
    // },
    
  ];
  
  

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', marginBottom: '20px' }}>
        <Button variant="contained" color="primary" onClick={handleClickOpen}>
          Add Warehouse
        </Button>
      </Box>

      <Modal
        open={open}
        onClose={handleClose}
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
            {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
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
            <Button onClick={handleClose} sx={{ mr: 1 }}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingWarehouse ? 'Update' : 'Add'}
            </Button>
          </Box>
        </Box>
      </Modal>

      <CustomTable
        columns={columns}
        data={warehouseList}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <Modal
        open={productsModalOpen}
        onClose={() => setProductsModalOpen(false)}
        aria-labelledby="warehouse-products-modal"
        aria-describedby="modal-modal-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
        }}>
          <Typography id="warehouse-products-modal" variant="h6" component="h2">
            Warehouse Products
          </Typography>
          <Box sx={{ mt: 2 }}>
            {warehouseProducts ? (
              <CustomTable
                columns={column}
                data={warehouseProducts}
                page={0}
                rowsPerPage={5}
              />
            ) : (
              <CircularProgress />
            )}
          </Box>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setProductsModalOpen(false)}>Close</Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default WarehouseManager;
