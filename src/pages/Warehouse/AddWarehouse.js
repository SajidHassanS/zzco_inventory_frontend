import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Container
} from "@mui/material";

const AddExpense = () => {
  // State to control the dialog visibility
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // State to handle form input values
  const [expense, setExpense] = useState({
    expenseName: "",
    amount: "",
    description: "",
    expenseDate: ""
  });
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const API_URL = `${BACKEND_URL}api`;

  // Function to handle input changes
  const handleInputChange = e => {
    const { name, value } = e.target;
    setExpense(prevExpense => ({
      ...prevExpense,
      [name]: value
    }));
  };

  // Function to handle form submission
  const addExpense = () => {
    fetch(`${API_URL}/expenses/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(expense)
    })
      .then(response => response.json())
      .then(() => {
        alert("Expense Added");
        setShowExpenseModal(false); // Close the modal after adding
      })
      .catch(error => {
        console.error("Error:", error);
        alert("Failed to add expense. Please try again.");
      });
  };

  // Function to toggle the modal visibility
  const toggleExpenseModal = () => {
    setShowExpenseModal(!showExpenseModal);
  };

  return (
    <Container>
      <Button
        variant="contained"
        color="primary"
        onClick={toggleExpenseModal}
        sx={{ mb: 2 }}
      >
        Add Expense
      </Button>

      {/* Single dialog for adding expense */}
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
