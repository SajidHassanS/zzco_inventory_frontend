import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  selectUserName,
  SET_LOGIN,
  SET_ROLE,
  SET_NAME
} from "../../redux/features/auth/authSlice";
import { logoutUser } from "../../services/authService";

// Helper function to capitalize first letter
const capitalize = str => {
  if (!str) return "User";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const userName = useSelector(selectUserName);

  useEffect(
    () => {
      const storedName = localStorage.getItem("userName");
      if (storedName && userName !== storedName) {
        dispatch(SET_NAME(storedName));
      }
    },
    [dispatch, userName]
  );

  const logout = async () => {
    await logoutUser();
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    dispatch(SET_LOGIN(false));
    dispatch(SET_ROLE(""));
    dispatch(SET_NAME(""));
    navigate("/login");
  };

  return (
    <div className="--pad header">
      <div className="--flex-between">
        <h3>
          <span className="--fw-thin">Welcome, </span>
          <span className="--color-danger">
            {capitalize(userName)}
          </span>
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
