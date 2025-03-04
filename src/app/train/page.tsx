import React from "react";
import { DataTableTrain } from "./data-table";
import { SContainer } from "../style";

const TrainPage = () => {
  return (
    <div>
      <h1 style={{ marginBottom: "20px" }}>Thông tin tàu</h1>
      <SContainer>
        <DataTableTrain />
      </SContainer>
    </div>
  );
};

export default TrainPage;
