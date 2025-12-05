import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  getPendingCheques,
  updateChequeStatus,
} from "../../redux/features/cheque/chequeSlice";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import axios from "axios";
import { toast } from "react-toastify";

const ChequeDetails = () => {
  const dispatch = useDispatch();
  const cheques = useSelector((state) => state.cheque.cheques);
  const isLoading = useSelector((state) => state.cheque.isLoading);
  const banks = useSelector((state) => state.bank.banks || []);

  const [todayCheques, setTodayCheques] = useState([]);
  const [upcomingCheques, setUpcomingCheques] = useState([]);
  const [selectedCheques, setSelectedCheques] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [allCheques, setAllCheques] = useState([]);

  // Ref for auto-scrolling to bottom
  const tableContainerRef = useRef(null);

  // CASH OUT MODAL STATE
  const [cashOutModalOpen, setCashOutModalOpen] = useState(false);
  const [cashOutMethod, setCashOutMethod] = useState(""); // "bank" | "cash"
  const [selectedBankId, setSelectedBankId] = useState("");
  const [processingCashOut, setProcessingCashOut] = useState(false);

  // TRANSFER STATE
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedChequeForTransfer, setSelectedChequeForTransfer] =
    useState(null);
  const [transferTo, setTransferTo] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferDescription, setTransferDescription] = useState("");
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api/cheques`;

  // ---------- Helpers ----------

  // treat Supplier / Shipper / Product as pay-out cheques
  const isPayOutCheque = (row) => {
    const t = (row?.type || "").toString().toLowerCase();
    return t === "supplier" || t === "shipper" || t === "product";
  };

  // get bank id from multiple possible shapes
  const getChequeBankId = (row) => {
    if (!row) return null;
    return (
      row.bankId || // explicit
      row.bank_id || // snake_case
      (row.bank && row.bank._id) || // populated object
      row.bank || // plain id in "bank"
      null
    );
  };

  // ---------- Effects ----------

  // Fetch ALL so cleared remain visible
  useEffect(() => {
    dispatch(getPendingCheques({ status: "all" }));
    dispatch(getBanks());
  }, [dispatch]);

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const baseUrl = BACKEND_URL.endsWith("/")
          ? BACKEND_URL
          : `${BACKEND_URL}/`;

        const [custResp, suppResp] = await Promise.all([
          axios.get(`${baseUrl}api/customers/allcustomer`, {
            withCredentials: true,
          }),
          axios.get(`${baseUrl}api/suppliers`, {
            withCredentials: true,
          }),
        ]);

        const customersData = Array.isArray(custResp.data)
          ? custResp.data
          : custResp.data?.customers || [];

        const suppliersData = Array.isArray(suppResp.data)
          ? suppResp.data
          : suppResp.data?.suppliers || [];

        setCustomers(customersData);
        setSuppliers(suppliersData);
      } catch (err) {
        console.error("❌ Error fetching entities:", err);
        toast.error(
          err.response?.data?.message || "Failed to load customers/suppliers"
        );
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

      // Only count PENDING, NOT CANCELLED, NOT TRANSFERRED-CASHED-OUT
      if (c.status === false && !c.cancelled) {
        if (c.transferred && c.transferredCashedOut) {
          return; // Skip this cheque for pending count
        }

        if (dayDiff === 0) t.push(c);
        else if (dayDiff > 0 && dayDiff <= 7) u.push(c);
      }
    });

    setAllCheques(all);
    setTodayCheques(t);
    setUpcomingCheques(u);
  }, [cheques]);

  // ✅ Auto-scroll to bottom when cheques load
  useEffect(() => {
    if (allCheques.length > 0 && tableContainerRef.current) {
      setTimeout(() => {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }, 100);
    }
  }, [allCheques]);

  // ---------- Derived selections ----------

  const selectedChequeRows = useMemo(
    () =>
      selectedCheques
        .map((id) => allCheques.find((c) => c._id === id))
        .filter(Boolean),
    [selectedCheques, allCheques]
  );

  // need user to pick a bank if ANY selected cheque has no saved bank
  const needBankSelection = useMemo(
    () => selectedChequeRows.some((row) => !getChequeBankId(row)),
    [selectedChequeRows]
  );

  // all selected cheques are payout AND all have bank -> we can auto-bank
  const isAllPayoutWithBank = useMemo(
    () =>
      selectedChequeRows.length > 0 &&
      selectedChequeRows.every(
        (row) => isPayOutCheque(row) && !!getChequeBankId(row)
      ),
    [selectedChequeRows]
  );

  const canSubmit = useMemo(() => {
    if (selectedCheques.length === 0) return false;
    return selectedCheques.every((id) => {
      const c = allCheques.find((x) => x._id === id);
      return c?.status === false && !c?.cancelled && !c?.transferred;
    });
  }, [selectedCheques, allCheques]);

  // ---------- Handlers ----------

  const handleStatusChange = (chequeId, isChecked) => {
    const row = allCheques.find((x) => x._id === chequeId);
    if (row?.status === true || row?.cancelled || row?.transferred) return;
    setSelectedCheques((prev) =>
      isChecked ? [...prev, chequeId] : prev.filter((id) => id !== chequeId)
    );
  };

  // open modal
  const handleCashOutClick = () => {
    // if they're all Shipper/Supplier/Product & have bank → auto-bank
    if (isAllPayoutWithBank) {
      setCashOutMethod("bank");
    } else {
      setCashOutMethod("");
    }
    setSelectedBankId("");
    setCashOutModalOpen(true);
  };

  const handleCashOutSubmit = async () => {
    if (!cashOutMethod && !isAllPayoutWithBank) {
      toast.error("Please select Bank or Cash");
      return;
    }

    // only require manual bank select if we actually need one
    if (cashOutMethod === "bank" && needBankSelection && !selectedBankId) {
      toast.error("Please select a bank for cheques without a saved bank");
      return;
    }

    const methodToUse = isAllPayoutWithBank ? "bank" : cashOutMethod;

    setProcessingCashOut(true);

    try {
      for (const chequeId of selectedCheques) {
        const row = allCheques.find((c) => c._id === chequeId);
        if (!row) continue;

        await dispatch(
          updateChequeStatus({
            id: row._id,
            status: true,
            skipBankProcessing: true,
          })
        ).unwrap();

        const amount = Number(row.amount) || 0;
        const description = `Cheque cleared: ${
          row.name || row.description || ""
        }`;

        const payOut = isPayOutCheque(row);
        const transactionType = payOut ? "subtract" : "add";
        const cashType = payOut ? "deduct" : "add";

        if (methodToUse === "bank") {
          const savedBankId = getChequeBankId(row);
          const bankIdToUse = savedBankId || selectedBankId;

          if (!bankIdToUse) {
            throw new Error("No bank selected for one of the cheques");
          }

          await axios.post(
            `${BACKEND_URL}api/banks/${bankIdToUse}/transaction`,
            {
              amount,
              type: transactionType,
              description,
            },
            { withCredentials: true }
          );
        } else if (methodToUse === "cash") {
          await axios.post(
            `${BACKEND_URL}api/cash/add`,
            {
              balance: amount,
              type: cashType,
              description,
            },
            { withCredentials: true }
          );
        }
      }

      await dispatch(getPendingCheques({ status: "all" }));
      await dispatch(getBanks());
      setSelectedCheques([]);
      setCashOutModalOpen(false);
      setCashOutMethod("");
      setSelectedBankId("");

      const payOutCount = selectedCheques.filter((id) => {
        const c = allCheques.find((x) => x._id === id);
        return isPayOutCheque(c);
      }).length;
      const payInCount = selectedCheques.length - payOutCount;

      let message = "Cheques processed: ";
      if (payOutCount > 0) message += `${payOutCount} payment(s) deducted. `;
      if (payInCount > 0) message += `${payInCount} receipt(s) added.`;

      toast.success(message);
    } catch (e) {
      const msg = e?.message || e?.error || "Failed to cash out cheques";
      console.error(msg);
      toast.error(msg);
    } finally {
      setProcessingCashOut(false);
    }
  };

  const handleCloseCashOutModal = () => {
    if (!processingCashOut) {
      setCashOutModalOpen(false);
      setCashOutMethod("");
      setSelectedBankId("");
    }
  };

  const handleCancel = async (chequeId) => {
    if (
      !window.confirm(
        "Are you sure you want to cancel this cheque? This will reverse the balance."
      )
    ) {
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
      const msg =
        err?.response?.data?.message || err?.message || "Failed to cancel cheque";
      console.error(msg);
      toast.error(msg);
    }
  };

  const handleCashOutTransferred = async (chequeId) => {
    if (
      !window.confirm(
        "Mark this transferred cheque as cashed out? This will NOT affect your bank balance."
      )
    ) {
      return;
    }

    try {
      await axios.patch(
        `${API_URL}/cashout-transferred/${chequeId}`,
        {},
        { withCredentials: true }
      );

      await dispatch(getPendingCheques({ status: "all" }));
      toast.success("Transferred cheque marked as cashed out successfully");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to cash out transferred cheque";
      console.error(msg);
      toast.error(msg);
    }
  };

  const handleTransferClick = (cheque) => {
    setSelectedChequeForTransfer(cheque);
    setTransferTo("");
    setTransferToId("");
    setTransferDescription("");
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
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to transfer cheque";
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

  // ---------- Render helpers ----------

  const renderStatus = (row) => (
    <>
      {row.cancelled ? (
        <Chip label="Cancelled" color="error" size="small" />
      ) : row.transferredCashedOut ? (
        <Chip label="Cashed Out (Transferred)" color="success" size="small" />
      ) : row.transferred ? (
        <Chip label="Transferred" color="info" size="small" />
      ) : row.status ? (
        <Chip label="Cleared" size="small" />
      ) : (
        <Chip label="Pending" color="warning" size="small" />
      )}
    </>
  );

  const renderSelectCheckbox = (row) => {
    const disabled =
      row.status === true ||
      row.cancelled === true ||
      row.transferred === true;
    const box = (
      <Checkbox
        checked={selectedCheques.includes(row._id)}
        onChange={(e) => handleStatusChange(row._id, e.target.checked)}
        disabled={disabled}
      />
    );
    let tip = "";
    if (row.status === true) tip = "Already cleared";
    if (row.cancelled === true) tip = "Cheque is cancelled";
    if (row.transferred === true) {
      if (row.transferredCashedOut) {
        tip = "Transferred cheque already cashed out by recipient";
      } else {
        tip = "Cheque is transferred - use Cash Out button to mark as cashed";
      }
    }
    return tip ? (
      <Tooltip title={tip}>
        <span>{box}</span>
      </Tooltip>
    ) : (
      box
    );
  };

  const renderActions = (row) => (
    <Box sx={{ display: "flex", gap: 1 }}>
      {!row.cancelled && !row.status && (
        <>
          {!row.transferred && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => handleCancel(row._id)}
            >
              Cancel
            </Button>
          )}

          {!row.transferred && (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => handleTransferClick(row)}
            >
              Transfer
            </Button>
          )}

          {row.transferred && !row.transferredCashedOut && (
            <>
              <Button
                variant="outlined"
                color="success"
                size="small"
                onClick={() => handleCashOutTransferred(row._id)}
              >
                Cash Out
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleCancel(row._id)}
              >
                Cancel
              </Button>
            </>
          )}
        </>
      )}
    </Box>
  );

  if (isLoading) return <CircularProgress />;

  // ---------- JSX ----------

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
                  <ListItemText
                    primary={`${c.name} - ${c.type} - Rs ${Number(
                      c.amount || 0
                    ).toLocaleString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}
        {upcomingCheques.length > 0 && (
          <Alert severity="info">
            <AlertTitle>Upcoming Cheques</AlertTitle>
            You have {upcomingCheques.length} cheque(s) coming up in the next 7
            days.
          </Alert>
        )}
      </Stack>

      <Paper>
        {/* ✅ Scrollable Table Container - Shows ~5 rows, scrolls to bottom */}
        <TableContainer
          ref={tableContainerRef}
          sx={{
            maxHeight: 350,
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Select</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>View</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allCheques.map((row, index) => (
                <TableRow key={row._id || index} hover>
                  <TableCell>
                    {new Date(row.chequeDate || row.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.name}
                  </TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>Rs {Number(row.amount || 0).toLocaleString()}</TableCell>
                  <TableCell>{renderStatus(row)}</TableCell>
                  <TableCell>{renderSelectCheckbox(row)}</TableCell>
                  <TableCell>
                    {row.chequeImage?.filePath ? (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setSelectedImage(row.chequeImage.filePath)}
                      >
                        View
                      </Button>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No Image
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{renderActions(row)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Tooltip
          title={
            selectedCheques.length === 0
              ? "Select at least one cheque"
              : !canSubmit
              ? "Only pending cheques can be cashed"
              : ""
          }
        >
          <span>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCashOutClick}
              disabled={!canSubmit}
              sx={{ mt: 2, ml: 2, mb: 2 }}
            >
              Cash Out Selected Cheques ({selectedCheques.length})
            </Button>
          </span>
        </Tooltip>
      </Paper>

      {/* CASH OUT MODAL */}
      <Modal open={cashOutModalOpen} onClose={handleCloseCashOutModal}>
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
            Cash Out Cheques
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            {(() => {
              const payOutCount = selectedCheques.filter((id) => {
                const c = allCheques.find((x) => x._id === id);
                return isPayOutCheque(c);
              }).length;
              const payInCount = selectedCheques.length - payOutCount;

              const payOutTotal = selectedCheques
                .filter((id) => {
                  const c = allCheques.find((x) => x._id === id);
                  return isPayOutCheque(c);
                })
                .reduce(
                  (sum, id) =>
                    sum +
                    Number(allCheques.find((x) => x._id === id)?.amount || 0),
                  0
                );

              const payInTotal = selectedCheques
                .filter((id) => {
                  const c = allCheques.find((x) => x._id === id);
                  return !isPayOutCheque(c);
                })
                .reduce(
                  (sum, id) =>
                    sum +
                    Number(allCheques.find((x) => x._id === id)?.amount || 0),
                  0
                );

              return (
                <>
                  {payOutCount > 0 && (
                    <Typography variant="body2" color="error.main">
                      💸 {payOutCount} payment(s) will DEDUCT Rs{" "}
                      {payOutTotal.toLocaleString()}
                    </Typography>
                  )}
                  {payInCount > 0 && (
                    <Typography variant="body2" color="success.main">
                      💰 {payInCount} receipt(s) will ADD Rs{" "}
                      {payInTotal.toLocaleString()}
                    </Typography>
                  )}
                  <Typography
                    variant="body2"
                    sx={{ mt: 1, fontWeight: "bold" }}
                  >
                    Net: Rs {(payInTotal - payOutTotal).toLocaleString()}
                  </Typography>
                </>
              );
            })()}
          </Alert>

          {/* Only show Bank/Cash choice if NOT auto-bank scenario */}
          {!isAllPayoutWithBank && (
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Select Destination</FormLabel>
              <RadioGroup
                value={cashOutMethod}
                onChange={(e) => {
                  setCashOutMethod(e.target.value);
                  if (e.target.value === "cash") {
                    setSelectedBankId("");
                  }
                }}
              >
                <FormControlLabel
                  value="bank"
                  control={<Radio />}
                  label="Bank Account"
                  disabled={processingCashOut}
                />
                <FormControlLabel
                  value="cash"
                  control={<Radio />}
                  label="Cash"
                  disabled={processingCashOut}
                />
              </RadioGroup>
            </FormControl>
          )}

          {/* Only show bank dropdown if we really need a manual bank */}
          {cashOutMethod === "bank" && needBankSelection && (
            <TextField
              select
              label="Select Bank (for cheques without a saved bank)"
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              fullWidth
              margin="normal"
              disabled={processingCashOut}
            >
              <MenuItem value="">-- Select Bank --</MenuItem>
              {banks.map((bank) => (
                <MenuItem key={bank._id} value={bank._id}>
                  {bank.bankName} - Rs{" "}
                  {Number(
                    bank.balance || bank.totalBalance || 0
                  ).toLocaleString()}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCashOutSubmit}
              fullWidth
              disabled={
                processingCashOut ||
                (!cashOutMethod && !isAllPayoutWithBank) ||
                (cashOutMethod === "bank" &&
                  needBankSelection &&
                  !selectedBankId)
              }
            >
              {processingCashOut ? "Processing..." : "Confirm Cash Out"}
            </Button>
            <Button
              variant="outlined"
              onClick={handleCloseCashOutModal}
              fullWidth
              disabled={processingCashOut}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Modal>

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
          <img
            src={selectedImage}
            alt="Cheque"
            style={{ maxWidth: "90%", maxHeight: "90%" }}
          />
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

      {/* TRANSFER MODAL */}
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
            <strong>Cheque Details:</strong>
            <br />
            Amount: Rs{" "}
            {Number(selectedChequeForTransfer?.amount || 0).toLocaleString()}
            <br />
            From: {selectedChequeForTransfer?.name}
          </Typography>

          <TextField
            select
            label="Transfer To"
            value={transferTo}
            onChange={(e) => {
              setTransferTo(e.target.value);
              setTransferToId("");
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
              label={`Select ${
                transferTo === "customer" ? "Customer" : "Supplier"
              }`}
              value={transferToId}
              onChange={(e) => setTransferToId(e.target.value)}
              fullWidth
              margin="normal"
            >
              <MenuItem value="">
                -- Select {transferTo === "customer" ? "Customer" : "Supplier"} --
              </MenuItem>
              {(transferTo === "customer" ? customers : suppliers).map(
                (entity) => (
                  <MenuItem key={entity._id} value={entity._id}>
                    {entity.username || entity.name}
                  </MenuItem>
                )
              )}
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