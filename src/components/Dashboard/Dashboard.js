"use client";

import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale, // Đăng ký scale này
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { lineChartData } from "./data";
import { getTotalCostSVGBase64 } from "../../../public/assets/TotalCostSVG";
import { getTotalSaleSVGBase64 } from "../../../public/assets/TotalSaleSVG";
import { getTotalProfitSVGBase64 } from "../../../public/assets/TotalProfitSVG";
import {
  SBox,
  SDetails,
  SContainer,
  SText,
  SValue,
  SContent,
  SImg,
  SGraph,
  options,
} from "./style";

// Đăng ký các thành phần cần thiết của Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale, // Scale cần cho trục y (linear)
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const svgcostBase64 = getTotalCostSVGBase64("#4caf50");
  const svgsaleBase64 = getTotalSaleSVGBase64("#4caf50");
  const svgprofitBase64 = getTotalProfitSVGBase64("#4caf50");

  return (
    <SContainer>
      <SDetails>
        <SBox>
          <SImg>
            <img src={svgsaleBase64} alt="Total Sale Icon" />
          </SImg>
          <SContent>
            <SText>Total Sales</SText>
            <SValue>$512k</SValue>
          </SContent>
        </SBox>
        <SBox>
          <SImg>
            <img src={svgprofitBase64} alt="Total Cost Icon" />
          </SImg>
          <SContent>
            <SText>Total Profit</SText>
            <SValue>$45k</SValue>
          </SContent>
        </SBox>
        <SBox>
          <SImg>
            <img src={svgcostBase64} alt="Total Cost Icon" />
          </SImg>
          <SContent>
            <SText>Total Cost</SText>
            <SValue>$204k</SValue>
          </SContent>
        </SBox>
      </SDetails>
      <SGraph>
        <Line
          options={options}
          data={lineChartData}
          width={400}
          height={200}
        ></Line>
      </SGraph>
    </SContainer>
  );
};

export default Dashboard;
