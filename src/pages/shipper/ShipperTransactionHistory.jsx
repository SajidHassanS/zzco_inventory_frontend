// components/Shipper/ShipperTransactionHistory.jsx
import React, { useEffect, useState } from "react";
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
  IconButton,
  Modal,
} from "@mui/material";
import {
  LocalShipping as ShipperIcon,
  ArrowUpward as CreditIcon,
  ArrowDownward as DebitIcon,
  Visibility,
  PictureAsPdf as PdfIcon,
} from "@mui/icons-material";
import { getShipperTransactions, clearShipper } from "../../redux/features/shipper/shipperSlice";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ShipperTransactionHistory = ({ open, onClose, shipper }) => {
  const dispatch = useDispatch();
  const { transactionHistory, isLoading } = useSelector((state) => state.shipper);

  // Image modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

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

  const formatDateShort = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  // Extract image URL helper
  const extractImageUrl = (obj) => {
    if (!obj) return null;
    if (typeof obj === "string") return obj;
    if (obj.filePath) return obj.filePath;
    if (obj.imageFilePath) return obj.imageFilePath;
    if (obj._doc) {
      if (obj._doc.filePath) return obj._doc.filePath;
      if (obj._doc.imageFilePath) return obj._doc.imageFilePath;
    }
    return null;
  };

  // Handle image view
  const handleViewImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage(null);
  };

  // Calculate running balance and totals
  const processedTransactions = React.useMemo(() => {
    if (!transactionHistory || transactionHistory.length === 0) return [];

    // Sort by date (oldest first)
    const sorted = [...transactionHistory].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0);
      const dateB = new Date(b.date || b.createdAt || 0);
      return dateA - dateB;
    });

    let runningBalance = 0;
    return sorted.map((tx) => {
      const type = String(tx?.type || "").toLowerCase();
      const amount = toNum(tx?.amount);

      // Credit = You paid shipper (balance increases)
      // Debit = Shipper paid you back (balance decreases)
      const credit = type === "credit" ? amount : 0;
      const debit = type === "debit" ? amount : 0;
      runningBalance += credit - debit;

      return {
        ...tx,
        credit,
        debit,
        runningBalance,
      };
    });
  }, [transactionHistory]);

  // Calculate totals
  const totalCredit = processedTransactions.reduce((sum, tx) => sum + toNum(tx.credit), 0);
  const totalDebit = processedTransactions.reduce((sum, tx) => sum + toNum(tx.debit), 0);
  const finalBalance = totalCredit - totalDebit;

  // ✅ Professional PDF download
  const downloadPDF = () => {
    const doc = new jsPDF("landscape");

    // ✅ COMPANY LOGO/HEADER - ORANGE COLOR
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 87, 34);
    doc.text("Z&Z TRADERS .CO", 148, 12, { align: "center" });

    // Decorative line under logo
    doc.setLineWidth(0.8);
    doc.setDrawColor(255, 87, 34);
    doc.line(110, 15, 186, 15);

    // ✅ Shipper name
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`${shipper?.username || "SHIPPER"}`, 14, 15);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Shipper Ledger", 14, 22);

    // ✅ Date range
    doc.setFontSize(10);
    const today = new Date().toLocaleDateString();
    const firstDate =
      processedTransactions.length > 0
        ? new Date(processedTransactions[0]?.date || processedTransactions[0]?.createdAt).toLocaleDateString()
        : today;
    doc.text(`From Date: ${firstDate}`, 240, 15);
    doc.text(`To Date: ${today}`, 240, 20);

    // ✅ Table columns
    const tableColumn = [
      "Date",
      "Type",
      "Description",
      "Payment Method",
      "Cheque Date",
      "Debit (Received)",
      "Credit (Paid)",
      "Running Balance",
    ];

    const tableRows = processedTransactions.map((tx) => {
      const paymentMethod = String(tx?.paymentMethod || "").toUpperCase();
      const chequeDate = tx?.chequeDate ? formatDateShort(tx.chequeDate) : "-";

      // Shipment info
      let description = tx?.description || "-";
      if (tx.shipmentDetails?.fromLocation) {
        description += ` (${tx.shipmentDetails.fromLocation} → ${tx.shipmentDetails.toLocation || "N/A"})`;
      }

      return [
        formatDateShort(tx?.date),
        tx?.type === "credit" ? "PAID" : "RECEIVED",
        description,
        paymentMethod,
        chequeDate,
        toNum(tx?.debit).toFixed(2),
        toNum(tx?.credit).toFixed(2),
        toNum(tx?.runningBalance).toFixed(2),
      ];
    });

    // ✅ Add totals row
    tableRows.push(["", "", "", "", "TOTAL:", totalDebit.toFixed(2), totalCredit.toFixed(2), ""]);

    // ✅ Professional table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 25, halign: "center" }, // Date
        1: { cellWidth: 20, halign: "center" }, // Type
        2: { cellWidth: 70, halign: "left" }, // Description
        3: { cellWidth: 25, halign: "center" }, // Payment Method
        4: { cellWidth: 25, halign: "center" }, // Cheque Date
        5: { cellWidth: 30, halign: "right", textColor: [0, 128, 0] }, // Debit (green - received)
        6: { cellWidth: 30, halign: "right", textColor: [255, 0, 0] }, // Credit (red - paid)
        7: { cellWidth: 35, halign: "right", fontStyle: "bold" }, // Running Balance
      },
      didParseCell: function (data) {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
      styles: {
        overflow: "linebreak",
        cellWidth: "wrap",
      },
    });

    const finalY = doc.lastAutoTable.finalY || 28;

    // ✅ Summary
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");

    doc.text(`Total Shipments: ${shipper?.totalShipments || 0}`, 14, finalY + 10);
    doc.text(`Total Paid (Credit): Rs ${totalCredit.toFixed(2)}`, 80, finalY + 10);
    doc.text(`Total Received (Debit): Rs ${totalDebit.toFixed(2)}`, 160, finalY + 10);

    doc.setTextColor(finalBalance >= 0 ? 255 : 0, finalBalance >= 0 ? 0 : 128, 0);
    doc.text(`Final Balance: Rs ${finalBalance.toFixed(2)}`, 240, finalY + 10);

    doc.save(`Shipper_Ledger_${shipper?.username || "shipper"}_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
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
                  <Typography component="span" variant="body2" sx={{ ml: 1 }}>
                    {Number(shipper?.balance || 0) > 0 ? "(You Owe)" : "(Overpaid)"}
                  </Typography>
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
                <Typography variant="h5" color="error.main">
                  Rs {totalCredit.toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Received
                </Typography>
                <Typography variant="h5" color="success.main">
                  Rs {totalDebit.toLocaleString()}
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
                  <TableCell>Cheque Date</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Credit</TableCell>
                  <TableCell>Image</TableCell>
                  <TableCell align="right">Running Balance</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : processedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                      <Typography color="text.secondary">No transactions found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  processedTransactions.map((tx, index) => {
                    const imageUrl = extractImageUrl(tx.image);
                    return (
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
                        <TableCell>{tx.chequeDate ? formatDateShort(tx.chequeDate) : "-"}</TableCell>
                        <TableCell align="right">
                          <Typography color="success.main">
                            {toNum(tx.debit) > 0 ? `Rs ${toNum(tx.debit).toLocaleString()}` : "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography color="error.main">
                            {toNum(tx.credit) > 0 ? `Rs ${toNum(tx.credit).toLocaleString()}` : "-"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {imageUrl ? (
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleViewImage(imageUrl)}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            fontWeight="bold"
                            color={toNum(tx.runningBalance) > 0 ? "error.main" : "success.main"}
                          >
                            Rs {toNum(tx.runningBalance).toLocaleString()}
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
                    );
                  })
                )}

                {/* Totals Row */}
                {processedTransactions.length > 0 && (
                  <TableRow sx={{ bgcolor: "grey.100" }}>
                    <TableCell colSpan={5} align="right">
                      <Typography fontWeight="bold">TOTAL:</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold" color="success.main">
                        Rs {totalDebit.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold" color="error.main">
                        Rs {totalCredit.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell />
                    <TableCell align="right">
                      <Typography
                        fontWeight="bold"
                        color={finalBalance > 0 ? "error.main" : "success.main"}
                      >
                        Rs {finalBalance.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PdfIcon />}
            onClick={downloadPDF}
            disabled={processedTransactions.length === 0}
          >
            Download PDF
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Image Modal */}
      <Modal open={imageModalOpen} onClose={handleCloseImageModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 2,
            borderRadius: 1,
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Receipt/Cheque"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleCloseImageModal}
            sx={{ mt: 2, display: "block", mx: "auto" }}
          >
            Close
          </Button>
        </Box>
      </Modal>
    </>
  );
};

export default ShipperTransactionHistory;