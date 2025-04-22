"use client";

import {
  SDivider,
  SItem,
  SLink,
  SLinkContainer,
  SLinkIcon,
  SLinkLabel,
  SLinkNotification,
  SLogo,
  SSidebar,
} from "../Sidebar/styles";
import { AiOutlineApartment, AiOutlineDashboard } from "react-icons/ai";
import {
  MdLogout,
  MdOutlineAnalytics,
  MdOutlineSettings,
} from "react-icons/md";
import { BsPeople } from "react-icons/bs";
import { IoNewspaperOutline } from "react-icons/io5";
import { MdOutlineCreateNewFolder } from "react-icons/md";

const Sidebar = () => {
  return (
    <SSidebar>
      <SLogo>
        <img src="/assets/logo.png" alt="logo" />
      </SLogo>

      {linksArray.map(({ icon, label, notification, to }) => (
        <SLinkContainer key={label}>
          <SLink href={to}>
            <SLinkIcon>{icon}</SLinkIcon>
            <SLinkLabel>{label}</SLinkLabel>
            {!!notification && (
              <SLinkNotification>{notification}</SLinkNotification>
            )}
          </SLink>
        </SLinkContainer>
      ))}

      <SItem>
        <SDivider />
        <>Quản lý chuyến tàu</>
      </SItem>

      {linksArrayTrain.map(({ icon, label, notification, to }) => (
        <SLinkContainer key={label}>
          <SLink href={to}>
            <SLinkIcon>{icon}</SLinkIcon>
            <SLinkLabel>{label}</SLinkLabel>
            {!!notification && (
              <SLinkNotification>{notification}</SLinkNotification>
            )}
          </SLink>
        </SLinkContainer>
      ))}

      <SItem>
        <SDivider />
        <>Quản lý tin tức</>
      </SItem>

      {linksArrayBlogs.map(({ icon, label, to }) => (
        <SLinkContainer key={label}>
          <SLink href={to}>
            <SLinkIcon>{icon}</SLinkIcon>
            <SLinkLabel>{label}</SLinkLabel>
          </SLink>
        </SLinkContainer>
      ))}
      <SDivider />
      {secondaryLinksArray.map(({ icon, label, to }) => (
        <SLinkContainer key={label}>
          <SLink href={to}>
            <SLinkIcon>{icon}</SLinkIcon>
            <SLinkLabel>{label}</SLinkLabel>
          </SLink>
        </SLinkContainer>
      ))}
    </SSidebar>
  );
};

// Dữ liệu cho các menu trong sidebar
const linksArray = [
  {
    label: "Dashboard",
    icon: <AiOutlineDashboard />,
    to: "/",
    notification: 0,
  },
];

const linksArrayTrain = [
  {
    label: "Lịch sử đặt vé",
    icon: <BsPeople />,
    to: "/historyTicket",
    notification: 0,
  },
  {
    label: "Chuyến tàu",
    icon: <MdOutlineAnalytics />,
    to: "/train",
    notification: 3,
  },
  {
    label: "Sân ga tàu",
    icon: <AiOutlineApartment />,
    to: "/diagrams",
    notification: 1,
  },
];

const linksArrayBlogs = [
  {
    label: "Danh Sách Tin Tức",
    icon: <IoNewspaperOutline />,
    to: "/blogs",
    notification: 0,
  },
  {
    label: "Tạo tin tức",
    icon: <MdOutlineCreateNewFolder />,
    to: "/createblogs",
    notification: 0,
  },
];
const secondaryLinksArray = [
  {
    label: "Settings",
    icon: <MdOutlineSettings />,
    to: "/settings",
  },
  {
    label: "Logout",
    icon: <MdLogout />,
    to: "/logout",
  },
];

export default Sidebar;
