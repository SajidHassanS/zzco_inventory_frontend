import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  Modal
} from '@mui/material';
import { getPendingCheques, updateChequeStatus } from '../../redux/features/cheque/chequeSlice';

import CustomTable from '../../components/CustomTable/CustomTable';
const API_URL  = process.env.REACT_APP_BACKEND_URL;
  
const baseUrl = `${API_URL}`; // Base URL for the image path

const ChequeDetails = () => {
  const dispatch = useDispatch();
  const cheques = useSelector((state) => state.cheque.cheques);
  const isLoading = useSelector((state) => state.cheque.isLoading);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [todayCheques, setTodayCheques] = useState([]);
  const [upcomingCheques, setUpcomingCheques] = useState([]);
  const [selectedCheques, setSelectedCheques] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null); // State to manage the selected image
  console.log("cheques",cheques);

  useEffect(() => {
    dispatch(getPendingCheques());
  }, [dispatch]);
  useEffect(() => {
    if (cheques) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const chequesToday = [];
      const chequesUpcoming = [];

      cheques.forEach(cheque => {
        const chequeDate = new Date(cheque.chequeDate);
        chequeDate.setHours(0, 0, 0, 0);
        
        const timeDiff = chequeDate.getTime() - today.getTime();
        const dayDiff = timeDiff / (1000 * 3600 * 24);

        if (dayDiff === 0) {
          chequesToday.push(cheque);
        } else if (dayDiff > 0 && dayDiff <= 7) {
          chequesUpcoming.push(cheque);
        }
      });

      setTodayCheques(chequesToday);
      setUpcomingCheques(chequesUpcoming);
    }
  }, [cheques]);
  const handleStatusChange = (chequeId, isChecked) => {
    if (isChecked) {
      setSelectedCheques(prev => [...prev, chequeId]);
    } else {
      setSelectedCheques(prev => prev.filter(id => id !== chequeId));
    }
  };
  const handleSubmit = () => {

    selectedCheques.forEach(chequeId => {
      const cheque = cheques.find(c => c._id === chequeId);
      dispatch(updateChequeStatus({ id: chequeId, status: true, type: cheque.type ,amount:cheque.amount,bank:cheque.bank}));
    });
    setSelectedCheques([]);
    dispatch(getPendingCheques()); // Fetch updated cheques after submission
  };
  // const handleStatusChange = (chequeId, newStatus, type) => {
  //   dispatch(updateChequeStatus({ id: chequeId, status: newStatus, type }));
  // };
  const handleCloseModal = () => {
    setSelectedImage(null);
  };
  const columns = [
    { field: 'chequeDate', headerName: 'Date', renderCell: (row) => new Date(row.chequeDate).toLocaleDateString() },
    { field: 'name', headerName: 'Name' },
    { field: 'type', headerName: 'Type' },
    // { field: 'status', headerName: 'Current Status' },
    { 
      field: 'statusChange', 
      headerName: 'Select', 
      renderCell: (row) => (
        <Checkbox
          checked={selectedCheques.includes(row._id)}
          onChange={(e) => handleStatusChange(row._id, e.target.checked)}
        />
      )
    },
    { 
      field: 'view', 
      headerName: 'View', 
      renderCell: (row) => (
        <Button 
          variant="outlined" 
          onClick={() => setSelectedImage(baseUrl+row.chequeImage.filePath)} // Use filePath for the image
        >
          View
        </Button>
      )
    },
  ];

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Pending Cheque Details
      </Typography>
      <Stack spacing={2} sx={{ mb: 2 }}>
        {todayCheques.length > 0 && (
          <Alert severity="warning">
            <AlertTitle>Cheques Due Today</AlertTitle>
            You have {todayCheques.length} cheque(s) due for cash today:
            <List dense>
              {todayCheques.map((cheque) => (
                <ListItem key={cheque._id}>
                  <ListItemText
                    primary={`${cheque.name} - ${cheque.type}`}
                    // secondary={`Amount: ${cheque.amount}, Status: ${cheque.status}`}
                  />
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
          data={cheques || []}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
        <Button
        variant="contained" 
        color="primary" 
        onClick={handleSubmit} 
        disabled={selectedCheques.length === 0}
        sx={{ mt: 2 }}
      >
        Cash Out Selected Cheques ({selectedCheques.length})
      </Button>
      </Paper>
      <Modal
        open={Boolean(selectedImage)}
        onClose={handleCloseModal}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', position: 'relative' }}>
          <img src={selectedImage} alt="Cheque" style={{ maxWidth: '90%', maxHeight: '90%',  }} />
          <Button onClick={handleCloseModal} style={{ position: 'absolute', top: 20, right: 20, zIndex: 1 ,backgroundColor:'black',color:"white"}}>Close</Button>
        </div>
      </Modal>
    </div>
  );
};

export default ChequeDetails;