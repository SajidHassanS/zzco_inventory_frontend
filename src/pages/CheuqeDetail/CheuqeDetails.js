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
} from "@mui/material";
import {
  getPendingCheques,
  updateChequeStatus,
} from "../../redux/features/cheque/chequeSlice";
import CustomTable from "../../components/CustomTable/CustomTable";

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

  // Fetch ALL so cleared remain visible
  useEffect(() => {
    dispatch(getPendingCheques({ status: "all" }));
  }, [dispatch]);

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
      if (dayDiff === 0) t.push(c);
      else if (dayDiff > 0 && dayDiff <= 7) u.push(c);
    });

    setAllCheques(all);
    setTodayCheques(t);
    setUpcomingCheques(u);
  }, [cheques]);

  // Only allow selecting rows that are pending AND have a bank id
  const canSubmit = useMemo(() => {
    if (selectedCheques.length === 0) return false;
    return selectedCheques.every((id) => {
      const c = allCheques.find((x) => x._id === id);
      return !!c?.bank && c?.status === false;
    });
  }, [selectedCheques, allCheques]);

  const handleStatusChange = (chequeId, isChecked) => {
    const row = allCheques.find((x) => x._id === chequeId);
    if (!row?.bank || row?.status === true) return; // can't select cleared or missing bank
    setSelectedCheques((prev) =>
      isChecked ? [...prev, chequeId] : prev.filter((id) => id !== chequeId)
    );
  };

  const handleSubmit = async () => {
    try {
      for (const chequeId of selectedCheques) {
        const row = allCheques.find((c) => c._id === chequeId);
        if (!row) continue;

        // 👉 Always send the CHEQUE _id to the server
        await dispatch(
          updateChequeStatus({
            id: row._id,
            status: true,
          })
        ).unwrap();
      }

      await dispatch(getPendingCheques({ status: "all" }));
      setSelectedCheques([]);
    } catch (e) {
      const msg = e?.message || e?.error || "Failed to cash out cheques";
      console.error(msg);
      alert(msg);
    }
  };

  const handleCloseModal = () => setSelectedImage(null);

  const columns = [
    {
      field: "chequeDate",
      headerName: "Date",
      renderCell: (row) => new Date(row.chequeDate || row.date).toLocaleDateString(),
    },
    { field: "name", headerName: "Name" },
    { field: "type", headerName: "Type" },
    {
      field: "status",
      headerName: "Status",
      renderCell: (row) =>
        row.status ? (
          <Chip label="Cleared" size="small" />
        ) : (
          <Chip label="Pending" color="warning" size="small" />
        ),
    },
    {
      field: "statusChange",
      headerName: "Select",
      renderCell: (row) => {
        const disabled = !row.bank || row.status === true;
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
  ];

  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

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
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
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
              sx={{ mt: 2 }}
            >
              Cash Out Selected Cheques ({selectedCheques.length})
            </Button>
          </span>
        </Tooltip>
      </Paper>

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
    </div>
  );
};

export default ChequeDetails;
