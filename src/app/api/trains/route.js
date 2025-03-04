import mysql from "mysql2";
import { NextResponse } from "next/server";

// Tạo kết nối MySQL
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "trainbooking",
});

// Định nghĩa phương thức GET
export const GET = async (req) => {
  const { searchParams } = new URL(req.url);
  const trainID = searchParams.get("trainID");

  const query = `
      SELECT 
          train.trainID,
          train.train_name,
          route.startStation,
          route.endStation,
          schedule.departTime,
          schedule.arrivalTime,
          route.price,
          train.total_seats,
          train_recurrence.start_date,  
          train_recurrence.end_date,    
          route.duration,       
          route.route_id,       
          schedule.schedule_id, 
          train_recurrence.recurrence_id,
          train_recurrence.days_of_week,
          DATE_ADD(train_recurrence.start_date, INTERVAL route.duration MINUTE) AS arrival_date
      FROM 
          trainbooking.train AS train
      JOIN 
          trainbooking.schedule AS schedule
          ON train.trainID = schedule.trainID
      JOIN 
          trainbooking.route AS route
          ON schedule.route_id = route.route_id
      JOIN 
          trainbooking.train_recurrence AS train_recurrence
          ON schedule.recurrence_id = train_recurrence.recurrence_id
      ${trainID ? "WHERE train.trainID = ?" : ""}
    `;

  return new Promise((resolve, reject) => {
    connection.query(query, trainID ? [trainID] : [], (err, results) => {
      if (err) {
        console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
        reject(new Error("Truy vấn cơ sở dữ liệu thất bại"));
      } else {
        resolve(results);
      }
    });
  })
    .then((results) => {
      if (!results || results.length === 0) {
        return NextResponse.json(
          { message: "Không có dữ liệu" },
          { status: 404 }
        );
      }

      // Ánh xạ dữ liệu để khớp với kiểu Train
      const formattedResults = results.map((item) => ({
        trainID: item.trainID || "",
        train_name: item.train_name || "",
        startStation: item.startStation || "",
        endStation: item.endStation || "",
        departTime: item.departTime || "",
        arrivalTime: item.arrivalTime || "",
        price: item.price ?? 0,
        total_seats: item.total_seats ?? 0,
        start_date: item.start_date ? new Date(item.start_date) : null,
        end_date: item.end_date ? new Date(item.end_date) : null,
        duration: item.duration ?? 0,
        route_id: item.route_id ?? 0,
        schedule_id: item.schedule_id ?? 0,
        recurrence_id: item.recurrence_id ?? 0,
        days_of_week: item.days_of_week || "",
        arrival_date: item.arrival_date ? new Date(item.arrival_date) : null,
      }));

      // Nếu có trainID, trả về một bản ghi duy nhất; nếu không, trả về danh sách
      return NextResponse.json(
        trainID ? formattedResults[0] : formattedResults
      );
    })
    .catch((error) => {
      return NextResponse.json({ error: error.message }, { status: 500 });
    });
};

// Phương thức POST - Thêm dữ liệu mới
export const POST = async (req) => {
  const body = await req.json();
  console.log("Received data:", body);

  const {
    trainID,
    train_name,
    startStation,
    endStation,
    departTime,
    arrivalTime,
    price,
    total_seats,
    start_date,
    end_date,
    duration,
    route_id,
    recurrence_id,
    days_of_week,
    arrival_date,
  } = body;

  // Validate required fields
  if (
    !trainID ||
    !train_name ||
    !startStation ||
    !endStation ||
    !departTime ||
    !arrivalTime ||
    !price ||
    !total_seats ||
    !start_date ||
    !end_date ||
    !duration ||
    !route_id ||
    !recurrence_id ||
    !days_of_week ||
    !arrival_date
  ) {
    return NextResponse.json(
      { error: "Thiếu các trường thông tin bắt buộc" },
      { status: 400 }
    );
  }

  try {
    // Start a transaction
    await new Promise((resolve, reject) => {
      connection.beginTransaction((err) => {
        if (err) {
          console.error("Lỗi khi bắt đầu giao dịch:", err);
          reject(new Error("Lỗi khi bắt đầu giao dịch"));
        } else {
          resolve();
        }
      });
    });

    // Check if recurrence_id exists in train_recurrence table
    const checkRecurrenceQuery = `
        SELECT * FROM trainbooking.train_recurrence WHERE recurrence_id = ?;
      `;
    const recurrenceExists = await new Promise((resolve, reject) => {
      connection.query(checkRecurrenceQuery, [recurrence_id], (err, result) => {
        if (err) {
          console.error("Lỗi kiểm tra recurrence_id:", err);
          reject(new Error("Lỗi kiểm tra recurrence_id"));
        } else {
          resolve(result.length > 0);
        }
      });
    });

    if (!recurrenceExists) {
      // If recurrence_id doesn't exist, insert into train_recurrence table
      const insertRecurrenceQuery = `
          INSERT INTO trainbooking.train_recurrence (recurrence_id, start_date, end_date, days_of_week)
          VALUES (?, ?, ?, ?);
        `;
      await new Promise((resolve, reject) => {
        connection.query(
          insertRecurrenceQuery,
          [recurrence_id, start_date, end_date, days_of_week],
          (err) => {
            if (err) {
              console.error(
                "Lỗi khi chèn dữ liệu vào bảng train_recurrence:",
                err
              );
              reject(
                new Error("Lỗi khi chèn dữ liệu vào bảng train_recurrence")
              );
            }
            resolve();
          }
        );
      });
    }

    // Insert into train and route tables
    const trainQuery = `
        INSERT INTO trainbooking.train (trainID, train_name, total_seats)
        VALUES (?, ?, ?);
      `;
    await new Promise((resolve, reject) => {
      connection.query(
        trainQuery,
        [trainID, train_name, total_seats],
        (err) => {
          if (err) {
            console.error("Lỗi khi chèn dữ liệu vào bảng train:", err);
            reject(new Error("Lỗi khi chèn dữ liệu vào bảng train"));
          }
          resolve();
        }
      );
    });

    const routeQuery = `
        INSERT INTO trainbooking.route (route_id, startStation, endStation, duration, price)
        VALUES (?, ?, ?, ?, ?);
      `;
    await new Promise((resolve, reject) => {
      connection.query(
        routeQuery,
        [route_id, startStation, endStation, duration, price],
        (err) => {
          if (err) {
            console.error("Lỗi khi chèn dữ liệu vào bảng route:", err);
            reject(new Error("Lỗi khi chèn dữ liệu vào bảng route"));
          }
          resolve();
        }
      );
    });

    // Get the latest schedule_id
    const scheduleQuery = `
        SELECT MAX(schedule_id) AS max_id FROM trainbooking.schedule;
      `;
    const scheduleResult = await new Promise((resolve, reject) => {
      connection.query(scheduleQuery, (err, result) => {
        if (err) {
          console.error("Lỗi khi lấy schedule_id:", err);
          reject(new Error("Lỗi khi lấy schedule_id"));
        }
        resolve(result[0]?.max_id || 0);
      });
    });

    const scheduleID = scheduleResult + 1;

    // Insert into schedule table
    const scheduleInsertQuery = `
        INSERT INTO trainbooking.schedule (schedule_id, trainID, route_id, recurrence_id, departTime, arrivalTime, arrival_date)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `;
    await new Promise((resolve, reject) => {
      connection.query(
        scheduleInsertQuery,
        [
          scheduleID,
          trainID,
          route_id,
          recurrence_id,
          departTime,
          arrivalTime,
          arrival_date,
        ],
        (err) => {
          if (err) {
            console.error("Lỗi khi chèn dữ liệu vào bảng schedule:", err);
            reject(new Error("Lỗi khi chèn dữ liệu vào bảng schedule"));
          }
          resolve();
        }
      );
    });

    // Commit the transaction if all queries succeed
    await new Promise((resolve, reject) => {
      connection.commit((err) => {
        if (err) {
          console.error("Lỗi khi cam kết giao dịch:", err);
          reject(new Error("Lỗi khi cam kết giao dịch"));
        } else {
          resolve();
        }
      });
    });

    // Return success response
    return NextResponse.json({
      message: "Chuyến tàu đã được thêm thành công",
      scheduleID,
    });
  } catch (error) {
    // Rollback the transaction if any error occurs
    await new Promise((resolve, reject) => {
      connection.rollback(() => {
        console.error("Giao dịch thất bại:", error);
        reject(new Error("Giao dịch thất bại: " + error.message));
      });
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

// Phương thức PUT - Cập nhật dữ liệu
export const PUT = async (req) => {
  const { trainID, ...updates } = await req.json();

  if (!trainID) {
    return NextResponse.json(
      { error: "Train ID is required" },
      { status: 400 }
    );
  }

  try {
    // Bắt đầu một transaction
    await new Promise((resolve, reject) => {
      connection.beginTransaction((err) => {
        if (err) {
          console.error("Lỗi khi bắt đầu transaction:", err);
          reject(new Error("Lỗi khi bắt đầu transaction"));
        } else {
          resolve();
        }
      });
    });

    // Cập nhật bảng train nếu có thay đổi
    if (updates.train_name || updates.total_seats) {
      let updateFields = [];
      let updateValues = [];

      if (updates.train_name) {
        updateFields.push("train_name = ?");
        updateValues.push(updates.train_name);
      }

      if (updates.total_seats) {
        updateFields.push("total_seats = ?");
        updateValues.push(updates.total_seats);
      }

      updateValues.push(trainID);

      const updateTrainQuery = `
        UPDATE trainbooking.train
        SET ${updateFields.join(", ")}
        WHERE trainID = ?;
      `;

      await new Promise((resolve, reject) => {
        connection.query(updateTrainQuery, updateValues, (err, results) => {
          if (err) {
            console.error("Lỗi khi cập nhật train:", err);
            reject(new Error(`Lỗi khi cập nhật train: ${err.message}`));
          } else {
            resolve(results);
          }
        });
      });
    }

    // Cập nhật bảng route nếu có thay đổi
    if (
      updates.startStation ||
      updates.endStation ||
      updates.duration ||
      updates.price
    ) {
      let updateFields = [];
      let updateValues = [];

      if (updates.startStation) {
        updateFields.push("startStation = ?");
        updateValues.push(updates.startStation);
      }

      if (updates.endStation) {
        updateFields.push("endStation = ?");
        updateValues.push(updates.endStation);
      }

      if (updates.duration) {
        updateFields.push("duration = ?");
        updateValues.push(updates.duration);
      }

      if (updates.price) {
        updateFields.push("price = ?");
        updateValues.push(updates.price);
      }

      updateValues.push(updates.route_id);

      const updateRouteQuery = `
        UPDATE trainbooking.route
        SET ${updateFields.join(", ")}
        WHERE route_id = ?;
      `;

      await new Promise((resolve, reject) => {
        connection.query(updateRouteQuery, updateValues, (err, results) => {
          if (err) {
            console.error("Lỗi khi cập nhật route:", err);
            reject(new Error(`Lỗi khi cập nhật route: ${err.message}`));
          } else {
            resolve(results);
          }
        });
      });
    }

    // Cập nhật bảng schedule nếu có thay đổi
    if (updates.departTime || updates.arrivalTime) {
      let updateFields = [];
      let updateValues = [];

      if (updates.departTime) {
        updateFields.push("departTime = ?");
        updateValues.push(updates.departTime);
      }

      if (updates.arrivalTime) {
        updateFields.push("arrivalTime = ?");
        updateValues.push(updates.arrivalTime);
      }

      updateValues.push(updates.schedule_id);

      const updateScheduleQuery = `
        UPDATE trainbooking.schedule
        SET ${updateFields.join(", ")}
        WHERE schedule_id = ?;
      `;

      await new Promise((resolve, reject) => {
        connection.query(updateScheduleQuery, updateValues, (err, results) => {
          if (err) {
            console.error("Lỗi khi cập nhật schedule:", err);
            reject(new Error(`Lỗi khi cập nhật schedule: ${err.message}`));
          } else {
            resolve(results);
          }
        });
      });
    }

    // Cập nhật bảng train_recurrence nếu có thay đổi
    if (updates.days_of_week || updates.start_date || updates.end_date) {
      let updateFields = [];
      let updateValues = [];

      if (updates.days_of_week) {
        updateFields.push("days_of_week = ?");
        updateValues.push(updates.days_of_week);
      }

      if (updates.start_date) {
        updateFields.push("start_date = ?");
        updateValues.push(updates.start_date);
      }

      if (updates.end_date) {
        updateFields.push("end_date = ?");
        updateValues.push(updates.end_date);
      }

      updateValues.push(updates.recurrence_id);

      const updateTrainRecurrenceQuery = `
        UPDATE trainbooking.train_recurrence
        SET ${updateFields.join(", ")}
        WHERE recurrence_id = ?;
      `;

      await new Promise((resolve, reject) => {
        connection.query(
          updateTrainRecurrenceQuery,
          updateValues,
          (err, results) => {
            if (err) {
              console.error("Lỗi khi cập nhật train_recurrence:", err);
              reject(
                new Error(`Lỗi khi cập nhật train_recurrence: ${err.message}`)
              );
            } else {
              resolve(results);
            }
          }
        );
      });
    }

    // Commit transaction nếu thành công
    await new Promise((resolve, reject) => {
      connection.commit((err) => {
        if (err) {
          console.error("Lỗi khi commit transaction:", err);
          reject(new Error("Lỗi khi commit transaction"));
        } else {
          resolve();
        }
      });
    });

    return NextResponse.json(
      { message: "Cập nhật thông tin tàu thành công" },
      { status: 200 }
    );
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await new Promise((resolve, reject) => {
      connection.rollback((err) => {
        if (err) {
          console.error("Lỗi khi rollback transaction:", err);
        }
        reject(error);
      });
    });

    console.error("Lỗi trong API PUT:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

// Phương thức DELETE - Xóa dữ liệu
export const DELETE = async (req) => {
  const url = new URL(req.url);
  const searchParams = new URLSearchParams(url.search);
  const trainID = searchParams.get("trainID");

  if (!trainID) {
    return NextResponse.json(
      { error: "Train ID is required" },
      { status: 400 }
    );
  }

  // Delete from seattrain first (because it references trainID)
  const deleteSeatTrainQuery = `DELETE FROM trainbooking.seattrain WHERE trainID = ?;`;

  // Delete from schedule
  const deleteScheduleQuery = `DELETE FROM trainbooking.schedule WHERE trainID = ?;`;

  // Finally, delete train
  const deleteTrainQuery = `DELETE FROM trainbooking.train WHERE trainID = ?;`;

  try {
    // Bắt đầu một transaction
    await new Promise((resolve, reject) => {
      connection.beginTransaction((err) => {
        if (err) {
          console.error("Lỗi khi bắt đầu transaction:", err);
          reject(new Error("Lỗi khi bắt đầu transaction"));
        } else {
          resolve();
        }
      });
    });

    // Xóa từ bảng seattrain
    await new Promise((resolve, reject) => {
      connection.query(deleteSeatTrainQuery, [trainID], (err, results) => {
        if (err) {
          console.error("Lỗi khi xóa seattrain:", err);
          reject(new Error(`Lỗi khi xóa seattrain: ${err.message}`));
        } else {
          resolve(results);
        }
      });
    });

    // Xóa từ bảng schedule
    await new Promise((resolve, reject) => {
      connection.query(deleteScheduleQuery, [trainID], (err, results) => {
        if (err) {
          console.error("Lỗi khi xóa schedule:", err);
          reject(new Error(`Lỗi khi xóa schedule: ${err.message}`));
        } else {
          resolve(results);
        }
      });
    });

    // Xóa từ bảng train
    await new Promise((resolve, reject) => {
      connection.query(deleteTrainQuery, [trainID], (err, results) => {
        if (err) {
          console.error("Lỗi khi xóa train:", err);
          reject(new Error(`Lỗi khi xóa train: ${err.message}`));
        } else {
          if (results.affectedRows === 0) {
            reject(new Error("Không tìm thấy chuyến tàu với ID này"));
          } else {
            resolve(results);
          }
        }
      });
    });

    // Commit transaction nếu thành công
    await new Promise((resolve, reject) => {
      connection.commit((err) => {
        if (err) {
          console.error("Lỗi khi commit transaction:", err);
          reject(new Error("Lỗi khi commit transaction"));
        } else {
          resolve();
        }
      });
    });

    return NextResponse.json({ message: "Xóa thành công" }, { status: 200 });
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await new Promise((resolve, reject) => {
      connection.rollback(() => {
        console.error("Error in DELETE API:", error);
        reject(error);
      });
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
