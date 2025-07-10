import { createSlice } from "@reduxjs/toolkit";

// Retrieve userRole from localStorage as a simple string
let userRole = "";
try {
  const storedRole = localStorage.getItem("userRole");
  if (storedRole) {
    userRole = storedRole;
  }
} catch (error) {
  console.warn("Error accessing localStorage:", error);
}

const initialState = {
  isLoggedIn: false,
  userRole,
  user: {
    name: "",
    email: "",
    phone: "",
    bio: "",
    photo: "",
    privileges: {},
  },
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    SET_LOGIN(state, action) {
      state.isLoggedIn = action.payload;
    },
    SET_ROLE(state, action) {
      const role = action.payload;
      try {
        localStorage.setItem("userRole", role);
      } catch (error) {
        console.warn("Failed to store userRole in localStorage:", error);
      }
      state.userRole = role;
      state.user.userRole = role;
    },
    SET_USER(state, action) {
      const profile = action.payload;
      state.user = { ...state.user, ...profile };
    },
  },
});

export const { SET_LOGIN, SET_ROLE, SET_USER } = authSlice.actions;

// Selectors
export const selectIsLoggedIn = (state) => state.auth.isLoggedIn;
export const selectUserRole = (state) => state.auth.userRole || "User";
export const selectUser = (state) => state.auth.user;

// Selector to check if the user has deletion privileges
export const selectCanDelete = (state) => {
  const isAdmin = state.auth.userRole === "Admin"; // Check if userRole is Admin
  return isAdmin || state.auth.user.privileges?.canDelete === true; // Admins or users with canDelete privilege can delete
};

export default authSlice.reducer;
