import styled from "styled-components";

export const SContainer = styled.div`
  width: 100%;
  border-radius: 15px;
  box-sizing: border-box;
  height: 90vh;
`;

export const SDetails = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const SBox = styled.div`
  display: flex;
  align-items: center;
  background-color: ${({ theme }) => theme.bg};
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1),
    /* Đổ bóng chìm nhẹ */ 0px 2px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  height: 100px;
  padding: 30px;
  flex: 1;
  margin: 0 15px;
  &:first-child {
    margin-left: 0;
  }
  &:last-child {
    margin-right: 0;
  }
`;

export const SContent = styled.div`
  margin-left: 30px;
`;

export const SImg = styled.div`
  padding: 20px;
  background-color: #c7f8d2;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
`;

export const SText = styled.h3`
  margin: 0;
  font-size: 18px;
  color: #888;
`;

export const SValue = styled.span`
  margin: 10px 0 0;
  font-size: 24px;
  font-weight: bold;
  color: #4caf50;
`;

export const SGraph = styled.div`
  width: 100%;
  height: 500px;
  background-color: ${({ theme }) => theme.bg};
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1),
    /* Đổ bóng chìm nhẹ */ 0px 2px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  margin-top: 30px;
`;

export const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true, // Hiển thị chú thích
      position: "top", // Vị trí ở phía trên biểu đồ
      labels: {
        usePointStyle: true, // Thay đổi thành vòng tròn thay vì hình vuông mặc định
        boxWidth: 8,
      },
    },
    title: {
      display: true,
      position: "top",
      text: "Earnings Overview", // Tiêu đề biểu đồ
    },
  },
  scales: {
    y: {
      title: {
        display: true,
        text: "Earnings (USD)", // Label cho trục Y
      },
      ticks: {
        beginAtZero: true,
        stepSize: 200, // Giá trị cách nhau 200
      },
      grid: {
        drawBorder: false,
        borderDash: [4, 4], // Tạo nét đứt ngắn hơn
        color: "rgba(0, 0, 0, 0.5)", // Màu nét đứt rõ ràng
        lineWidth: 0, // Độ dày của đường nét đứt
      },
    },
    x: {
      title: {
        display: true,
        text: "Months", // Label cho trục X
      },
      grid: {
        drawBorder: false,
        color: "rgba(0, 0, 0, 0.1)", // Màu lưới trục X
      },
    },
  },
};
