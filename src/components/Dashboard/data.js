export const lineChartData = {
  labels: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  datasets: [
    {
      label: "Sales",
      data: [100, 200, 400, 600, 700, 500, 800, 900, 700, 1000, 900, 300],
      backgroundColor: "#4caf50", // Nền mờ màu xanh lá
      borderColor: "#37C768", // Màu đường (xanh dương)
      fill: true,
    },
    {
      label: "Profit",
      data: [200, 1000, 300, 650, 200, 800, 600, 700, 600, 900, 800, 200],
      backgroundColor: "#ff9800", // Nền mờ màu cam
      borderColor: "#ff9800",
      fill: true,
    },
  ],
};
