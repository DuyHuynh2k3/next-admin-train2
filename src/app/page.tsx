"use client";

import React from "react";
import "./style";
import Dashboard from "../components/Dashboard/Dashboard";
import { SetUp } from "./style"; // Import đúng tên mới

const Home = () => {
  return (
    <SetUp>
      <h1>Home Page</h1>
      <Dashboard />
    </SetUp>
  );
};

export default Home;
