import React from "react";
import DataTableCreateBlogs from "./data-table";
import { SContainer } from "../style";
import { ToastContainer } from "react-toastify";

const TrainPage = () => {
  return (
    <div>
      <h1 style={{ marginBottom: "20px" }}>Quản lí tin tức</h1>
      <SContainer>
        <DataTableCreateBlogs />
        <ToastContainer /> 
      </SContainer>
    </div>
  );
};

export default TrainPage;
