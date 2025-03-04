"use client";

import * as React from "react";
import { FiSearch } from "react-icons/fi";
import styles from "./Table.module.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal } from "lucide-react";
import { flexRender } from "@tanstack/react-table";
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Train = {
  trainID: string;
  train_name: string;
  startStation: string;
  endStation: string;
  departTime: string;
  arrivalTime: string;
  price: number;
  total_seats: number;
  start_date: Date;
  end_date: Date;
  duration: number;
  route_id: number;
  schedule_id: number;
  recurrence_id?: number;
  days_of_week: string;
  arrival_date: Date;
};

export function DataTableTrain() {
  const [trainData, setTrainData] = React.useState<Train[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState("");
  const [debouncedSearchText, setDebouncedSearchText] =
    React.useState(searchText);
  const [showModal, setShowModal] = React.useState(false);
  const [showModalAdd, setShowModalAdd] = React.useState(false);
  const [showModalView, setShowModalView] = React.useState(false);
  const [showModalUpdate, setShowModalUpdate] = React.useState(false);

  const [newTrain, setNewTrain] = React.useState<Train>({} as Train);
  const [selectedTrainView, setSelectedTrainView] =
    React.useState<Train | null>(null);
  const [selectedTrainUpdate, setSelectedTrainUpdate] =
    React.useState<Train | null>(null);

  React.useEffect(() => {
    // Khởi tạo giá trị động sau khi component mount
    setNewTrain({
      trainID: "",
      train_name: "",
      startStation: "",
      endStation: "",
      departTime: "",
      arrivalTime: "",
      price: 0,
      total_seats: 0,
      start_date: new Date(),
      end_date: new Date(),
      duration: 0,
      route_id: 0,
      schedule_id: 0,
      recurrence_id: 0,
      arrival_date: new Date(),
      days_of_week: "",
    });
  }, []); // Chỉ chạy một lần sau khi component mount

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Chỉ fetch data nếu trainData rỗng
        if (trainData.length === 0) {
          const res = await fetch("/api/trains");
          if (!res.ok) throw new Error("Failed to fetch trains");
          const data = await res.json();
          if (Array.isArray(data)) {
            setTrainData(data);
          } else {
            console.error("Fetched data is not an array:", data);
            setTrainData([]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trainData]);

  // Debounce search text
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText); // Cập nhật debouncedSearchText sau 300ms
    }, 300);

    return () => clearTimeout(timer); // Clear timer nếu searchText thay đổi trước khi hết 300ms
  }, [searchText]); // Chỉ chạy lại khi searchText thay đổi

  // Filter data based on debounced search text
  const filteredData = React.useMemo(() => {
    const lowercasedSearchText = debouncedSearchText.toLowerCase();
    return trainData.filter((item) => {
      return (
        (item.trainID &&
          item.trainID
            .toString()
            .toLowerCase()
            .includes(lowercasedSearchText)) ||
        (item.train_name &&
          item.train_name.toLowerCase().includes(lowercasedSearchText)) ||
        (item.startStation &&
          item.startStation.toLowerCase().includes(lowercasedSearchText)) ||
        (item.endStation &&
          item.endStation.toLowerCase().includes(lowercasedSearchText)) ||
        (item.departTime &&
          item.departTime.toLowerCase().includes(lowercasedSearchText))
      );
    });
  }, [trainData, debouncedSearchText]); // Chỉ tính toán lại khi trainData hoặc debouncedSearchText thay đổi

  const handleDelete = async (trainID: string) => {
    const confirmDelete = window.confirm(
      "Bạn có chắc muốn xóa chuyến tàu này?"
    );
    if (confirmDelete) {
      try {
        console.log("Deleting train with ID:", trainID);
        const response = await fetch(`/api/trains?trainID=${trainID}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        console.log("Response status:", response.status);

        // Đọc phản hồi từ server dưới dạng JSON
        const data = await response.json();
        console.log("Parsed response data:", data);

        if (!response.ok) {
          // Nếu phản hồi không thành công, hiển thị thông báo lỗi từ server
          throw new Error(data.error || "Failed to delete train");
        }

        // Nếu xóa thành công, cập nhật state và hiển thị thông báo
        if (data.message === "Xóa thành công") {
          setTrainData((prevRecords) =>
            prevRecords.filter((train) => train.trainID !== trainID)
          );
          alert("Chuyến tàu đã được xóa thành công!");
        } else {
          alert("Không thể xóa chuyến tàu");
        }
      } catch (error) {
        console.error("Error deleting train:", error);
        if (error instanceof Error) {
          alert("Có lỗi xảy ra khi xóa chuyến tàu: " + error.message);
        } else {
          alert("Có lỗi xảy ra khi xóa chuyến tàu");
        }
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (showModalUpdate && selectedTrainUpdate) {
      setSelectedTrainUpdate((prevTrain) => ({
        ...prevTrain!,
        [name]: value,
      }));
    } else {
      setNewTrain((prevTrain) => ({
        ...prevTrain,
        [name]: value,
      }));
    }
  };

  const handleAddTrain = async () => {
    const requiredFields = [
      "trainID",
      "train_name",
      "startStation",
      "endStation",
      "departTime",
      "arrivalTime",
      "price",
      "total_seats",
      "start_date",
      "end_date",
      "duration",
      "route_id",
      "schedule_id",
      "recurrence_id",
      "days_of_week",
      "arrival_date",
    ];

    for (let field of requiredFields) {
      if (!newTrain[field as keyof Train]) {
        alert(`Vui lòng điền đầy đủ thông tin cho trường ${field}!`);
        return;
      }
    }

    // Chuyển đổi kiểu dữ liệu
    const payload = {
      ...newTrain,
      price: parseFloat(newTrain.price.toString()), // Chuyển đổi sang số thập phân
      total_seats: parseInt(newTrain.total_seats.toString()), // Chuyển đổi sang số nguyên
      duration: parseInt(newTrain.duration.toString()), // Chuyển đổi sang số nguyên
      route_id: parseInt(newTrain.route_id.toString()), // Chuyển đổi sang số nguyên
      schedule_id: parseInt(newTrain.schedule_id.toString()), // Chuyển đổi sang số nguyên
      recurrence_id: parseInt(newTrain.recurrence_id?.toString() || "0"), // Kiểm tra và chuyển đổi sang số nguyên
      arrival_date: new Date(newTrain.arrival_date).toISOString(), // Chuyển đổi thành chuỗi ISO
    };

    console.log("Thông tin chuyến tàu:", payload);

    try {
      const response = await fetch("/api/trains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Server response:", data); // Hiển thị phản hồi từ server

      if (response.ok) {
        setTrainData((prevRecords) => [...prevRecords, data]);
        alert("Chuyến tàu đã được thêm thành công!");
        setShowModalAdd(false);
      } else {
        alert(data.error || "Thêm chuyến tàu thất bại");
      }
    } catch (error) {
      console.error("Error adding train:", error);
      alert("Có lỗi xảy ra khi thêm chuyến tàu");
    }
  };

  const handleView = async (trainID: string) => {
    if (showModalView) return;

    try {
      const response = await fetch(`/api/trains?trainID=${trainID}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTrainView(data);
        setShowModalView(true);
      }
    } catch (error) {
      console.error("Lỗi khi xem chuyến tàu:", error);
      alert("Có lỗi xảy ra khi xem chuyến tàu");
    }
  };

  // Hàm chuẩn hóa thời gian
  const formatTime = (time) => {
    if (time && time.length === 5) {
      return `${time}:00`; // Thêm :00 nếu chỉ có HH:MM
    }
    return time; // Giữ nguyên nếu đã có định dạng HH:MM:SS
  };

  const handleUpdate = (trainID: string) => {
    const selected = trainData.find((train) => train.trainID === trainID);
    if (selected) {
      setSelectedTrainUpdate({
        ...selected,
        route_id: selected.route_id, // Đảm bảo route_id được lấy
        schedule_id: selected.schedule_id, // Đảm bảo schedule_id được lấy
        recurrence_id: selected.recurrence_id, // Đảm bảo recurrence_id được lấy
      });
      setShowModalUpdate(true);
    }
  };

  const handleUpdateTrain = async () => {
    if (!selectedTrainUpdate) {
      alert("No train selected for update.");
      return;
    }

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
      schedule_id,
      recurrence_id,
      days_of_week,
    } = selectedTrainUpdate;

    // Chuẩn hóa departTime và arrivalTime
    const formattedDepartTime = formatTime(departTime);
    const formattedArrivalTime = formatTime(arrivalTime);

    const updatedTrain = {
      trainID,
      train_name,
      startStation,
      endStation,
      departTime: formattedDepartTime, // Sử dụng giá trị đã chuẩn hóa
      arrivalTime: formattedArrivalTime, // Sử dụng giá trị đã chuẩn hóa
      price,
      total_seats,
      start_date,
      end_date,
      duration,
      route_id,
      schedule_id,
      recurrence_id,
      days_of_week,
    };

    try {
      const response = await fetch(`/api/trains/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTrain),
      });

      console.log("Data being sent:", updatedTrain);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Server response:", data);

      if (response.ok) {
        setTrainData((prevRecords) =>
          prevRecords.map((train) =>
            train.trainID === trainID ? { ...train, ...updatedTrain } : train
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

  const handleAddTrainButtonClick = () => {
    setShowModalAdd(true); // This will open the modal when the button is clicked
  };

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  const columns: ColumnDef<Train>[] = [
    { accessorKey: "trainID", header: "Train ID" },
    { accessorKey: "train_name", header: "Train" },
    { accessorKey: "startStation", header: "Ga đi" },
    { accessorKey: "endStation", header: "Ga đến" },
    { accessorKey: "departTime", header: "Giờ khởi hành" },
    { accessorKey: "price", header: "Giá vé" },
    { accessorKey: "total_seats", header: "Chỗ ngồi" },
    {
      id: "actions",
      enableHiding: false,
      header: "Action",
      cell: ({ row }) => {
        const train = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(train.trainID);
                  }
                }}
              >
                Copy Train ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleView(train.trainID)}>
                View Train Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdate(train.trainID)}>
                Update Train Info
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(train.trainID)}>
                Delete Train
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredData, // Sử dụng filteredData
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) return <div>Đang tải dữ liệu...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="w-full">
      <div
        className="flex items-center py-4"
        style={{ marginBottom: "20px", justifyContent: "space-between" }}
      >
        <div style={{ position: "relative", width: "300px" }}>
          <input
            type="text"
            placeholder="Search trains..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.customSearch}
          />
          <FiSearch
            style={{
              position: "absolute",
              right: "20px",
              top: "12px",
            }}
          />
        </div>
        <Button
          style={{ background: "#ff6600", fontWeight: "bold" }}
          onClick={handleAddTrainButtonClick} // Trigger modal opening
        >
          + Add Train
        </Button>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Modal for Add, View, and Update Train */}
      {/* Modal Add Train */}
      <Dialog
        open={showModalAdd}
        onOpenChange={(open) => setShowModalAdd(open)}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm Chuyến Tàu Mới</DialogTitle>
            <DialogDescription>
              Add a new train by filling in the details below.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* First Column */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="trainID" className="text-right">
                Train ID
              </Label>
              <Input
                id="trainID"
                name="trainID"
                value={newTrain.trainID}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="train_name" className="text-right">
                Train Name
              </Label>
              <Input
                id="train_name"
                name="train_name"
                value={newTrain.train_name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startStation" className="text-right">
                Ga đi
              </Label>
              <Input
                id="startStation"
                name="startStation"
                value={newTrain.startStation}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endStation" className="text-right">
                Ga đến
              </Label>
              <Input
                id="endStation"
                name="endStation"
                value={newTrain.endStation}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="departTime" className="text-right">
                Giờ khởi hành
              </Label>
              <Input
                id="departTime"
                name="departTime"
                type="time"
                value={newTrain.departTime}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="arrivalTime" className="text-right">
                Giờ đến
              </Label>
              <Input
                id="arrivalTime"
                name="arrivalTime"
                type="time"
                value={newTrain.arrivalTime}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>

            {/* Second Column */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Giá vé
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={newTrain.price}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="total_seats" className="text-right">
                Chỗ ngồi
              </Label>
              <Input
                id="total_seats"
                name="total_seats"
                type="number"
                value={newTrain.total_seats}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_date" className="text-right">
                Ngày bắt đầu
              </Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={newTrain.start_date}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end_date" className="text-right">
                Ngày kết thúc
              </Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                value={newTrain.end_date}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Thời gian hành trình (phút)
              </Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                value={newTrain.duration}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="route_id" className="text-right">
                Route ID
              </Label>
              <Input
                id="route_id"
                name="route_id"
                value={newTrain.route_id}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="schedule_id" className="text-right">
                Schedule ID
              </Label>
              <Input
                id="schedule_id"
                name="schedule_id"
                value={newTrain.schedule_id}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recurrence_id" className="text-right">
                Recurrence ID
              </Label>
              <Input
                id="recurrence_id"
                name="recurrence_id"
                value={newTrain.recurrence_id}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="days_of_week" className="text-right">
                Days of the Week
              </Label>
              <Input
                id="days_of_week"
                name="days_of_week"
                value={newTrain.days_of_week}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {}}>
              Cancel
            </Button>
            <Button onClick={handleAddTrain}>Thêm Chuyến Tàu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal View Train */}
      <Dialog
        open={showModalView}
        onOpenChange={(open) => setShowModalView(open)}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết chuyến tàu</DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về chuyến tàu được chọn.
            </DialogDescription>
          </DialogHeader>

          {!selectedTrainView ? (
            <div>Đang tải dữ liệu...</div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Train ID:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.trainID || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Train Name:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.train_name || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Ga đi:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.startStation || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Ga đến:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.endStation || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Giờ khởi hành:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.departTime || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Giờ đến:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.arrivalTime || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Giá vé:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.price !== undefined
                    ? selectedTrainView.price
                    : "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Chỗ ngồi:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.total_seats !== undefined
                    ? selectedTrainView.total_seats
                    : "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Ngày bắt đầu:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.start_date
                    ? new Date(
                        selectedTrainView.start_date
                      ).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Ngày kết thúc:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.end_date
                    ? new Date(selectedTrainView.end_date).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold min-w-[120px]">
                  Thời gian hành trình (phút):
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.duration !== undefined
                    ? selectedTrainView.duration
                    : "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Route ID:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.route_id !== undefined
                    ? selectedTrainView.route_id
                    : "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Schedule ID:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.schedule_id !== undefined
                    ? selectedTrainView.schedule_id
                    : "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Recurrence ID:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.recurrence_id !== undefined
                    ? selectedTrainView.recurrence_id
                    : "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Days of the Week:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTrainView.days_of_week || "N/A"}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowModalView(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal Update Train */}
      <Dialog
        open={showModalUpdate}
        onOpenChange={(open) => setShowModalUpdate(open)}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cập Nhật Chuyến Tàu</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin chuyến tàu bằng cách điền vào các trường dưới
              đây.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="trainID" className="text-right">
                Train ID
              </Label>
              <Input
                id="trainID"
                name="trainID"
                value={selectedTrainUpdate?.trainID || ""}
                onChange={handleInputChange}
                className="col-span-3"
                disabled
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="train_name" className="text-right">
                Train Name
              </Label>
              <Input
                id="train_name"
                name="train_name"
                value={selectedTrainUpdate?.train_name || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startStation" className="text-right">
                Ga đi
              </Label>
              <Input
                id="startStation"
                name="startStation"
                value={selectedTrainUpdate?.startStation || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endStation" className="text-right">
                Ga đến
              </Label>
              <Input
                id="endStation"
                name="endStation"
                value={selectedTrainUpdate?.endStation || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="departTime" className="text-right">
                Giờ khởi hành
              </Label>
              <Input
                id="departTime"
                name="departTime"
                type="time"
                value={selectedTrainUpdate?.departTime || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="arrivalTime" className="text-right">
                Giờ đến
              </Label>
              <Input
                id="arrivalTime"
                name="arrivalTime"
                type="time"
                value={selectedTrainUpdate?.arrivalTime || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Giá vé
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={selectedTrainUpdate?.price || 0}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="total_seats" className="text-right">
                Chỗ ngồi
              </Label>
              <Input
                id="total_seats"
                name="total_seats"
                type="number"
                value={selectedTrainUpdate?.total_seats || 0}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_date" className="text-right">
                Ngày bắt đầu
              </Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={selectedTrainUpdate?.start_date || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end_date" className="text-right">
                Ngày kết thúc
              </Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                value={selectedTrainUpdate?.end_date || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Thời gian hành trình (phút)
              </Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                value={selectedTrainUpdate?.duration || 0}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="route_id" className="text-right">
                Route ID
              </Label>
              <Input
                id="route_id"
                name="route_id"
                value={selectedTrainUpdate?.route_id || 0}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="schedule_id" className="text-right">
                Schedule ID
              </Label>
              <Input
                id="schedule_id"
                name="schedule_id"
                value={selectedTrainUpdate?.schedule_id || 0}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recurrence_id" className="text-right">
                Recurrence ID
              </Label>
              <Input
                id="recurrence_id"
                name="recurrence_id"
                value={selectedTrainUpdate?.recurrence_id || 0}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="days_of_week" className="text-right">
                Days of the Week
              </Label>
              <Input
                id="days_of_week"
                name="days_of_week"
                value={selectedTrainUpdate?.days_of_week || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModalUpdate(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTrain}>Cập Nhật Chuyến Tàu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
