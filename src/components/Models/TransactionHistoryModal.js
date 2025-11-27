import React, { useEffect, useState } from "react";
import { Modal, Box, Typography, Button, IconButton } from "@mui/material";
import { Visibility } from "@mui/icons-material";
import axios from "axios";
import CustomTable from "../CustomTable/CustomTable";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Fallback: parse "Sale: 10 x house @ 200 = 2000"
function parseQtyUnitFromDesc(desc) {
  const s = String(desc || "");
  const m = s.match(/(\d+)\s*[x×]\s.*?@\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (!m) return { qty: null, unit: null };
  return { qty: Number(m[1]), unit: Number(m[2]) };
}

const TransactionHistoryModal = ({ open, onClose, customer }) => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalBalance, setTotalBalance] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api/customers`;

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

        // ✅ IMPROVED SORTING: Sort by date first, then by createdAt for same-day transactions
        history = history.sort((a, b) => {
          // Get the primary date (transaction date)
          const dateA = new Date(a.date || a.createdAt || 0);
          const dateB = new Date(b.date || b.createdAt || 0);
          
          // Compare dates first (day level)
          const dayA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate()).getTime();
          const dayB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate()).getTime();
          
          if (dayA !== dayB) {
            return dayA - dayB; // Sort by date (oldest first)
          }
          
          // ✅ If same day, sort by createdAt (actual creation time)
          const createdA = new Date(a.createdAt || a.date || 0).getTime();
          const createdB = new Date(b.createdAt || b.date || 0).getTime();
          
          return createdA - createdB; // Sort by creation time (oldest first)
        });

        console.log("📅 SORTED CUSTOMER HISTORY (oldest first, by date + createdAt):", history);

        let balance = 0;

        const ledger = history.map((t, index) => {
          const type = String(t?.type || "").toLowerCase();

          // prefer explicit fields if present
          let qty = toNum(t?.quantity);
          let unitPrice = t?.unitPrice != null ? toNum(t.unitPrice) : null;

          // parse from description if needed (old rows)
          if (!qty || !unitPrice) {
            const { qty: q2, unit: u2 } = parseQtyUnitFromDesc(t?.description);
            if (!qty && q2) qty = q2;
            if (!unitPrice && u2) unitPrice = u2;
          }

          // compute total: prefer total/amount, else qty*unit
          let lineTotal = toNum(t?.total ?? t?.amount);
          if (!lineTotal && qty && unitPrice != null) {
            lineTotal = qty * unitPrice;
          }

          // ✅ For customers: CREDIT increases balance, DEBIT decreases
          const debit = type === "debit" ? lineTotal : 0;
          const credit = type === "credit" ? lineTotal : 0;
          balance += credit - debit;

          return {
            ...t,
            _sortIndex: index, // ✅ Keep track of sort order
            quantity: qty || null,
            unitPrice: unitPrice != null ? unitPrice : null,
            lineTotal,
            debit,
            credit,
            runningBalance: balance,
          };
        });

        console.log("✅ PROCESSED CUSTOMER LEDGER (with running balance):", ledger);

        setTransactions(ledger);
        setTotalBalance(balance);
      } catch (err) {
        console.error("Error fetching transaction history:", err);
      }
    };

    fetchTransactions();
  }, [open, customer?._id, API_URL]);

  // Handle image view
  const handleViewImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage(null);
  };

  // ✅ Pagination handlers
  const handlePageChange = (nextPage) => {
    setPage(Math.max(0, Number(nextPage) || 0));
  };

  const handleRowsPerPageChange = (nextRpp) => {
    setRowsPerPage(Number(nextRpp) || 5);
    setPage(0);
  };

  // PDF export with professional formatting and Z&Z TRADERS logo
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
      "Date",
      "Type",
      "Description",
      "Quantity",
      "Rate",
      "Debit",
      "Credit",
      "Cheque Date",
      "Running Balance"
    ];

    const tableRows = transactions.map((tr) => {
      const type = String(tr?.paymentMethod || "CRE").toUpperCase().substring(0, 3);
      const qty = tr?.quantity != null && toNum(tr.quantity) > 0 ? toNum(tr.quantity).toFixed(2) : "-";
      const rate = tr?.unitPrice != null && toNum(tr.unitPrice) > 0 ? toNum(tr.unitPrice).toFixed(2) : "-";
      const chequeDate = tr?.chequeDate ? new Date(tr.chequeDate).toLocaleDateString() : "-";
      
      return [
        tr?.date ? new Date(tr.date).toLocaleDateString() : "-",
        type,
        tr?.description || "-",
        qty,
        rate,
        toNum(tr?.debit).toFixed(2),
        toNum(tr?.credit).toFixed(2),
        chequeDate,
        toNum(tr?.runningBalance).toFixed(2),
      ];
    });

    const totalDebit = transactions.reduce((sum, tr) => sum + toNum(tr?.debit), 0);
    const totalCredit = transactions.reduce((sum, tr) => sum + toNum(tr?.credit), 0);
    
    tableRows.push([
      "",
      "",
      "",
      "",
      "Total:",
      totalDebit.toFixed(2),
      totalCredit.toFixed(2),
      "",
      ""
    ]);

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
      styles: {
        overflow: 'linebreak',
        cellWidth: 'wrap'
      }
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

    doc.text(`P.Q: ${purchaseQty.toFixed(2)}`, 14, finalY + 10);
    doc.text(`S.Q: ${saleQty.toFixed(2)}`, 70, finalY + 10);
    doc.text(`Total Debit: ${totalDebit.toFixed(2)}`, 130, finalY + 10);
    doc.text(`Final Balance: ${finalBalance.toFixed(2)}`, 200, finalY + 10);

    doc.save(`Ledger_${customer?.username || "customer"}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Table columns
  const columns = [
    {
      field: "date",
      headerName: "Date",
      renderCell: (row) => (row?.date ? new Date(row.date).toLocaleDateString() : "-"),
    },
    { 
      field: "description", 
      headerName: "Description", 
      renderCell: (row) => row?.description || "-" 
    },
    { 
      field: "paymentMethod", 
      headerName: "Payment Type" 
    },
    { 
      field: "quantity", 
      headerName: "Qty", 
      renderCell: (row) => (row?.quantity != null ? row.quantity : "-") 
    },
    { 
      field: "unitPrice", 
      headerName: "Unit Price", 
      renderCell: (row) => (row?.unitPrice != null ? toNum(row.unitPrice).toFixed(2) : "-") 
    },
    { 
      field: "lineTotal", 
      headerName: "Line Total", 
      renderCell: (row) => toNum(row?.lineTotal).toFixed(2) 
    },
    { 
      field: "debit", 
      headerName: "Debit", 
      renderCell: (row) => <span style={{ color: "red" }}>{toNum(row?.debit).toFixed(2)}</span> 
    },
    { 
      field: "credit", 
      headerName: "Credit", 
      renderCell: (row) => <span style={{ color: "green" }}>{toNum(row?.credit).toFixed(2)}</span> 
    },
    {
      field: "chequeDate",
      headerName: "Cheque Date",
      renderCell: (row) => (row?.chequeDate ? new Date(row.chequeDate).toLocaleDateString() : "-"),
    },
    {
      field: "image",
      headerName: "Image",
      renderCell: (row) => {
        const imageUrl = row?.image?.filePath;
        return imageUrl ? (
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleViewImage(imageUrl)}
            title="View Image"
          >
            <Visibility />
          </IconButton>
        ) : (
          "-"
        );
      },
    },
    { 
      field: "runningBalance", 
      headerName: "Running Balance", 
      renderCell: (row) => (
        <span style={{ 
          color: toNum(row?.runningBalance) >= 0 ? "green" : "red",
          fontWeight: "bold" 
        }}>
          {toNum(row?.runningBalance).toFixed(2)}
        </span>
      )
    },
  ];

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            width: 1200,
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

          <CustomTable
            columns={columns}
            data={transactions}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ fontWeight: "bold", color: totalBalance >= 0 ? "green" : "red" }}
            >
              Total Balance: {toNum(totalBalance).toFixed(2)}
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
            <img
              src={selectedImage}
              alt="Transaction"
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

export default TransactionHistoryModal;