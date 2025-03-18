"use client";

import React, { useEffect, useState } from "react";
import { SContainer } from "../style";

const TrainPage = () => {
  const [stations, setStations] = useState([]);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await fetch("/api/station");
        const data = await response.json();

        console.log("Data from API:", data); // Debug: Kiểm tra dữ liệu trả về

        if (Array.isArray(data)) {
          setStations(data);
        } else {
          console.error("Expected an array but got:", data);
          setStations([]); // Đặt stations thành mảng rỗng nếu dữ liệu không hợp lệ
        }
      } catch (error) {
        console.error("Error fetching stations:", error);
      }
    };

    fetchStations();
  }, []);

  return (
    <>
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Sân ga tàu</h1>
      <SContainer>
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stations.map((station) => (
              <div
                key={station.station_id}
                className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              >
                <div className="text-center">
                  <span className="text-lg font-semibold text-gray-700">
                    {station.station_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SContainer>
    </>
  );
};

export default TrainPage;
