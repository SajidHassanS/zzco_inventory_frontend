import { FaTh, FaRegChartBar } from "react-icons/fa";
import { IoPersonAdd } from "react-icons/io5";
import { GrUserManager } from "react-icons/gr";
import { FaCartPlus } from "react-icons/fa";
import { BsCartDashFill } from "react-icons/bs";
import { MdAccountBalance } from "react-icons/md";
import { FaWarehouse } from "react-icons/fa6";
import { FaMoneyCheckDollar } from "react-icons/fa6";
import { TbReportAnalytics } from "react-icons/tb";
import { MdBrokenImage } from "react-icons/md"; // ✅ New icon for damage

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
    title: "Damage Product", // ✅ NEW
    icon: <MdBrokenImage />,
    path: "/damage-products"
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
    title: "Report",
    icon: <TbReportAnalytics />,
    path: "/report"
  },
  {
    title: "Add Manager",
    icon: <GrUserManager />,
    path: "/add-manager"
  },
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
    ]
  }
];

export default menu;
