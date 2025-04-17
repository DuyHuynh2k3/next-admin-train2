import React from "react";
import { DataTableTicket } from "./data-table";
import { SContainer } from "../style";

const TrainPage = () => {
  return (
    <div>
      <h1 style={{ marginBottom: "20px" }}>Lịch sử đặt vé</h1>
      <SContainer>
        <DataTableTicket />
      </SContainer>
    </div>
  );
};

export default TrainPage;
