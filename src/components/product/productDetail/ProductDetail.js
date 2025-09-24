import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom"; // Add useNavigate here
import useRedirectLoggedOutUser from "../../../customHook/useRedirectLoggedOutUser";
import { selectIsLoggedIn } from "../../../redux/features/auth/authSlice";
import AddWareHouseModal from "../../../components/Models/AddWareHouse";

import { getProduct, updateReceivedQuantity } from "../../../redux/features/product/productSlice";
import DOMPurify from "dompurify";
import {
  Card, CardContent, CardMedia, Typography, Grid, Chip, Box,
  Divider, Container, Tabs, Tab, Button, TextField,
  MenuItem
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { SpinnerImg } from "../../loader/Loader";
import InfoIcon from '@mui/icons-material/Info';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DescriptionIcon from '@mui/icons-material/Description';
import { getWarehouses } from "../../../redux/features/WareHouse/warehouseSlice"; // Add this import
import Modal from "@mui/material/Modal";

const API_URL  = process.env.REACT_APP_BACKEND_URL;
  
  const BACKEND_URL = `${API_URL}`;


const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: 1200,
  margin: "auto",
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius * 2,
  overflow: "hidden",
}));

const ImageWrapper = styled(Box)(({ theme }) => ({
  position: "relative",
  height: 400,
  [theme.breakpoints.down("md")]: {
    height: 300,
  },
}));

const StyledCardMedia = styled(CardMedia)(({ theme }) => ({
  height: "100%",
  objectFit: "cover",
}));

const OverlayBox = styled(Box)(({ theme }) => ({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  color: theme.palette.common.white,
  padding: theme.spacing(2),
}));

const ProductDetail = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();
  const navigate = useNavigate(); // Add this line

  const { id } = useParams();
  const [tabValue, setTabValue] = useState(0);
  const [receivedQuantity, setReceivedQuantity] = useState(0); // For user input
  const [openImageModal, setOpenImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [openWareHouseModal, setOpenWareHouseModal] = useState(false);

const handleOpenModalwarehouse = () => setOpenWareHouseModal(true);
const handleCloseModalwarehouse = () => setOpenWareHouseModal(false);

  const isLoggedIn = useSelector(selectIsLoggedIn);
  const { product, isLoading, isError, message } = useSelector(
    (state) => state.product
  );
  console.log("product",product);
  const [selectedWarehouse, setSelectedWarehouse] = useState(""); // Add this state
  const { warehouses } = useSelector((state) => state.warehouse); // Add this selector

  const stockStatus = (quantity) => {
    if (quantity > 0) {
      return <Chip label="In Stock" color="success" size="small" />;
    }
    return <Chip label="Out Of Stock" color="error" size="small" />;
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setOpenImageModal(true);
  };
  

  // Handle received products input
  const handleReceivedQuantityChange = (e) => {
    const inputValue = e.target.value;

    if (inputValue === "" || isNaN(inputValue)) {
      setReceivedQuantity(0); // Set to 0 or handle the default empty state as necessary
      return;
    }

    const newReceivedQuantity = parseInt(inputValue, 10);

    // Only set new quantity if it does not exceed the remaining quantity in shipping
    if (newReceivedQuantity <= product.totalShipped) {
      setReceivedQuantity(newReceivedQuantity); // Update state if valid
    } else {
      alert("Received quantity cannot exceed remaining quantity in shipping.");
    }
  };

  // Calculate remaining quantity in shipping
  const remainingInShipping = product ? product.quantity - product.receivedQuantity : 0;

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(getProduct(id));
      dispatch(getWarehouses());
    }

    if (isError) {
      console.log(message);
    }
  }, [isLoggedIn, isError, message, dispatch, id]);
  const handleWarehouseChange = (event) => {
    setSelectedWarehouse(event.target.value);
  };
  const handleSubmitReceivedQuantity = () => {
    const newReceivedQuantity = receivedQuantity; // The value from the input
    if (!selectedWarehouse) {
      alert("Please select a warehouse.");
      return;
    }
    // Calculate total quantity received
    const totalReceived = product.receivedQuantity + newReceivedQuantity;

    if (newReceivedQuantity > product.totalShipped) {
      alert("Received quantity cannot exceed total shipped quantity.");
      return;
    }

    // Calculate remaining quantity in shipping after this update
    // const remainingAfterUpdate = product.totalShipped - totalReceived;
    // if (remainingAfterUpdate < 0) {
    //   alert("Received quantity would result in negative remaining quantity.");
    //   return;
    // }

    // Dispatch the action to update received quantity
    dispatch(updateReceivedQuantity({
      id: product._id,
      receivedQuantity: newReceivedQuantity,
      warehouse: selectedWarehouse
    })).unwrap();

    // Reset the form
    setReceivedQuantity(0);
    setSelectedWarehouse("");
    // Reset the form and navigate to dashboard
    setReceivedQuantity(0);
    setSelectedWarehouse("");
    navigate("/dashboard");
  };

  if (isLoading) {
    return <SpinnerImg />;
  }

  if (!product) {
    return <Typography>Product not found or loading...</Typography>;
  }
// AFTER — one source of truth
const inStock = product?.quantity ?? 0;

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <>
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom component="h1" align="center" sx={{ mb: 4 }}>
        Product Detail
      </Typography>
      {product && (
        <StyledCard>
          <Grid container>
            <Grid item xs={12} md={6}>
              <ImageWrapper>
            <StyledCardMedia
  component="img"
  image={product?.image?.filePath || 'path/to/fallback/image.jpg'}
  alt={product.name}
  sx={{ cursor: "pointer" }}
  onClick={() => handleImageClick(product?.image?.filePath)}
/>


                <OverlayBox>
                  <Typography variant="h5" gutterBottom>Product Name: {product.name}</Typography>
                </OverlayBox>
              </ImageWrapper>
            </Grid>
            <Grid item xs={12} md={6}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs value={tabValue} onChange={handleTabChange} aria-label="product details tabs">
                    <Tab icon={<InfoIcon />} label="Details" />
                    <Tab icon={<DescriptionIcon />} label="Description" />
                    <Tab icon={<LocalShippingIcon />} label="Shipping" />
                  </Tabs>
                </Box>

                {tabValue === 0 && (
                  <Box>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Price: {product.price}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                     {stockStatus(inStock)}
<Typography variant="body2" sx={{ ml: 1 }}>
  ({inStock} in stock)
</Typography>
                    </Box>
                    <Typography variant="body1" paragraph>
                      Category: {product.category}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      Store Name: {product.warehouseName}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      Total Value: {product.price * product.quantity}
                    </Typography>
                  </Box>
                )}

                {tabValue === 1 && (
                  <Typography variant="body2"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(product.description),
                    }}
                  />
                )}

                {tabValue === 2 && (
                  <Box>
                    <Typography variant="h6">Shipping</Typography>
                    <Typography variant="body1" paragraph>
                      Total quantity in shipping: {product.totalShipped} {/* Correct total quantity */}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      Products received: {product.receivedQuantity} {/* Correct received quantity */}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {/* Remaining in shipping: {remainingInShipping > 0 ? remainingInShipping : 0} Correct remaining quantity */}
                    </Typography>

                    {/* Input for user to enter received products */}
                    <TextField
                      label="Products Received"
                      type="number"
                      value={receivedQuantity}
                      onChange={handleReceivedQuantityChange}
                      InputProps={{ inputProps: { min: 0, max: product.quantity } }}
                      fullWidth
                      sx={{ mt: 2 }}
                    />
                {receivedQuantity > 0 && (
  <TextField
    select
    label="Select Warehouse"
    value={selectedWarehouse}
    onChange={handleWarehouseChange}
    fullWidth
    sx={{ mt: 2 }}
  >
    {warehouses.map((warehouse) => (
      <MenuItem key={warehouse._id} value={warehouse._id}>
        {warehouse.name}
      </MenuItem>
    ))}

    {/* Add this new option */}
    <MenuItem
      value="addNew"
      onClick={handleOpenModalwarehouse}
      style={{ backgroundColor: "silver" }}
    >
      ➕ Add New Warehouse
    </MenuItem>
  </TextField>
)}

                    <Button
                      variant="contained"
                      color="primary"
                      sx={{ mt: 2 }}
                      onClick={handleSubmitReceivedQuantity} // Submit received quantity
                    >
                      Update Received Quantity
                    </Button>
                  </Box>
                )}

                <Box sx={{ mt: 'auto' }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" display="block" gutterBottom>
                    Created: {new Date(product.createdAt).toLocaleString("en-US")}
                  </Typography>
                  <Typography variant="caption" display="block" gutterBottom>
                    Updated: {new Date(product.updatedAt).toLocaleString("en-US")}
                  </Typography>
                </Box>
              </CardContent>
            </Grid>
          </Grid>
        </StyledCard>

        
      )}
    </Container>
    <Modal open={openImageModal} onClose={() => setOpenImageModal(false)}>
  <Box
    sx={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      bgcolor: "rgba(0, 0, 0, 0.9)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {selectedImage && (
      <img 
        src={selectedImage} 
        alt="Product" 
        style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain" }} 
      />
    )}
    <Button 
      onClick={() => setOpenImageModal(false)} 
      sx={{
        position: "absolute",
        top: 20,
        right: 20,
        color: "white",
        fontSize: 18,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: "10px 20px",
        borderRadius: 5,
        cursor: "pointer",
      }}
    >
      Close
    </Button>
  </Box>
</Modal>
<AddWareHouseModal
  open={openWareHouseModal}
  onClose={handleCloseModalwarehouse}
  onSuccess={(newWarehouse) => {
    dispatch(getWarehouses()); // refresh warehouse list
    setSelectedWarehouse(newWarehouse._id); // auto-select new one
  }}
/>

    </>
    
  );
};

export default ProductDetail;
