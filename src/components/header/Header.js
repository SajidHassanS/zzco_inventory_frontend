import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectUserRole, SET_LOGIN, SET_ROLE } from "../../redux/features/auth/authSlice";
import { logoutUser } from "../../services/authService";

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Fetch userRole from Redux state
  const userRole = useSelector(selectUserRole);

  // Fetch userRole from localStorage if Redux state doesn't have it
  useEffect(() => {
    const storedRole = localStorage.getItem("userRole");
    console.log("Stored role from localStorage:", storedRole); // Debugging line

    if (storedRole && userRole !== storedRole) {
      dispatch(SET_ROLE(storedRole)); // Update Redux state with stored role
    }
  }, [dispatch, userRole]);

  const logout = async () => {
    await logoutUser();
    localStorage.removeItem("userRole"); // Clear role from localStorage on logout
    dispatch(SET_LOGIN(false));
    dispatch(SET_ROLE("")); // Clear role from Redux state
    navigate("/login");
  };

  return (
    <div className="--pad header">
      <div className="--flex-between">
        <h3>
          <span className="--fw-thin">Welcome, </span>
          <span className="--color-danger">{userRole || "User"}</span> {/* Default to "User" if role is missing */}
        </h3>
        <button onClick={logout} className="--btn --btn-danger">
          Logout
        </button>
      </div>
      <hr />
    </div>
  );
};

export default Header;
