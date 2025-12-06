// src/components/Models/SupplierTransactionHistoryModal.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { Modal, Box, Typography, Button, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";
import { Visibility } from "@mui/icons-material";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SupplierTransactionHistoryModal = ({ open, onClose, supplier }) => {
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Ref for auto-scrolling to bottom
  const tableContainerRef = useRef(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api/suppliers`;

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
// Add this helper for comma formatting
const formatNumber = (num) => {
  return toNum(num).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
  // Parse qty from flexible description patterns
  const parseQtyFromDesc = (desc) => {
    const s = String(desc || "");
    let m = s.match(/(\d+)\s*[x×]\s/i);
    if (m) return Number(m[1]);
    m = s.match(/qty(?:uantity)?\s*[:\-]?\s*(\d+)/i);
    if (m) return Number(m[1]);
    m = s.match(/(\d+)\s*(pcs?|pieces?|units?|bags?|boxes?|kg|kilograms?|lts?|liters?)/i);
    if (m) return Number(m[1]);
    m = s.match(/(\d+)\s*@\s*\d+(?:[.,]\d+)?/i);
    if (m) return Number(m[1]);
    m = s.match(/\(?\s*qty\s*[:\-]?\s*(\d+)\s*\)?/i);
    if (m) return Number(m[1]);
    return 0;
  };

  const normalizeQty = (t) => {
    const direct =
      toNum(t?.quantity) ||
      toNum(t?.qty) ||
      toNum(t?.stockSold) ||
      toNum(t?.units) ||
      toNum(t?.count);
    if (direct > 0) return direct;
    return parseQtyFromDesc(t?.description);
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

  // ✅ Helper to extract image URL from any object structure
  const extractImageUrl = (obj) => {
    if (!obj) return null;
    
    // Try direct access
    if (typeof obj === 'string') return obj;
    if (obj.filePath) return obj.filePath;
    if (obj.imageFilePath) return obj.imageFilePath;
    
    // Try _doc property (Mongoose)
    if (obj._doc) {
      if (obj._doc.filePath) return obj._doc.filePath;
      if (obj._doc.imageFilePath) return obj._doc.imageFilePath;
    }
    
    // Try bracket notation
    if (obj['filePath']) return obj['filePath'];
    if (obj['imageFilePath']) return obj['imageFilePath'];
    
    return null;
  };

  // Fetch & build running ledger
  useEffect(() => {
    if (!open || !supplier?._id) return;
    
    const fetchTransactions = async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/${supplier._id}/transaction-history`,
          { withCredentials: true }
        );

        let history = Array.isArray(data?.transactionHistory)
          ? data.transactionHistory
          : [];

        console.log("📦 RAW TRANSACTION HISTORY FROM API:", history);

        // ✅ SORT by date (oldest first) to calculate running balance correctly
        history = history.sort((a, b) => {
          const dateA = new Date(a.date || a.createdAt || 0);
          const dateB = new Date(b.date || b.createdAt || 0);
          return dateA - dateB; // Ascending order (oldest first)
        });

        console.log("📅 SORTED HISTORY (oldest first):", history);

        let balance = 0;
        const ledger = history.map((t, idx) => {
          const type = String(t?.type || "").toLowerCase();
          const amount = toNum(t?.amount);
          
          // ✅ For suppliers: CREDIT increases balance (payment received), DEBIT decreases (purchase made)
          const debit = type === "debit" ? amount : 0;
          const credit = type === "credit" ? amount : 0;
          balance += credit - debit;

          const quantity = normalizeQty(t);

          // ✅ DEBUG: Log transferred cheques
          if (t.description?.toLowerCase().includes("transferred")) {
            console.log("🔍 TRANSFERRED TRANSACTION:", {
              date: t.date,
              description: t.description,
              type: type,
              amount: amount,
              debit: debit,
              credit: credit,
              runningBalance: balance,
              image: t.image,
              chequeImage: t.chequeImage,
            });
          }

          // ✅ Try to convert to plain object for better access
          let plainT;
          try {
            plainT = JSON.parse(JSON.stringify(t));
          } catch (e) {
            plainT = { ...t };
          }

          return {
            id: plainT._id || t._id || idx,
            ...plainT,
            quantity,
            debit,
            credit,
            runningBalance: balance,
            // ✅ Preserve original objects for image access
            _originalImage: t.image,
            _originalChequeImage: t.chequeImage,
          };
        });

        console.log("✅ PROCESSED LEDGER (with running balance):", ledger);
        
        // ✅ Keep chronological order (oldest to newest) for display
        setTransactions(ledger); // No reverse!
        setTotalBalance(balance);
      } catch (err) {
        console.error("Error fetching supplier transaction history:", err);
      }
    };

    fetchTransactions();
  }, [open, supplier?._id, API_URL]);

  // ✅ Auto-scroll to bottom when transactions load (to show last 5)
  useEffect(() => {
    if (transactions.length > 0 && tableContainerRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }, 100);
    }
  }, [transactions]);

 // ✅ Professional PDF download with Z&Z TRADERS logo
const downloadPDF = () => {
  const doc = new jsPDF('landscape');
  
  // ✅ COMPANY LOGO/HEADER - ORANGE COLOR
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 87, 34); // ✅ Orange/Red color (matching Admin logo)
  doc.text("Z&Z TRADERS .CO", 148, 12, { align: "center" });
  
  // Decorative line under logo
  doc.setLineWidth(0.8);
  doc.setDrawColor(255, 87, 34); // ✅ Orange/Red color
  doc.line(110, 15, 186, 15);
  
  // ✅ Supplier name
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`${supplier?.username || "SUPPLIER"}`, 14, 15);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Ledger", 14, 22);
  
  // ✅ Date range
  doc.setFontSize(10);
  const today = new Date().toLocaleDateString();
  const firstDate = transactions.length > 0 
    ? new Date(transactions[0]?.date || transactions[0]?.createdAt).toLocaleDateString()
    : today;
  doc.text(`From Date: ${firstDate}`, 240, 15);
  doc.text(`To Date: ${today}`, 240, 20);

  // ✅ Table columns
  const tableColumn = [
    "Date",
    "Type",
    "Product Name",
    "Description",
    "Quantity",
    "Debit",
    "Credit",
    "Cheque Date",
    "Running Balance"
  ];

const tableRows = transactions.map((tr) => {
  const type = String(tr?.paymentMethod || "").toUpperCase().substring(0, 3);
  const qty = tr?.quantity != null && toNum(tr.quantity) > 0 ? formatNumber(tr.quantity) : "-";
  const chequeDate = tr?.chequeDate ? new Date(tr.chequeDate).toLocaleDateString() : "-";
  
  return [
    tr?.date ? new Date(tr.date).toLocaleDateString() : "-",
    type,
    tr?.productName || "-",
    tr?.description || "-",
    qty,
    formatNumber(tr?.debit),
    formatNumber(tr?.credit),
    chequeDate,
    formatNumber(tr?.runningBalance),
  ];
});

// ✅ Add totals row
const totalDebit = transactions.reduce((sum, tr) => sum + toNum(tr?.debit), 0);
const totalCredit = transactions.reduce((sum, tr) => sum + toNum(tr?.credit), 0);

tableRows.push([
  "",
  "",
  "",
  "",
  "Total:",
  formatNumber(totalDebit),
  formatNumber(totalCredit),
  "",
  ""
]);

  // ✅ Professional table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 28,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },   // Date
      1: { cellWidth: 15, halign: 'center' },   // Type
      2: { cellWidth: 30, halign: 'left' },     // Product Name
      3: { cellWidth: 60, halign: 'left' },     // Description
      4: { cellWidth: 20, halign: 'right' },    // Quantity
      5: { cellWidth: 25, halign: 'right', textColor: [255, 0, 0] },  // Debit (red)
      6: { cellWidth: 25, halign: 'right', textColor: [0, 128, 0] },  // Credit (green)
      7: { cellWidth: 22, halign: 'center' },   // Cheque Date
      8: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }        // Running Balance
    },
    didParseCell: function(data) {
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
    styles: {
      overflow: 'linebreak',
      cellWidth: 'wrap'
    }
  });

  const finalY = doc.lastAutoTable.finalY || 28;
  
  // ✅ Summary
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

  doc.save(`Supplier_Ledger_${supplier?.username || "supplier"}_${new Date().toISOString().split('T')[0]}.pdf`);
};

  // ✅ Get image URL for a row
  const getImageUrl = (row) => {
    let imageUrl = extractImageUrl(row.image) || extractImageUrl(row.chequeImage);
    if (!imageUrl) {
      imageUrl = extractImageUrl(row._originalImage) || extractImageUrl(row._originalChequeImage);
    }
    return imageUrl;
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            width: 1100,
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
            Ledger for {supplier?.username}
          </Typography>

          {/* ✅ Scrollable Table Container - Shows ~5 rows, scrolls to bottom */}
          <TableContainer 
            component={Paper} 
            ref={tableContainerRef}
            sx={{ 
              maxHeight: 320, // ~5 rows height (adjust as needed)
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
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Product Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Payment Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Debit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Credit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Cheque Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Image</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white' }}>Running Balance</TableCell>
                </TableRow>
              </TableHead>
             <TableBody>
  {transactions.map((row, index) => {
    const imageUrl = getImageUrl(row);
    const productName = row?.productName;
    const displayProductName = (productName === supplier?.username || productName === supplier?.name) ? "-" : (productName || "-");
    const pm = String(row?.paymentMethod || "");
    const displayPaymentMethod = pm ? pm.charAt(0).toUpperCase() + pm.slice(1).toLowerCase() : "-";
    
    return (
      <TableRow key={row.id || index} hover>
        <TableCell>{row?.date ? new Date(row.date).toLocaleDateString() : "-"}</TableCell>
        <TableCell>{displayProductName}</TableCell>
        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row?.description || "-"}
        </TableCell>
        <TableCell>{toNum(row?.quantity) > 0 ? formatNumber(row.quantity) : "-"}</TableCell>
        <TableCell>{displayPaymentMethod}</TableCell>
        <TableCell sx={{ color: 'red' }}>{formatNumber(row?.debit)}</TableCell>
        <TableCell sx={{ color: 'green' }}>{formatNumber(row?.credit)}</TableCell>
        <TableCell>{row?.chequeDate ? new Date(row.chequeDate).toLocaleDateString() : "-"}</TableCell>
        <TableCell>
          {imageUrl ? (
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleViewImage(imageUrl)}
              title="View Image"
            >
              <Visibility />
            </IconButton>
          ) : "-"}
        </TableCell>
        <TableCell sx={{ 
          color: toNum(row?.runningBalance) >= 0 ? "green" : "red",
          fontWeight: "bold" 
        }}>
          {formatNumber(row?.runningBalance)}
        </TableCell>
      </TableRow>
    );
  })}
</TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
            <Typography
  variant="subtitle1"
  sx={{ fontWeight: "bold", color: totalBalance >= 0 ? "green" : "red" }}
>
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
              alt="Cheque"
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

export default SupplierTransactionHistoryModal;
