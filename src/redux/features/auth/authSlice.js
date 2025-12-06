import { createSlice } from "@reduxjs/toolkit";

// Retrieve userRole and userName from localStorage
let userRole = "";
let userName = "";
try {
  const storedRole = localStorage.getItem("userRole");
  const storedName = localStorage.getItem("userName");
  if (storedRole) {
    userRole = storedRole;
  }
  if (storedName) {
    userName = storedName;
  }
} catch (error) {
  console.warn("Error accessing localStorage:", error);
}

const initialState = {
  isLoggedIn: false,
  userRole,
  userName, // Add this
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
    // Add SET_NAME reducer
    SET_NAME(state, action) {
      const name = action.payload;
      try {
        localStorage.setItem("userName", name);
      } catch (error) {
        console.warn("Failed to store userName in localStorage:", error);
      }
      state.userName = name;
      state.user.name = name;
    },
    SET_USER(state, action) {
      const profile = action.payload;
      state.user = { ...state.user, ...profile };
      // Also update userName when user profile is set
      if (profile.name) {
        state.userName = profile.name;
        try {
          localStorage.setItem("userName", profile.name);
        } catch (error) {
          console.warn("Failed to store userName in localStorage:", error);
        }
      }
    },
  },
});

export const { SET_LOGIN, SET_ROLE, SET_NAME, SET_USER } = authSlice.actions;

// Selectors
export const selectIsLoggedIn = (state) => state.auth.isLoggedIn;
export const selectUserRole = (state) => state.auth.userRole || "User";
export const selectUserName = (state) => state.auth.userName || "User"; // Add this
export const selectUser = (state) => state.auth.user;

// Selector to check if the user has deletion privileges
export const selectCanDelete = (state) => {
  const isAdmin = state.auth.userRole === "Admin";
  return isAdmin || state.auth.user.privileges?.canDelete === true;
};

export default authSlice.reducer;