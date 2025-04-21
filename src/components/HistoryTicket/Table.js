"use client";

import React, { useState, useEffect } from "react";
import { Dropdown, ButtonGroup, Modal, Button } from "react-bootstrap"; // Import Modal và Button từ React-Bootstrap
import { FiSearch } from "react-icons/fi";
import { BsThreeDotsVertical } from "react-icons/bs";
import "bootstrap/dist/css/bootstrap.min.css";
import styles from "./Table.module.css";

const Table = () => {
  const [records, setRecords] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);
  const [showViewModal, setShowViewModal] = useState(false); // Modal View
  const [showUpdateModal, setShowUpdateModal] = useState(false); // Modal Update
  const [selectedTicket, setSelectedTicket] = useState(null); // State để lưu vé được chọn

  // Fetch data from the API
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("../../app/api/ticket.js");
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecords(data);
      } else {
        console.error("Fetched data is not an array:", data);
        setRecords([]);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const filteredData = records.filter(
    (item) =>
      item.passport.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
      item.fullName.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
      item.phoneNumber
        .toLowerCase()
        .includes(debouncedSearchText.toLowerCase()) ||
      item.email.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
      item.startStation
        .toLowerCase()
        .includes(debouncedSearchText.toLowerCase()) ||
      item.endStation
        .toLowerCase()
        .includes(debouncedSearchText.toLowerCase()) ||
      item.trainID.toString().includes(debouncedSearchText.toLowerCase()) || // Tìm kiếm theo trainID
      item.ticket_id.toString().includes(debouncedSearchText.toLowerCase()) || // Tìm kiếm theo ticket_id
      item.qr_code.toLowerCase().includes(debouncedSearchText.toLowerCase()) || // Tìm kiếm theo qr_code
      item.coach_seat
        .toLowerCase()
        .includes(debouncedSearchText.toLowerCase()) || // Tìm kiếm theo coach_seat
      item.travel_date.toLowerCase().includes(debouncedSearchText.toLowerCase()) // Tìm kiếm theo travel_date
  );

  // Hàm xử lý xem chi tiết
  const handleView = (ticket) => {
    setSelectedTicket(ticket); // Lưu vé vào state khi nhấn View
    setShowViewModal(true); // Hiển thị Modal View
  };

  // Hàm xử lý cập nhật thông tin
  const handleUpdate = (ticket) => {
    setSelectedTicket(ticket); // Lưu vé vào state khi nhấn Update
    setShowUpdateModal(true); // Hiển thị Modal Update
  };

  const handleUpdateT = async () => {
    const { ticket_id, passport, fullName, phoneNumber, email } =
      selectedTicket;

    console.log("Updating ticket with ticket_id:", ticket_id);
    console.log("With data:", { passport, fullName, phoneNumber, email });

    try {
      // Gửi yêu cầu PUT đến API để cập nhật dữ liệu
      const response = await fetch("/api/ticket", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_id,
          passport,
          fullName,
          phoneNumber,
          email,
        }), // Truyền ticket_id và passport
      });

      const data = await response.json();

      if (response.ok) {
        alert("Ticket updated successfully!");

        // Cập nhật lại dữ liệu trong giao diện sau khi cập nhật thành công
        setRecords((prevRecords) =>
          prevRecords.map((record) =>
            record.ticket_id === ticket_id // Dùng ticket_id để so sánh
              ? { ...record, fullName, phoneNumber, email, passport } // Cập nhật giá trị trong state
              : record
          )
        );

        setShowUpdateModal(false); // Đóng modal sau khi cập nhật thành công
      } else {
        alert(data.error || "Failed to update ticket");
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      alert("Có lỗi xảy ra khi cập nhật vé");
    }
  };

  // const handleCloseModal = () => {
  //   setShowModal(false); // Đóng Modal
  //   setSelectedTicket(null); // Reset ticket selected
  // };

  const handleDelete = async (passport) => {
    const confirmDelete = window.confirm("Bạn có chắc muốn xóa vé này?");
    if (confirmDelete) {
      try {
        const response = await fetch("/api/ticket", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ passport }),
        });

        const data = await response.json();

        if (response.ok) {
          setRecords((prevRecords) =>
            prevRecords.filter((record) => record.passport !== passport)
          );
          alert("Vé đã được xóa thành công!");
        } else {
          alert(data.error || "Xóa vé thất bại");
        }
      } catch (error) {
        console.error("Error deleting ticket:", error);
        alert("Có lỗi xảy ra khi xóa vé");
      }
    }
  };

  return (
    <div className="dataTableContainer">
      <div className={styles.customSearchContainer}>
        <div className={styles.customSearchBox}>
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.customSearch}
          />
          <FiSearch className={styles.customSearchIcon} />
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Passport</th>
            <th>Họ và tên</th>
            <th>Số điện thoại</th>
            <th>Email</th>
            <th>(Toa - chỗ)</th>
            <th>Ngày đi</th>
            <th>Ga đi - đến</th>
            <th>Giờ đi - đến</th>
            <th>Giá vé</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row) => (
            <tr key={row.passport}>
              <td>{row.passport}</td>
              <td>{row.fullName}</td>
              <td>{row.phoneNumber}</td>
              <td>{row.email}</td>
              <td style={{ textAlign: "center" }}>{row.coach_seat}</td>
              <td>{row.travel_date.slice(0, 10)}</td>
              <td>
                {row.startStation} - {row.endStation}
              </td>
              <td>
                {row.departTime} - {row.arrivalTime}
              </td>
              <td>{row.price}</td>
              <td>
                <Dropdown as={ButtonGroup} drop="end">
                  <Dropdown.Toggle
                    split
                    variant="secondary"
                    id="dropdown-custom-components"
                  >
                    <BsThreeDotsVertical />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleView(row)}>
                      View
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleUpdate(row)}>
                      Update
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleDelete(row.passport)}>
                      Delete
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal View */}
      {/* Modal View */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Ticket Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTicket && (
            <>
              <p>
                <strong>Ticket ID:</strong> {selectedTicket.ticket_id}
              </p>
              <p>
                <strong>Train ID:</strong> {selectedTicket.trainID}
              </p>
              <p>
                <strong>Passport:</strong> {selectedTicket.passport}
              </p>
              <p>
                <strong>Full Name:</strong> {selectedTicket.fullName}
              </p>
              <p>
                <strong>Phone Number:</strong> {selectedTicket.phoneNumber}
              </p>
              <p>
                <strong>Email:</strong> {selectedTicket.email}
              </p>
              <p>
                <strong>QR Code:</strong> {selectedTicket.qr_code}
              </p>
              <p>
                <strong>Coach and Seat:</strong> {selectedTicket.coach_seat}
              </p>
              <p>
                <strong>Travel Date:</strong>{" "}
                {selectedTicket.travel_date.slice(0, 10)}
              </p>
              <p>
                <strong>Start Station:</strong> {selectedTicket.startStation}
              </p>
              <p>
                <strong>End Station:</strong> {selectedTicket.endStation}
              </p>
              <p>
                <strong>Departure Time:</strong> {selectedTicket.departTime}
              </p>
              <p>
                <strong>Arrival Time:</strong> {selectedTicket.arrivalTime}
              </p>
              <p>
                <strong>Price:</strong> {selectedTicket.price}
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Update */}
      <Modal show={showUpdateModal} onHide={() => setShowUpdateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Ticket</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTicket && (
            <>
              <div className="form-group">
                <label>Passport:</label>
                <input
                  type="text"
                  disabled
                  className="form-control"
                  value={selectedTicket.passport}
                  onChange={(e) =>
                    setSelectedTicket({
                      ...selectedTicket,
                      passport: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Full Name:</label>
                <input
                  type="text"
                  className="form-control"
                  value={selectedTicket.fullName}
                  onChange={(e) =>
                    setSelectedTicket({
                      ...selectedTicket,
                      fullName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Phone Number:</label>
                <input
                  type="text"
                  className="form-control"
                  value={selectedTicket.phoneNumber}
                  onChange={(e) =>
                    setSelectedTicket({
                      ...selectedTicket,
                      phoneNumber: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  className="form-control"
                  value={selectedTicket.email}
                  onChange={(e) =>
                    setSelectedTicket({
                      ...selectedTicket,
                      email: e.target.value,
                    })
                  }
                />
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUpdateModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleUpdateT}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Table;
