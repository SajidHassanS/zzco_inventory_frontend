import React, { useState } from "react";
import "./Sidebar.scss";
import { HiMenuAlt3 } from "react-icons/hi";
import { RiProductHuntLine } from "react-icons/ri";
import menu from "../../data/sidebar";
import SidebarItem from "./SidebarItem";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png"; 
const Sidebar = ({ children }) => {
  const [isOpen, setIsOpen] = useState(true);
  const toggle = () => setIsOpen(!isOpen);
  const navigate = useNavigate();

  const goHome = () => {
    navigate("/");
  };

  return (
    <div className="layout">
      <div className="sidebar" style={{ width: isOpen ? "230px" : "60px" }}>
        <div className="top_section">
        <div className="logo" style={{ display: isOpen ? "block" : "none" }}>
            <img 
              src={logo} 
              alt="Logo" 
              style={{
                cursor: "pointer",
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid #fff",
                boxShadow: "0 0 10px rgba(0,0,0,0.1)"
              }}
              onClick={goHome}
            />
          </div>

          <div
            className="bars"
            style={{ marginLeft: isOpen ? "100px" : "0px" }}
          >
            <HiMenuAlt3 onClick={toggle} />
          </div>
        </div>
        {menu.map((item, index) => {
          return <SidebarItem key={index} item={item} isOpen={isOpen} />;
        })}
      </div>

      <main
        style={{
          paddingLeft: isOpen ? "230px" : "60px",
          transition: "all .5s",
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default Sidebar;
