import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Grid,
  Container,
} from "@mui/material";
import { getBanks } from "../../redux/features/Bank/bankSlice";
import { toast, ToastContainer } from "react-toastify";

const AddExpense = () => {
  const dispatch = useDispatch();

  // ✅ Fetch Banks from Redux
  const banks = useSelector((state) => state.bank.banks);

  // ✅ State to control the dialog visibility
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // ✅ State to handle form input values
  const [expense, setExpense] = useState({
    expenseName: "",
    amount: "",
    description: "",
    expenseDate: "",
    paymentMethod: "",
    chequeDate: "",
    bankID: "",
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}api`;

  // ✅ Fetch Banks when the component loads
  useEffect(() => {
    dispatch(getBanks());
  }, [dispatch]);

  // ✅ Handle Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setExpense((prevExpense) => ({
      ...prevExpense,
      [name]: value,
    }));

    // ✅ Auto-fill expenseDate when Cash or Credit is selected
    if (name === "paymentMethod" && (value === "cash" || value === "credit")) {
      setExpense((prevExpense) => ({
        ...prevExpense,
        expenseDate: new Date().toISOString().split("T")[0], // Get current date
      }));
    }
  };

  // ✅ Handle Form Submission
  const addExpense = () => {
    if (!expense.expenseName || !expense.amount || !expense.paymentMethod) {
      toast.error("Please fill all required fields!");
      return;
    }

    const expenseData = {
      ...expense,
      amount: parseFloat(expense.amount), // Ensure amount is a number
    };

    fetch(`${API_URL}/expenses/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expenseData),
    })
      .then((response) => response.json())
      .then(() => {
        toast.success("Expense Added Successfully!");
        setShowExpenseModal(false); // Close modal
      })
      .catch((error) => {
        console.error("Error:", error);
        toast.error("Failed to add expense. Please try again.");
      });
  };

  // ✅ Toggle Modal
  const toggleExpenseModal = () => {
    setShowExpenseModal(!showExpenseModal);
  };

  return (
    <Container>
      <ToastContainer />
      <Button
        variant="contained"
        color="primary"
        onClick={toggleExpenseModal}
        sx={{ mb: 2 }}
      >
        Add Expense
      </Button>

      {/* ✅ Expense Modal */}
      <Dialog
        open={showExpenseModal}
        onClose={toggleExpenseModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent>
          <form>
            <Grid container spacing={2}>
              {/* ✅ Expense Name */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Expense Name"
                  name="expenseName"
                  value={expense.expenseName}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>

              {/* ✅ Amount */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  name="amount"
                  value={expense.amount}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>

              {/* ✅ Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={expense.description}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                  margin="normal"
                />
              </Grid>

              {/* ✅ Payment Method Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    name="paymentMethod"
                    value={expense.paymentMethod}
                    onChange={handleInputChange}
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="cheque">Cheque</MenuItem>
                    <MenuItem value="online">Online</MenuItem>
                    <MenuItem value="credit">Credit</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* ✅ Bank Selection for Online/Cheque */}
              {(expense.paymentMethod === "cheque" ||
                expense.paymentMethod === "online") && (
                <Grid item xs={12}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Bank Name</InputLabel>
                    <Select
                      name="bankID"
                      value={expense.bankID}
                      onChange={handleInputChange}
                    >
                      {banks.map((bank) => (
                        <MenuItem key={bank._id} value={bank._id}>
                          {bank.bankName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* ✅ Cheque Date for Cheque Payment */}
              {expense.paymentMethod === "cheque" && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Cheque Date"
                    type="date"
                    name="chequeDate"
                    value={expense.chequeDate}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                    margin="normal"
                  />
                </Grid>
              )}

              {/* ✅ Expense Date (Auto-filled when Cash/Credit is selected) */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Expense Date"
                  type="date"
                  name="expenseDate"
                  value={expense.expenseDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  margin="normal"
                  disabled={
                    expense.paymentMethod === "cash" ||
                    expense.paymentMethod === "credit"
                  }
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" onClick={addExpense}>
            Add Expense
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={toggleExpenseModal}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AddExpense;
