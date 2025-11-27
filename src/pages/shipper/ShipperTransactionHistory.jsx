// components/Shipper/ShipperTransactionHistory.jsx
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  Box,
} from "@mui/material";
import {
  LocalShipping as ShipperIcon,
  ArrowUpward as CreditIcon,
  ArrowDownward as DebitIcon,
} from "@mui/icons-material";
import { getShipperTransactions, clearShipper } from "../../redux/features/shipper/shipperSlice";

const ShipperTransactionHistory = ({ open, onClose, shipper }) => {
  const dispatch = useDispatch();
  const { transactionHistory, isLoading } = useSelector((state) => state.shipper);

  useEffect(() => {
    if (open && shipper?._id) {
      dispatch(getShipperTransactions(shipper._id));
    }
  }, [open, shipper, dispatch]);

  useEffect(() => {
    if (!open) {
      dispatch(clearShipper());
    }
  }, [open, dispatch]);

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ShipperIcon color="primary" />
        Transaction History - {shipper?.username}
      </DialogTitle>
      <DialogContent>
        {/* Summary */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Current Balance
              </Typography>
              <Typography
                variant="h5"
                color={Number(shipper?.balance || 0) > 0 ? "error.main" : "success.main"}
              >
                Rs {Math.abs(Number(shipper?.balance || 0)).toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Shipments
              </Typography>
              <Typography variant="h5">{shipper?.totalShipments || 0}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Paid
              </Typography>
              <Typography variant="h5">
                Rs {Number(shipper?.totalAmountPaid || 0).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Method</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (transactionHistory || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">No transactions found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                (transactionHistory || []).map((tx, index) => (
                  <TableRow key={tx._id || index} hover>
                    <TableCell>{formatDate(tx.date)}</TableCell>
                    <TableCell>
                      {tx.type === "credit" ? (
                        <Chip
                          icon={<CreditIcon fontSize="small" />}
                          label="Paid"
                          color="error"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          icon={<DebitIcon fontSize="small" />}
                          label="Received"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                        {tx.description}
                      </Typography>
                      {tx.shipmentDetails?.fromLocation && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {tx.shipmentDetails.fromLocation} → {tx.shipmentDetails.toLocation}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tx.paymentMethod?.toUpperCase() || "N/A"}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        color={tx.type === "credit" ? "error.main" : "success.main"}
                        fontWeight="medium"
                      >
                        {tx.type === "credit" ? "-" : "+"}Rs {Number(tx.amount || 0).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tx.status || "completed"}
                        color={tx.status === "pending" ? "warning" : "success"}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShipperTransactionHistory;