import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Paper,
  Checkbox,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Button,
  Modal,
  Tooltip,
  Chip,
  Box,
  TextField,
  MenuItem,
} from "@mui/material";
import {
  getPendingCheques,
  updateChequeStatus,
} from "../../redux/features/cheque/chequeSlice";
import CustomTable from "../../components/CustomTable/CustomTable";
import axios from "axios";
import { toast } from "react-toastify";

const ChequeDetails = () => {
  const dispatch = useDispatch();
  const cheques = useSelector((state) => state.cheque.cheques);
  const isLoading = useSelector((state) => state.cheque.isLoading);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [todayCheques, setTodayCheques] = useState([]);
  const [upcomingCheques, setUpcomingCheques] = useState([]);
  const [selectedCheques, setSelectedCheques] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [allCheques, setAllCheques] = useState([]);

  // ✅ TRANSFER STATE
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedChequeForTransfer, setSelectedChequeForTransfer] = useState(null);
  const [transferTo, setTransferTo] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferDescription, setTransferDescription] = useState("");
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api/cheques`;

  // Fetch ALL so cleared remain visible
  useEffect(() => {
    dispatch(getPendingCheques({ status: "all" }));
  }, [dispatch]);

// ✅ CHANGE THIS:
useEffect(() => {
  const fetchEntities = async () => {
    try {
      const baseUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL : `${BACKEND_URL}/`;
      
      console.log('Fetching customers from:', `${baseUrl}api/customers/allcustomer`);
      console.log('Fetching suppliers from:', `${baseUrl}api/suppliers`);

      const [custResp, suppResp] = await Promise.all([
        axios.get(`${baseUrl}api/customers/allcustomer`, { withCredentials: true }), // ✅ Add /allcustomer
        axios.get(`${baseUrl}api/suppliers`, { withCredentials: true }),
      ]);

      console.log('Customers response:', custResp);
      console.log('Suppliers response:', suppResp);

      const customersData = Array.isArray(custResp.data) 
        ? custResp.data 
        : custResp.data?.customers || [];
      
      const suppliersData = Array.isArray(suppResp.data)
        ? suppResp.data
        : suppResp.data?.suppliers || [];

      console.log('Customers count:', customersData.length);
      console.log('Suppliers count:', suppliersData.length);

      setCustomers(customersData);
      setSuppliers(suppliersData);

      if (suppliersData.length === 0) {
        console.warn('⚠️ No suppliers found!');
      }
      if (customersData.length === 0) {
        console.warn('⚠️ No customers found!');
      }
    } catch (err) {
      console.error("❌ Error fetching entities:", err);
      console.error("Error response:", err.response);
      toast.error(err.response?.data?.message || "Failed to load customers/suppliers");
    }
  };
  fetchEntities();
}, [BACKEND_URL]);

  useEffect(() => {
    if (!Array.isArray(cheques)) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const t = [];
    const u = [];
    const all = [];

    cheques.forEach((c) => {
      const d = new Date(c.chequeDate || c.date || Date.now());
      d.setHours(0, 0, 0, 0);
      const dayDiff = (d.getTime() - today.getTime()) / (1000 * 3600 * 24);

      all.push(c);
      
      // ✅ Only count PENDING, NOT CANCELLED, and NOT TRANSFERRED cheques
      if (c.status === false && !c.cancelled && !c.transferred) {
        if (dayDiff === 0) t.push(c);
        else if (dayDiff > 0 && dayDiff <= 7) u.push(c);
      }
    });

    setAllCheques(all);
    setTodayCheques(t);
    setUpcomingCheques(u);
  }, [cheques]);

  // Only allow selecting rows that are pending AND have a bank id AND not cancelled AND not transferred
  const canSubmit = useMemo(() => {
    if (selectedCheques.length === 0) return false;
    return selectedCheques.every((id) => {
      const c = allCheques.find((x) => x._id === id);
      return !!c?.bank && c?.status === false && !c?.cancelled && !c?.transferred;
    });
  }, [selectedCheques, allCheques]);

  const handleStatusChange = (chequeId, isChecked) => {
    const row = allCheques.find((x) => x._id === chequeId);
    if (!row?.bank || row?.status === true || row?.cancelled || row?.transferred) return;
    setSelectedCheques((prev) =>
      isChecked ? [...prev, chequeId] : prev.filter((id) => id !== chequeId)
    );
  };

  const handleSubmit = async () => {
    try {
      for (const chequeId of selectedCheques) {
        const row = allCheques.find((c) => c._id === chequeId);
        if (!row) continue;

        await dispatch(
          updateChequeStatus({
            id: row._id,
            status: true,
          })
        ).unwrap();
      }

      await dispatch(getPendingCheques({ status: "all" }));
      setSelectedCheques([]);
      toast.success("Cheques cashed out successfully");
    } catch (e) {
      const msg = e?.message || e?.error || "Failed to cash out cheques";
      console.error(msg);
      toast.error(msg);
    }
  };

  const handleCancel = async (chequeId) => {
    if (!window.confirm("Are you sure you want to cancel this cheque? This will reverse the balance.")) {
      return;
    }

    try {
      await axios.patch(
        `${API_URL}/cancel/${chequeId}`,
        {},
        { withCredentials: true }
      );

      await dispatch(getPendingCheques({ status: "all" }));
      toast.success("Cheque cancelled successfully");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to cancel cheque";
      console.error(msg);
      toast.error(msg);
    }
  };

  // ✅ FIX: Reset all fields when opening transfer modal
  const handleTransferClick = (cheque) => {
    setSelectedChequeForTransfer(cheque);
    setTransferTo(""); // ✅ Clear dropdown
    setTransferToId(""); // ✅ Clear entity selection
    setTransferDescription(""); // ✅ Clear description
    setTransferModalOpen(true);
  };

  const handleTransferSubmit = async () => {
    if (!transferTo || !transferToId) {
      toast.error("Please select transfer destination");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/transfer/${selectedChequeForTransfer._id}`,
        {
          transferTo,
          transferToId,
          description: transferDescription,
        },
        { withCredentials: true }
      );

      await dispatch(getPendingCheques({ status: "all" }));
      setTransferModalOpen(false);
      setTransferTo("");
      setTransferToId("");
      setTransferDescription("");
      setSelectedChequeForTransfer(null);
      toast.success("Cheque transferred successfully");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to transfer cheque";
      console.error(msg);
      toast.error(msg);
    }
  };

  const handleCloseTransferModal = () => {
    setTransferModalOpen(false);
    setTransferTo("");
    setTransferToId("");
    setTransferDescription("");
    setSelectedChequeForTransfer(null);
  };

  const handleCloseModal = () => setSelectedImage(null);

  const handlePageChange = (newPage) => {
    setPage(Math.max(0, Number(newPage) || 0));
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(Number(newRowsPerPage) || 5);
    setPage(0);
  };

  const columns = [
    {
      field: "chequeDate",
      headerName: "Date",
      renderCell: (row) => new Date(row.chequeDate || row.date).toLocaleDateString(),
    },
    { field: "name", headerName: "Description" },
    { field: "type", headerName: "Type" },
    {
      field: "status",
      headerName: "Status",
      renderCell: (row) => (
        <>
          {row.cancelled ? (
            <Chip label="Cancelled" color="error" size="small" />
          ) : row.transferred ? (
            <Chip label="Transferred" color="info" size="small" />
          ) : row.status ? (
            <Chip label="Cleared" size="small" />
          ) : (
            <Chip label="Pending" color="warning" size="small" />
          )}
        </>
      ),
    },
    
    {
      field: "statusChange",
      headerName: "Select",
      renderCell: (row) => {
        const disabled = !row.bank || row.status === true || row.cancelled === true || row.transferred === true;
        const box = (
          <Checkbox
            checked={selectedCheques.includes(row._id)}
            onChange={(e) => handleStatusChange(row._id, e.target.checked)}
            disabled={disabled}
          />
        );
        let tip = "";
        if (!row.bank) tip = "Missing bank account — cannot cash out";
        if (row.status === true) tip = "Already cleared";
        if (row.cancelled === true) tip = "Cheque is cancelled";
        if (row.transferred === true) tip = "Cheque is transferred";
        return tip ? (
          <Tooltip title={tip}>
            <span>{box}</span>
          </Tooltip>
        ) : (
          box
        );
      },
    },
    {
      field: "view",
      headerName: "View",
      renderCell: (row) =>
        row.chequeImage?.filePath ? (
          <Button variant="outlined" onClick={() => setSelectedImage(row.chequeImage.filePath)}>
            View
          </Button>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No Image
          </Typography>
        ),
    },
    {
      field: "actions",
      headerName: "Actions",
      renderCell: (row) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          {!row.cancelled && !row.status && !row.transferred && (
            <>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleCancel(row._id)}
              >
                Cancel
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={() => handleTransferClick(row)}
              >
                Transfer
              </Button>
            </>
          )}
        </Box>
      ),
    },
  ];

  if (isLoading) return <CircularProgress />;

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Cheques (Pending &amp; Cleared)
      </Typography>

      <Stack spacing={2} sx={{ mb: 2 }}>
        {todayCheques.length > 0 && (
          <Alert severity="warning">
            <AlertTitle>Cheques Due Today</AlertTitle>
            You have {todayCheques.length} cheque(s) due for cash today:
            <List dense>
              {todayCheques.map((c) => (
                <ListItem key={c._id}>
                  <ListItemText primary={`${c.name} - ${c.type}`} />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}
        {upcomingCheques.length > 0 && (
          <Alert severity="info">
            <AlertTitle>Upcoming Cheques</AlertTitle>
            You have {upcomingCheques.length} cheque(s) coming up in the next 7 days.
          </Alert>
        )}
      </Stack>

      <Paper>
        <CustomTable
          columns={columns}
          data={allCheques || []}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />

        <Tooltip
          title={
            selectedCheques.length === 0
              ? "Select at least one cheque"
              : !canSubmit
              ? "Only pending cheques with a bank can be cashed"
              : ""
          }
        >
          <span>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={!canSubmit}
              sx={{ mt: 2, ml: 2, mb: 2 }}
            >
              Cash Out Selected Cheques ({selectedCheques.length})
            </Button>
          </span>
        </Tooltip>
      </Paper>

      {/* Image Modal */}
      <Modal open={Boolean(selectedImage)} onClose={handleCloseModal}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            position: "relative",
          }}
        >
          <img src={selectedImage} alt="Cheque" style={{ maxWidth: "90%", maxHeight: "90%" }} />
          <Button
            onClick={handleCloseModal}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              zIndex: 1,
              backgroundColor: "black",
              color: "white",
            }}
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* ✅ TRANSFER MODAL */}
      <Modal open={transferModalOpen} onClose={handleCloseTransferModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Transfer Cheque
          </Typography>

          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Cheque Details:</strong><br />
            Amount: {selectedChequeForTransfer?.amount}<br />
            From: {selectedChequeForTransfer?.name}
          </Typography>

          <TextField
            select
            label="Transfer To"
            value={transferTo}
            onChange={(e) => {
              setTransferTo(e.target.value);
              setTransferToId(""); // Reset entity selection when changing type
            }}
            fullWidth
            margin="normal"
          >
            <MenuItem value="">-- Select Type --</MenuItem>
            <MenuItem value="customer">Customer</MenuItem>
            <MenuItem value="supplier">Supplier</MenuItem>
          </TextField>

          {transferTo && (
            <TextField
              select
              label={`Select ${transferTo === "customer" ? "Customer" : "Supplier"}`}
              value={transferToId}
              onChange={(e) => setTransferToId(e.target.value)}
              fullWidth
              margin="normal"
            >
              <MenuItem value="">-- Select {transferTo === "customer" ? "Customer" : "Supplier"} --</MenuItem>
              {(transferTo === "customer" ? customers : suppliers).map((entity) => (
                <MenuItem key={entity._id} value={entity._id}>
                  {entity.username || entity.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Description (Optional)"
            value={transferDescription}
            onChange={(e) => setTransferDescription(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={2}
            placeholder="e.g., Payment for invoice #123"
          />

          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleTransferSubmit}
              fullWidth
              disabled={!transferTo || !transferToId}
            >
              Transfer
            </Button>
            <Button
              variant="outlined"
              onClick={handleCloseTransferModal}
              fullWidth
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default ChequeDetails;