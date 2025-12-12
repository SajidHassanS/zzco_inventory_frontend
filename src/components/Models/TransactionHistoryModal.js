// src/components/Models/TransactionHistoryModal.jsx
// ✅ Updated with DELETE functionality
import React, { useEffect, useState, useRef } from "react";
import { 
  Modal, Box, Typography, Button, IconButton, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  CircularProgress, Tooltip
} from "@mui/material";
import { Visibility, Delete } from "@mui/icons-material";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const formatNumber = (num) => {
  return toNum(num).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function parseQtyUnitFromDesc(desc) {
  const s = String(desc || "");
  const m = s.match(/(\d+)\s*[x×]\s.*?@\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (!m) return { qty: null, unit: null };
  return { qty: Number(m[1]), unit: Number(m[2]) };
}

const TransactionHistoryModal = ({ open, onClose, customer, onTransactionDeleted }) => {
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // ✅ NEW: Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const tableContainerRef = useRef(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api/customers`;

  // ✅ NEW: Handle delete button click
  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  // ✅ NEW: Confirm and execute delete
  const handleConfirmDelete = async () => {
    if (!transactionToDelete || !customer?._id) return;

    setIsDeleting(true);
    try {
      const response = await axios.delete(
        `${API_URL}/${customer._id}/transaction/${transactionToDelete._id}`,
        { withCredentials: true }
      );

      console.log("✅ Transaction deleted:", response.data);

      // Remove from local state
      setTransactions((prev) =>
        prev.filter((t) => t._id !== transactionToDelete._id)
      );

      // Update total balance from response
      if (response.data.newBalance !== undefined) {
        setTotalBalance(response.data.newBalance);
      }

      // Notify parent component
      if (onTransactionDeleted) {
        onTransactionDeleted(customer._id, response.data.newBalance);
      }

      toast.success("Transaction deleted successfully!");
      handleCloseDeleteDialog();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error(error.response?.data?.message || "Failed to delete transaction");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!open || !customer?._id) return;

    const fetchTransactions = async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/transactionHistory/${customer._id}`,
          { withCredentials: true }
        );

        let history = Array.isArray(data?.transactionHistory)
          ? data.transactionHistory
          : [];

        console.log("📦 RAW CUSTOMER TRANSACTION HISTORY:", history);

        history = history.sort((a, b) => {
          const dateA = new Date(a.date || a.createdAt || 0);
          const dateB = new Date(b.date || b.createdAt || 0);
          
          const dayA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate()).getTime();
          const dayB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate()).getTime();
          
          if (dayA !== dayB) {
            return dayA - dayB;
          }
          
          const createdA = new Date(a.createdAt || a.date || 0).getTime();
          const createdB = new Date(b.createdAt || b.date || 0).getTime();
          
          return createdA - createdB;
        });

        let balance = 0;

        const ledger = history.map((t, index) => {
          const type = String(t?.type || "").toLowerCase();

          let qty = toNum(t?.quantity);
          let unitPrice = t?.unitPrice != null ? toNum(t.unitPrice) : null;

          if (!qty || !unitPrice) {
            const { qty: q2, unit: u2 } = parseQtyUnitFromDesc(t?.description);
            if (!qty && q2) qty = q2;
            if (!unitPrice && u2) unitPrice = u2;
          }

          let lineTotal = toNum(t?.total ?? t?.amount);
          if (!lineTotal && qty && unitPrice != null) {
            lineTotal = qty * unitPrice;
          }

          const debit = type === "debit" ? lineTotal : 0;
          const credit = type === "credit" ? lineTotal : 0;
          balance += credit - debit;

          return {
            ...t,
            _sortIndex: index,
            quantity: qty || null,
            unitPrice: unitPrice != null ? unitPrice : null,
            lineTotal,
            debit,
            credit,
            runningBalance: balance,
          };
        });

        setTransactions(ledger);
        setTotalBalance(balance);
      } catch (err) {
        console.error("Error fetching transaction history:", err);
      }
    };

    fetchTransactions();
  }, [open, customer?._id, API_URL]);

  useEffect(() => {
    if (transactions.length > 0 && tableContainerRef.current) {
      setTimeout(() => {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }, 100);
    }
  }, [transactions]);

  const handleViewImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage(null);
  };

  const downloadPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 87, 34);
    doc.text("Z&Z TRADERS .CO", 148, 12, { align: "center" });
    
    doc.setLineWidth(0.8);
    doc.setDrawColor(255, 87, 34);
    doc.line(110, 15, 186, 15);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`${customer?.username || "CUSTOMER"}`, 14, 15);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Ledger", 14, 22);
    
    doc.setFontSize(10);
    const today = new Date().toLocaleDateString();
    const firstDate = transactions.length > 0 
      ? new Date(transactions[0]?.date || transactions[0]?.createdAt).toLocaleDateString()
      : today;
    doc.text(`From Date: ${firstDate}`, 240, 15);
    doc.text(`To Date: ${today}`, 240, 20);

    const tableColumn = [
      "Date", "Type", "Description", "Quantity", "Rate",
      "Debit", "Credit", "Cheque Date", "Running Balance"
    ];

    const tableRows = transactions.map((tr) => {
      const type = String(tr?.paymentMethod || "CRE").toUpperCase().substring(0, 3);
      const qty = tr?.quantity != null && toNum(tr.quantity) > 0 ? formatNumber(tr.quantity) : "-";
      const rate = tr?.unitPrice != null && toNum(tr.unitPrice) > 0 ? formatNumber(tr.unitPrice) : "-";
      const chequeDate = tr?.chequeDate ? new Date(tr.chequeDate).toLocaleDateString() : "-";
      
      return [
        tr?.date ? new Date(tr.date).toLocaleDateString() : "-",
        type,
        tr?.description || "-",
        qty,
        rate,
        formatNumber(tr?.debit),
        formatNumber(tr?.credit),
        chequeDate,
        formatNumber(tr?.runningBalance),
      ];
    });

    const totalDebit = transactions.reduce((sum, tr) => sum + toNum(tr?.debit), 0);
    const totalCredit = transactions.reduce((sum, tr) => sum + toNum(tr?.credit), 0);

    tableRows.push(["", "", "", "", "Total:", formatNumber(totalDebit), formatNumber(totalCredit), "", ""]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 9 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 65, halign: 'left' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 25, halign: 'right', textColor: [255, 0, 0] },
        6: { cellWidth: 25, halign: 'right', textColor: [0, 128, 0] },
        7: { cellWidth: 22, halign: 'center' },
        8: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: function(data) {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    const finalY = doc.lastAutoTable.finalY || 28;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");

    const purchaseQty = transactions
      .filter(tr => String(tr?.type).toLowerCase() === 'debit')
      .reduce((sum, tr) => sum + toNum(tr?.quantity), 0);
      
    const saleQty = transactions
      .filter(tr => String(tr?.type).toLowerCase() === 'credit')
      .reduce((sum, tr) => sum + toNum(tr?.quantity), 0);

    const finalBalance = totalCredit - totalDebit;

    doc.text(`P.Q: ${formatNumber(purchaseQty)}`, 14, finalY + 10);
    doc.text(`S.Q: ${formatNumber(saleQty)}`, 70, finalY + 10);
    doc.text(`Total Debit: ${formatNumber(totalDebit)}`, 130, finalY + 10);
    doc.text(`Final Balance: ${formatNumber(finalBalance)}`, 200, finalY + 10);

    doc.save(`Ledger_${customer?.username || "customer"}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            width: 1250,
            p: 3,
            mx: "auto",
            mt: 5,
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 1,
            overflow: "auto",
            maxHeight: "90vh",
          }} 
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Ledger for {customer?.username}
          </Typography>

          <TableContainer 
            component={Paper} 
            ref={tableContainerRef}
            sx={{ 
              maxHeight: 320,
              overflow: 'auto',
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: '4px' },
              '&::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '4px' },
              '&::-webkit-scrollbar-thumb:hover': { background: '#555' },
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Payment Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Unit Price</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Line Total</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Debit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Credit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Cheque Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Image</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Running Balance</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#d32f2f', color: 'white', width: 60 }}>Delete</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((row, index) => {
                  const imageUrl = row?.image?.filePath;
                  
                  return (
                    <TableRow key={row._id || index} hover>
                      <TableCell>{row?.date ? new Date(row.date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row?.description || "-"}
                      </TableCell>
                      <TableCell>{row?.paymentMethod || "-"}</TableCell>
                      <TableCell>{row?.quantity != null ? formatNumber(row.quantity) : "-"}</TableCell>
                      <TableCell>{row?.unitPrice != null ? formatNumber(row.unitPrice) : "-"}</TableCell>
                      <TableCell>{formatNumber(row?.lineTotal)}</TableCell>
                      <TableCell sx={{ color: 'red' }}>{formatNumber(row?.debit)}</TableCell>
                      <TableCell sx={{ color: 'green' }}>{formatNumber(row?.credit)}</TableCell>
                      <TableCell>{row?.chequeDate ? new Date(row.chequeDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        {imageUrl ? (
                          <IconButton size="small" color="primary" onClick={() => handleViewImage(imageUrl)} title="View Image">
                            <Visibility />
                          </IconButton>
                        ) : "-"}
                      </TableCell>
                      <TableCell sx={{ color: toNum(row?.runningBalance) >= 0 ? "green" : "red", fontWeight: "bold" }}>
                        {formatNumber(row?.runningBalance)}
                      </TableCell>
                      {/* ✅ NEW: Delete Button */}
                      <TableCell>
                        <Tooltip title="Delete Transaction">
                          <IconButton size="small" color="error" onClick={() => handleDeleteClick(row)}>
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: totalBalance >= 0 ? "green" : "red" }}>
              Total Balance: {formatNumber(totalBalance)}
            </Typography>

            <Box>
              <Button variant="contained" color="secondary" onClick={downloadPDF} sx={{ mr: 2 }}>
                Download PDF
              </Button>
              <Button variant="contained" color="primary" onClick={onClose}>
                Close
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* Image Preview Modal */}
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
            <img src={selectedImage} alt="Transaction" style={{ width: "100%", height: "auto", display: "block" }} />
          )}
          <Button variant="contained" color="primary" onClick={handleCloseImageModal} sx={{ mt: 2, display: "block", mx: "auto" }}>
            Close
          </Button>
        </Box>
      </Modal>

      {/* ✅ NEW: Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle sx={{ color: '#d32f2f' }}>⚠️ Delete Transaction</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this transaction?
            <br /><br />
            <strong>Amount:</strong> Rs {formatNumber(transactionToDelete?.lineTotal || transactionToDelete?.amount || 0)}
            <br />
            <strong>Type:</strong> {transactionToDelete?.type?.toUpperCase() || "-"}
            <br />
            <strong>Method:</strong> {transactionToDelete?.paymentMethod || "-"}
            <br />
            <strong>Description:</strong> {transactionToDelete?.description || "-"}
            <br /><br />
            <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
              This will reverse the customer balance and delete related records from History, Cheques, Bank, and Cash.
            </span>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDeleteDialog} variant="outlined" disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained" 
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <Delete />}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TransactionHistoryModal;
