import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Container
} from "@mui/material";
import { FaTrashAlt, FaEye } from "react-icons/fa";
import { confirmAlert } from "react-confirm-alert";
import { toast, ToastContainer } from "react-toastify";
import "react-confirm-alert/src/react-confirm-alert.css";
import {
  getDamageProducts,
  deleteDamageProduct
} from "../../redux/features/damageProduct/damageProductSlice";
import { getProducts } from "../../redux/features/product/productSlice";
import { SpinnerImg } from "../../components/loader/Loader";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";

const DamageProductList = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ✅ CRITICAL FIX: Safe access to Redux state
  const damageProductState = useSelector((state) => state.damageProduct);
  
  // ✅ Ensure damageProducts is ALWAYS an array
  const damageProducts = Array.isArray(damageProductState?.damageProducts) 
    ? damageProductState.damageProducts 
    : [];
  
  const isLoading = damageProductState?.isLoading || false;
  
  // Get user role from localStorage
  const userRole = localStorage.getItem("userRole");

  const [selectedDamage, setSelectedDamage] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Debug logs
  console.log("Full Redux State:", damageProductState);
  console.log("Damage Products Array:", damageProducts);
  console.log("Is Array:", Array.isArray(damageProducts));

  useEffect(() => {
    const fetchDamageProducts = async () => {
      try {
        const result = await dispatch(getDamageProducts()).unwrap();
        console.log("Fetched damage products:", result);
      } catch (error) {
        console.error("Failed to fetch damage products:", error);
        toast.error("Failed to load damage products");
      }
    };
    
    fetchDamageProducts();
  }, [dispatch]);

  const handleDelete = (id) => {
    if (userRole !== "Admin") {
      toast.error("Only admins can delete damage records");
      return;
    }

    confirmAlert({
      customUI: ({ onClose }) => (
        <div
          style={{
            background: "#fff",
            padding: "2rem",
            borderRadius: "8px",
            width: "300px",
            margin: "100px auto",
            boxShadow: "0 0 10px rgba(0,0,0,0.3)",
            textAlign: "center"
          }}
        >
          <h2 style={{ marginBottom: "1rem" }}>Delete Damage Record</h2>
          <p>This will restore the inventory. Are you sure?</p>
          <div style={{ marginTop: "1.5rem" }}>
            <button
              style={{
                backgroundColor: "#e53935",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "10px"
              }}
              onClick={async () => {
                try {
                  await dispatch(deleteDamageProduct(id)).unwrap();
                  await dispatch(getDamageProducts());
                  await dispatch(getProducts());
                  toast.success("Damage record deleted successfully");
                  onClose();
                } catch (error) {
                  console.error("Delete failed:", error);
                  toast.error("Failed to delete damage record");
                }
              }}
            >
              Delete
            </button>
            <button
              style={{
                backgroundColor: "#ccc",
                color: "#000",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer"
              }}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      )
    });
  };

  const handleViewDetails = (damage) => {
    setSelectedDamage(damage);
    setDetailsOpen(true);
  };

  if (isLoading) {
    return <SpinnerImg />;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3, alignItems: "center" }}>
          <Typography variant="h4">Damage Products</Typography>
          <Button
            variant="contained"
            color="error"
            onClick={() => navigate("/add-damage-product")}
          >
            + Record Damage
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Product Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Warehouse</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Unit Cost</TableCell>
                <TableCell>Total Loss</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {damageProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No damage records found. Click "+ Record Damage" to add one.
                  </TableCell>
                </TableRow>
              ) : (
                damageProducts.map((damage, index) => (
                  <TableRow key={damage?._id || index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{damage?.productName || "N/A"}</TableCell>
                    <TableCell>{damage?.category || "N/A"}</TableCell>
                    <TableCell>{damage?.warehouseName || "N/A"}</TableCell>
                    <TableCell>{damage?.damagedQuantity || 0}</TableCell>
                    <TableCell>Rs {damage?.unitCost || 0}</TableCell>
                    <TableCell>
                      <strong style={{ color: "red" }}>
                        Rs {damage?.totalLoss?.toFixed(2) || "0.00"}
                      </strong>
                    </TableCell>
                    <TableCell>
                      <Chip label={damage?.damageReason || "Unknown"} size="small" />
                    </TableCell>
                    <TableCell>
                      {damage?.damageDate 
                        ? new Date(damage.damageDate).toLocaleDateString()
                        : "N/A"
                      }
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => handleViewDetails(damage)}
                      >
                        <FaEye />
                      </IconButton>
                      {userRole === "Admin" && (
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(damage._id)}
                        >
                          <FaTrashAlt />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Damage Record Details</DialogTitle>
          <DialogContent>
            {selectedDamage && (
              <Box sx={{ pt: 2 }}>
                {selectedDamage.image?.filePath && (
                  <img
                    src={selectedDamage.image.filePath}
                    alt={selectedDamage.productName}
                    style={{ 
                      width: "100%", 
                      maxHeight: "200px", 
                      objectFit: "cover", 
                      borderRadius: "8px", 
                      marginBottom: "16px" 
                    }}
                  />
                )}
                <Typography><strong>Product:</strong> {selectedDamage.productName}</Typography>
                <Typography><strong>Category:</strong> {selectedDamage.category}</Typography>
                <Typography><strong>Warehouse:</strong> {selectedDamage.warehouseName}</Typography>
                <Typography><strong>Quantity:</strong> {selectedDamage.damagedQuantity}</Typography>
                <Typography><strong>Unit Cost:</strong> Rs {selectedDamage.unitCost}</Typography>
                <Typography><strong>Total Loss:</strong> Rs {selectedDamage.totalLoss?.toFixed(2)}</Typography>
                <Typography><strong>Reason:</strong> {selectedDamage.damageReason}</Typography>
                <Typography><strong>Date:</strong> {new Date(selectedDamage.damageDate).toLocaleDateString()}</Typography>
                <Typography sx={{ mt: 2 }}><strong>Description:</strong></Typography>
                <Typography>{selectedDamage.description}</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
      <ToastContainer />
    </Container>
  );
};

export default DamageProductList;