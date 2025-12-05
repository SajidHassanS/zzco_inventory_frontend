import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  TextField,
  Grid,
  CircularProgress,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  LocalShipping as ShipperIcon,
  AddCircle as AddBalanceIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Phone as PhoneIcon,
  Discount as DiscountIcon,
  RemoveCircleOutline as MinusIcon,
} from "@mui/icons-material";
import { getShippers, deleteShipper, reset } from "../../redux/features/shipper/shipperSlice";
import AddShipperBalanceModal from "./AddShipperBalanceModal";
import ShipperDiscountModal from "./ShipperDiscountModal";
import ShipperTransactionHistory from "./ShipperTransactionHistory";
import MinusShipperBalanceModal from "./MinusShipperBalanceModal";

const ShipperList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { shippers, isLoading, isError, message } = useSelector((state) => state.shipper);

  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [addBalanceShipper, setAddBalanceShipper] = useState(null);
  const [discountShipper, setDiscountShipper] = useState(null);
  const [viewHistoryShipper, setViewHistoryShipper] = useState(null);
  const [minusBalanceShipper, setMinusBalanceShipper] = useState(null);

  useEffect(() => {
    dispatch(getShippers());
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);

  const filteredShippers = (shippers || []).filter((s) => {
    if (!s) return false;
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return s.username?.toLowerCase().includes(search) || s.phone?.includes(search);
  });

  const totalOwed = filteredShippers.reduce((sum, s) => {
    const bal = Number(s?.balance || 0);
    return bal > 0 ? sum + bal : sum;
  }, 0);

  const handleDelete = () => {
    if (deleteId) {
      dispatch(deleteShipper(deleteId));
      setDeleteId(null);
    }
  };

  const formatBalance = (balance) => {
    const bal = Number(balance || 0);
    if (bal > 0) {
      return (
        <Typography color="error.main" fontWeight="medium">
          Rs {bal.toLocaleString()}
        </Typography>
      );
    }
    if (bal < 0) {
      return (
        <Typography color="success.main" fontWeight="medium">
          Rs {Math.abs(bal).toLocaleString()} (Overpaid)
        </Typography>
      );
    }
    return <Typography color="text.secondary">Rs 0</Typography>;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ShipperIcon fontSize="large" />
          Shippers
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate("/add-shipper")}
        >
          Add Shipper
        </Button>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total Shippers
              </Typography>
              <Typography variant="h4">{filteredShippers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card sx={{ bgcolor: "error.light" }}>
            <CardContent>
              <Typography variant="body2" color="error.contrastText">
                You Owe (Payable)
              </Typography>
              <Typography variant="h4" color="error.contrastText">
                Rs {totalOwed.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <FilterIcon sx={{ mr: 1, color: "text.secondary" }} />,
          }}
          size="small"
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell>Shipper Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredShippers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary">No shippers found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredShippers.map((shipper) => (
                <TableRow key={shipper._id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {shipper.username}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="body2">{shipper.phone || "N/A"}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{formatBalance(shipper.balance)}</TableCell>
                  <TableCell align="center">
                    {Number(shipper.balance || 0) > 0 ? (
                      <Chip label="You Owe" color="error" size="small" />
                    ) : Number(shipper.balance || 0) < 0 ? (
                      <Chip label="Overpaid" color="success" size="small" />
                    ) : (
                      <Chip label="Settled" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                      {/* MINUS (credit-only) — increases payable */}
                      <Tooltip title="Add Credit (Increase amount you owe)">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => setMinusBalanceShipper(shipper)}
                        >
                          <MinusIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* PAY shipper */}
                      <Tooltip title="Pay Shipper (Reduce payable)">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setAddBalanceShipper(shipper)}
                        >
                          <AddBalanceIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Discount from shipper */}
                      <Tooltip title="Apply Discount">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => setDiscountShipper(shipper)}
                          disabled={Number(shipper.balance || 0) <= 0}
                        >
                          <DiscountIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* View history */}
                      <Tooltip title="View History">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => setViewHistoryShipper(shipper)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Delete */}
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteId(shipper._id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Shipper</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this shipper? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pay (add balance) */}
      <AddShipperBalanceModal
        open={!!addBalanceShipper}
        onClose={() => setAddBalanceShipper(null)}
        shipper={addBalanceShipper}
      />

      {/* Discount */}
      <ShipperDiscountModal
        open={!!discountShipper}
        onClose={() => setDiscountShipper(null)}
        shipper={discountShipper}
      />

      {/* History */}
      <ShipperTransactionHistory
        open={!!viewHistoryShipper}
        onClose={() => setViewHistoryShipper(null)}
        shipper={viewHistoryShipper}
      />

      {/* Credit-only (minus) */}
      <MinusShipperBalanceModal
        open={!!minusBalanceShipper}
        onClose={() => setMinusBalanceShipper(null)}
        shipper={minusBalanceShipper}
      />
    </Box>
  );
};

export default ShipperList;
