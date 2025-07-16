import { FaTh, FaRegChartBar, FaCommentAlt } from "react-icons/fa";
import { BiImageAdd } from "react-icons/bi";
import { IoPersonAdd } from "react-icons/io5";
import { GrUserManager } from "react-icons/gr";
import { FaBookMedical } from "react-icons/fa";
import { MdOutlineProductionQuantityLimits } from "react-icons/md";
import { FaCartPlus } from "react-icons/fa";
import { BsCartDashFill } from "react-icons/bs";
import { MdAccountBalance } from "react-icons/md";
import { FaWarehouse } from "react-icons/fa6";
import { FaMoneyCheckDollar } from "react-icons/fa6";

const menu = [
  {
    title: "Dashboard",
    icon: <FaTh />,
    path: "/dashboard"
  },
  {
    title: "Customer Detail",
    icon: <IoPersonAdd />,
    path: "/add-customer"
  },
  {
    title: "Supplier Detail",
    icon: <IoPersonAdd />,
    path: "/add-supplier"
  },
  {
    title: "Buying Product",
    icon: <FaCartPlus />,
    path: "/add-product"
  },
  {
    title: "Sale Product",
    icon: <BsCartDashFill />,
    path: "/add-sale"
  },

  {
    title: "Cheque Detail",
    icon: <FaMoneyCheckDollar />,
    path: "/cheque-details"
  },

  {
    title: "Warehouse",
    icon: <FaWarehouse />,
    path: "/view-warehouse"
  },
  {
    title: "Own Account",
    icon: <MdAccountBalance />,
    childrens: [
      {
        title: "Daily Book + Expenses",
        path: "/view-expenses"
      },
      {
        title: "Bank Accounts",
        path: "/bank-accounts"
      }
    ]
  },
  {
    title: "Add Manager",
    icon: <GrUserManager />,
    path: "/add-manager"
  },
  // {
  //   title: "Order",
  //   icon: <FaBookMedical />,
  //   path: "/order",
  // },
  {
    title: "Profile Setting",
    icon: <FaRegChartBar />,
    childrens: [
      {
        title: "Profile",
        path: "/profile"
      },
      {
        title: "Edit Profile",
        path: "/edit-profile"
      }
      // {
      //   title: "Customer Account",
      //   path: "/edit-customer",
      // },
      // {
      //   title: "Manager Account",
      //   path: "/edit-manager",
      // },
    ]
  }

  // {
  //   title: "Report Bug",
  //   icon: <FaCommentAlt />,
  //   path: "/contact-us",
  // },
];

export default menu;
