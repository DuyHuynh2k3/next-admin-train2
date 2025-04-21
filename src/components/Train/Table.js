"use client";

import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Dropdown, ButtonGroup, Modal, Form, Button } from "react-bootstrap";
import { FiSearch } from "react-icons/fi";
import { BsThreeDotsVertical } from "react-icons/bs";
import styles from "./Table.module.css";

const Table = () => {
  const [records, setRecords] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);
  const [showModal, setShowModal] = useState(false);
  const [showModalView, setShowModalView] = useState(false); // Modal for View
  const [showModalUpdate, setShowModalUpdate] = useState(false); // Modal for Update
  const [newTrain, setNewTrain] = useState({
    trainID: "",
    train_name: "",
    startStation: "",
    endStation: "",
    depart_time: "", // Time format 24-hour (HH:mm:ss)
    arrival_time: "", // Time format 24-hour (HH:mm:ss)
    price: "",
    total_seats: "",
    start_date: "", // Date format YYYY-MM-DD
    end_date: "", // Date format YYYY-MM-DD
    duration: "",
    route_id: "", // Added routeID
    schedule_id: "", // Added scheduleID
    recurrence_id: "",
    // arrival_date: "",
    days_of_week: "", // Added days_of_week
  });
  const [selectedTrainView, setSelectedTrainView] = useState(null); // For view
  const [selectedTrainUpdate, setSelectedTrainUpdate] = useState(null); // For update

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("../../app/api/trains");
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

  const filteredData = records.filter((item) => {
    const lowercasedSearchText = debouncedSearchText.toLowerCase();
    return (
      (item.trainID &&
        item.trainID.toString().toLowerCase().includes(lowercasedSearchText)) ||
      (item.train_name &&
        item.train_name.toLowerCase().includes(lowercasedSearchText)) ||
      (item.startStation &&
        item.startStation.toLowerCase().includes(lowercasedSearchText)) ||
      (item.endStation &&
        item.endStation.toLowerCase().includes(lowercasedSearchText)) ||
      (item.depart_time &&
        item.depart_time.toLowerCase().includes(lowercasedSearchText)) ||
      (item.arrival_time &&
        item.arrival_time.toLowerCase().includes(lowercasedSearchText))
    );
  });

  const handleDelete = async (trainID) => {
    const confirmDelete = window.confirm(
      "Bạn có chắc muốn xóa chuyến tàu này?"
    );
    if (confirmDelete) {
      try {
        const response = await fetch("../../app/api/trains", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ trainID }),
        });
        const data = await response.json();
        if (response.ok) {
          setRecords((prevRecords) =>
            prevRecords.filter((train) => train.trainID !== trainID)
          );
          alert("Chuyến tàu đã được xóa thành công!");
        } else {
          alert(data.error || "Xóa chuyến tàu thất bại");
        }
      } catch (error) {
        console.error("Error deleting train:", error);
        alert("Có lỗi xảy ra khi xóa chuyến tàu");
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (showModalUpdate) {
      // Handle input change for modal update
      setSelectedTrainUpdate((prevTrain) => ({
        ...prevTrain,
        [name]: value,
      }));
    } else {
      // Handle input change for add train modal
      setNewTrain((prevTrain) => ({
        ...prevTrain,
        [name]: value,
      }));
    }
  };

  const handleAddTrain = async () => {
    const {
      trainID,
      train_name,
      startStation,
      endStation,
      depart_time,
      arrival_time,
      price,
      total_seats,
      start_date,
      end_date,
      duration,
      route_id,
      schedule_id,
      recurrence_id,
      days_of_week,
      // arrival_date,
    } = newTrain;

    if (
      !trainID ||
      !train_name ||
      !startStation ||
      !endStation ||
      !depart_time ||
      !arrival_time ||
      !price ||
      !total_seats ||
      !start_date ||
      !end_date ||
      !duration ||
      !route_id ||
      !schedule_id ||
      !recurrence_id ||
      !days_of_week
    ) {
      alert("Vui lòng điền đầy đủ tất cả thông tin!");
      return;
    }
    console.log(newTrain);
    try {
      const response = await fetch("../../app/api/trains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTrain),
      });

      const data = await response.json();

      if (response.ok) {
        setRecords((prevRecords) => [...prevRecords, data]);
        alert("Chuyến tàu đã được thêm thành công!");
        setShowModal(false);
      } else {
        alert(data.error || "Thêm chuyến tàu thất bại");
      }
    } catch (error) {
      console.error("Error adding train:", error);
      alert("Có lỗi xảy ra khi thêm chuyến tàu");
    }
  };

  const handleView = (trainID) => {
    const selected = records.find((train) => train.trainID === trainID);
    setSelectedTrainView(selected); // Only view the data
    setShowModalView(true);
  };

  const handleUpdate = (trainID) => {
    const selected = records.find((train) => train.trainID === trainID);
    setSelectedTrainUpdate(selected); // Allow updates
    setShowModalUpdate(true);
  };

  const handleUpdateTrain = async () => {
    console.log("Selected Train Update:", selectedTrainUpdate); // Kiểm tra lại dữ liệu

    const {
      trainID,
      train_name,
      startStation,
      endStation,
      depart_time,
      arrival_time,
      price,
      total_seats,
      start_date,
      end_date,
      duration,
      route_id,
      schedule_id,
      days_of_week,
    } = selectedTrainUpdate;

    // Kiểm tra giá trị ngày tháng
    console.log("Start Date:", start_date, "End Date:", end_date);

    // Khắc phục múi giờ và chuyển đổi ngày về định dạng YYYY-MM-DD
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Chuyển đổi ngày về định dạng "YYYY-MM-DD" (không có múi giờ)
    const formattedStartDate = startDate.toLocaleDateString("en-CA"); // "en-CA" cho định dạng YYYY-MM-DD
    const formattedEndDate = endDate.toLocaleDateString("en-CA");

    console.log(
      "Formatted Start Date:",
      formattedStartDate,
      "Formatted End Date:",
      formattedEndDate
    );
    console.log("Train ID:", trainID);
    console.log("Train Name:", train_name);
    console.log("Start Station:", startStation);
    console.log("End Station:", endStation);
    console.log("Depart Time:", depart_time);
    console.log("Arrival Time:", arrival_time);
    console.log("Price:", price);
    console.log("Total Seats:", total_seats);
    console.log("Start Date:", formattedStartDate);
    console.log("End Date:", formattedEndDate);
    console.log("Duration:", duration);
    console.log("Route ID:", route_id);
    console.log("Schedule ID:", schedule_id);
    console.log("Days of Week:", days_of_week);
    // Kiểm tra nếu các trường bắt buộc có giá trị hợp lệ
    if (
      !trainID ||
      !train_name ||
      !startStation ||
      !endStation ||
      !depart_time ||
      !arrival_time ||
      !price ||
      !total_seats ||
      !formattedStartDate ||
      !formattedEndDate ||
      !duration ||
      !route_id ||
      !schedule_id ||
      !days_of_week
    ) {
      alert("Vui lòng điền đầy đủ tất cả thông tin!");
      return;
    }

    // Chỉ cập nhật trường start_date và end_date mà không thay đổi các trường khác
    const updatedTrain = {
      trainID, // Giữ nguyên các trường cần thiết
      train_name,
      startStation,
      endStation,
      depart_time,
      arrival_time,
      price,
      total_seats,
      duration,
      route_id,
      schedule_id,
      days_of_week,
      start_date: formattedStartDate, // Cập nhật start_date
      end_date: formattedEndDate, // Cập nhật end_date
    };

    // Kiểm tra lại dữ liệu gửi đi
    console.log("Updated Train Data:", updatedTrain);

    // Thực hiện cập nhật chuyến tàu
    try {
      const response = await fetch("../../app/api/trains", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTrain),
      });

      const data = await response.json();

      if (response.ok) {
        setRecords((prevRecords) =>
          prevRecords.map((train) =>
            train.trainID === updatedTrain.trainID ? updatedTrain : train
          )
        );
        alert("Chuyến tàu đã được cập nhật thành công!");
        setShowModalUpdate(false);
      } else {
        alert(data.error || "Cập nhật chuyến tàu thất bại");
      }
    } catch (error) {
      console.error("Error updating train:", error);
      alert("Có lỗi xảy ra khi cập nhật chuyến tàu");
    }
  };

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  return (
    <div className="dataTableContainer">
      <div className={styles.customSearchContainer}>
        <div className={styles.customSearchBox}>
          <input
            type="text"
            placeholder="Search trains..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.customSearch}
          />
          <FiSearch className={styles.customSearchIcon} />
        </div>
        <Button
          style={{ background: "#ff6600", fontWeight: "bold" }}
          onClick={() => setShowModal(true)}
        >
          + Add Train
        </Button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Train ID</th>
            <th>Train</th>
            <th>Ga đi</th>
            <th>Ga đến</th>
            <th>Giờ khởi hành</th>
            <th>Giá vé</th>
            <th>Chỗ ngồi</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row) => (
            <tr key={row.trainID}>
              <td>{row.trainID}</td>
              <td>{row.train_name}</td>
              <td>{row.startStation}</td>
              <td>{row.endStation}</td>
              <td>{row.departTime}</td>
              <td>{row.price}</td>
              <td>{row.total_seats}</td>
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
                    <Dropdown.Item onClick={() => handleView(row.trainID)}>
                      View
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleUpdate(row.trainID)}>
                      Update
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleDelete(row.trainID)}>
                      Delete
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal Add Train */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Thêm Chuyến Tàu Mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formTrainID">
              <Form.Label>Train ID</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Train ID"
                name="trainID"
                value={newTrain.trainID}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formTrainName">
              <Form.Label>Train Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Train Name"
                name="train_name"
                value={newTrain.train_name}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formStartStation">
              <Form.Label>Ga đi</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Start Station"
                name="startStation"
                value={newTrain.startStation}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formEndStation">
              <Form.Label>Ga đến</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter End Station"
                name="endStation"
                value={newTrain.endStation}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formDepartTime">
              <Form.Label>Giờ khởi hành</Form.Label>
              <Form.Control
                type="time"
                step="1"
                name="depart_time"
                value={newTrain.depart_time}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formArrivalTime">
              <Form.Label>Giờ đến</Form.Label>
              <Form.Control
                type="time"
                step="1"
                name="arrival_time"
                value={newTrain.arrival_time}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formPrice">
              <Form.Label>Giá vé</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter Price"
                name="price"
                value={newTrain.price}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formTotalSeats">
              <Form.Label>Chỗ ngồi</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter Total Seats"
                name="total_seats"
                value={newTrain.total_seats}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formStartDate">
              <Form.Label>Ngày bắt đầu</Form.Label>
              <Form.Control
                type="date"
                name="start_date"
                value={newTrain.start_date || `${lastYear}-01-01`}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formEndDate">
              <Form.Label>Ngày kết thúc</Form.Label>
              <Form.Control
                type="date"
                name="end_date"
                value={newTrain.end_date || `${lastYear}-12-31`}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formDuration">
              <Form.Label>Thời gian hành trình (phút)</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter Duration"
                name="duration"
                value={newTrain.duration}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formRouteID">
              <Form.Label>Route ID</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Route ID"
                name="route_id"
                value={newTrain.route_id}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formScheduleID">
              <Form.Label>Schedule ID</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Schedule ID"
                name="schedule_id"
                value={newTrain.schedule_id}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formRecurrenceID">
              <Form.Label>Recurrence ID</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Recurrence ID"
                name="recurrence_id"
                value={newTrain.recurrence_id}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group controlId="formDaysOfWeek">
              <Form.Label>Days of the Week</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Days of the Week (e.g. MTWTFSS)"
                name="days_of_week"
                value={newTrain.days_of_week}
                onChange={handleInputChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Đóng
          </Button>
          <Button variant="primary" onClick={handleAddTrain}>
            Thêm Chuyến Tàu
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal View */}
      <Modal show={showModalView} onHide={() => setShowModalView(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Thông tin Chuyến Tàu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTrainView && (
            <div>
              <p>
                <strong>Train ID:</strong> {selectedTrainView.trainID}
              </p>
              <p>
                <strong>Train Name:</strong> {selectedTrainView.train_name}
              </p>
              <p>
                <strong>Start Station:</strong> {selectedTrainView.startStation}
              </p>
              <p>
                <strong>End Station:</strong> {selectedTrainView.endStation}
              </p>
              <p>
                <strong>Depart Time:</strong> {selectedTrainView.departTime}
              </p>
              <p>
                <strong>Arrival Time:</strong> {selectedTrainView.arrivalTime}
              </p>
              <p>
                <strong>Price:</strong> {selectedTrainView.price}
              </p>
              <p>
                <strong>Total Seats:</strong> {selectedTrainView.total_seats}
              </p>
              <p>
                <strong>Start Date:</strong>{" "}
                {selectedTrainView.start_date.slice(0, 10)}
              </p>
              <p>
                <strong>End Date:</strong>{" "}
                {selectedTrainView.end_date.slice(0, 10)}
              </p>
              <p>
                <strong>Duration:</strong> {selectedTrainView.duration}
              </p>
              <p>
                <strong>Route ID:</strong> {selectedTrainView.route_id}
              </p>
              <p>
                <strong>Schedule ID:</strong> {selectedTrainView.schedule_id}
              </p>
              <p>
                <strong>Days of Week:</strong> {selectedTrainView.days_of_week}
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalView(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showModalUpdate} onHide={() => setShowModalUpdate(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Cập nhật Chuyến Tàu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTrainUpdate && (
            <Form>
              <Form.Group controlId="formTrainID">
                <Form.Label>Train ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter Train ID"
                  name="trainID"
                  value={selectedTrainUpdate.trainID}
                  onChange={handleInputChange}
                  disabled
                />
              </Form.Group>

              <Form.Group controlId="formTrainName">
                <Form.Label>Train Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter Train Name"
                  name="train_name"
                  value={selectedTrainUpdate.train_name}
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Form.Group controlId="formStartStation">
                <Form.Label>Ga đi</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter Start Station"
                  name="startStation"
                  value={selectedTrainUpdate.startStation}
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Form.Group controlId="formEndStation">
                <Form.Label>Ga đến</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter End Station"
                  name="endStation"
                  value={selectedTrainUpdate.endStation}
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Form.Group controlId="formDepartTime">
                <Form.Label>Giờ khởi hành</Form.Label>
                <Form.Control
                  type="time"
                  step="1"
                  name="depart_time"
                  value={selectedTrainUpdate.depart_time} // Nếu depart_time có thì hiển thị, nếu không sẽ để rỗng
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Form.Group controlId="formArrivalTime">
                <Form.Label>Giờ đến</Form.Label>
                <Form.Control
                  type="time"
                  step="1"
                  name="arrival_time"
                  value={selectedTrainUpdate.arrival_time} // Tương tự như trên
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Form.Group controlId="formPrice">
                <Form.Label>Giá vé</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Enter Price"
                  name="price"
                  value={selectedTrainUpdate.price}
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Form.Group controlId="formTotalSeats">
                <Form.Label>Chỗ ngồi</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Enter Total Seats"
                  name="total_seats"
                  value={selectedTrainUpdate.total_seats}
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Form.Group controlId="formStartDate">
                <Form.Label>Ngày bắt đầu</Form.Label>
                <Form.Control
                  type="date"
                  name="start_date"
                  value={
                    selectedTrainUpdate.start_date.slice(0, 10) ||
                    `${lastYear}-01-01`
                  }
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Form.Group controlId="formEndDate">
                <Form.Label>Ngày kết thúc</Form.Label>
                <Form.Control
                  type="date"
                  name="end_date"
                  value={
                    selectedTrainUpdate.end_date.slice(0, 10) ||
                    `${lastYear}-12-31`
                  }
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Form.Group controlId="formDuration">
                <Form.Label>Thời gian hành trình (phút)</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Enter Duration"
                  name="duration"
                  value={selectedTrainUpdate.duration}
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Form.Group controlId="formRouteID">
                <Form.Label>Route ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter Route ID"
                  name="route_id"
                  value={selectedTrainUpdate.route_id}
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Form.Group controlId="formScheduleID">
                <Form.Label>Schedule ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter Schedule ID"
                  name="schedule_id"
                  value={selectedTrainUpdate.schedule_id}
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Form.Group controlId="formDaysOfWeek">
                <Form.Label>Days of the Week</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter Days of the Week (e.g. MTWTFSS)"
                  name="days_of_week"
                  value={selectedTrainUpdate.days_of_week}
                  onChange={handleInputChange}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalUpdate(false)}>
            Đóng
          </Button>
          <Button variant="primary" onClick={handleUpdateTrain}>
            Cập nhật Chuyến Tàu
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Table;
