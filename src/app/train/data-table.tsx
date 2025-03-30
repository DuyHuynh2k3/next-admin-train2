"use client";

import * as React from "react";
import { FiSearch } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { UpdateSegmentPrices } from "../../components/UpdateSegmentPrices/UpdateSegmentPrices";
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
import { toast } from "sonner";

type Segment = {
  from: string;
  to: string;
  price: number;
  departTime: string;
  arrivalTime: string;
  from_station_id: number;
  to_station_id: number;
};

type Train = {
  trainID: number;
  train_name: string;
  total_seats: number;
  startStation: string;
  endStation: string;
  departTime: string;
  arrivalTime: string;
  price: number;
  duration: number;
  start_date: string;
  end_date: string;
  days_of_week: string;
  schedule_id: number;
  recurrence_id?: number;
  status?: string;
  segments: Segment[];
};

export function DataTableTrain() {
  const [trainData, setTrainData] = React.useState<Train[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState("");
  const [debouncedSearchText, setDebouncedSearchText] = React.useState("");
  const [showModalAdd, setShowModalAdd] = React.useState(false);
  const [showModalView, setShowModalView] = React.useState(false);
  const [showModalUpdate, setShowModalUpdate] = React.useState(false);

  const [newTrain, setNewTrain] = React.useState<Partial<Train>>({});
  const [selectedTrainView, setSelectedTrainView] =
    React.useState<Train | null>(null);
  const [selectedTrainUpdate, setSelectedTrainUpdate] =
    React.useState<Train | null>(null);

  // Định nghĩa hàm fetchData ở cấp độ component
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trains");
      if (!res.ok) throw new Error("Failed to fetch trains");
      const data = await res.json();
      setTrainData(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error instanceof Error ? error.message : "Failed to load data");
      toast.error("Lỗi khi tải dữ liệu tàu");
    } finally {
      setLoading(false);
    }
  };

  // Sử dụng useEffect với fetchData
  React.useEffect(() => {
    fetchData();
  }, []);

  // Debounce search text
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Filter data based on debounced search text
  const filteredData = React.useMemo(() => {
    const lowercasedSearchText = debouncedSearchText.toLowerCase();
    return trainData.filter((item) => {
      return (
        item.trainID.toString().toLowerCase().includes(lowercasedSearchText) ||
        item.train_name?.toLowerCase().includes(lowercasedSearchText) ||
        item.startStation?.toLowerCase().includes(lowercasedSearchText) ||
        item.endStation?.toLowerCase().includes(lowercasedSearchText) ||
        item.departTime?.toLowerCase().includes(lowercasedSearchText)
      );
    });
  }, [trainData, debouncedSearchText]);

  const handleDelete = async (trainID: number) => {
    const confirmDelete = window.confirm(
      "Bạn có chắc muốn xóa chuyến tàu này?"
    );
    if (confirmDelete) {
      try {
        const response = await fetch(`/api/trains?trainID=${trainID}`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to delete train");
        }

        setTrainData((prevRecords) =>
          prevRecords.filter((train) => train.trainID !== trainID)
        );
        alert("Chuyến tàu đã được xóa thành công!");
      } catch (error) {
        console.error("Error deleting train:", error);
        alert(
          "Có lỗi xảy ra khi xóa chuyến tàu: " +
            (error instanceof Error ? error.message : "")
        );
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
      "total_seats",
      "start_date",
      "end_date",
      "days_of_week",
    ];

    for (let field of requiredFields) {
      if (!newTrain[field as keyof Train]) {
        alert(`Vui lòng điền đầy đủ thông tin cho trường ${field}!`);
        return;
      }
    }

    try {
      const response = await fetch("/api/trains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainID: parseInt(newTrain.trainID?.toString() || "0"),
          train_name: newTrain.train_name,
          total_seats: parseInt(newTrain.total_seats?.toString() || "0"),
          startStation: newTrain.startStation,
          endStation: newTrain.endStation,
          departTime: newTrain.departTime,
          arrivalTime: newTrain.arrivalTime,
          start_date: newTrain.start_date,
          end_date: newTrain.end_date,
          days_of_week: newTrain.days_of_week,
          stops: [
            {
              station_id: newTrain.startStation,
              arrival_time: "00:00",
              departure_time: newTrain.departTime,
              stop_duration: 0,
            },
            {
              station_id: newTrain.endStation,
              arrival_time: newTrain.arrivalTime,
              departure_time: "00:00",
              stop_duration: 0,
            },
          ],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTrainData((prevRecords) => [...prevRecords, data]);
        alert("Chuyến tàu đã được thêm thành công!");
        setShowModalAdd(false);
        setNewTrain({});
      } else {
        alert(data.error || "Thêm chuyến tàu thất bại");
      }
    } catch (error) {
      console.error("Error adding train:", error);
      alert("Có lỗi xảy ra khi thêm chuyến tàu");
    }
  };

  const handleView = async (trainID: number) => {
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

  const handleUpdate = (trainID: number) => {
    const selected = trainData.find((train) => train.trainID === trainID);
    if (selected) {
      setSelectedTrainUpdate(selected);
      setShowModalUpdate(true);
    }
  };

  const handleUpdateTrain = async () => {
    if (!selectedTrainUpdate) {
      alert("No train selected for update.");
      return;
    }

    try {
      const response = await fetch(`/api/trains`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainID: selectedTrainUpdate.trainID,
          train_name: selectedTrainUpdate.train_name,
          total_seats: selectedTrainUpdate.total_seats,
          departTime: selectedTrainUpdate.departTime,
          arrivalTime: selectedTrainUpdate.arrivalTime,
          start_date: selectedTrainUpdate.start_date,
          end_date: selectedTrainUpdate.end_date,
          days_of_week: selectedTrainUpdate.days_of_week,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (response.ok) {
        setTrainData((prevRecords) =>
          prevRecords.map((train) =>
            train.trainID === selectedTrainUpdate.trainID
              ? selectedTrainUpdate
              : train
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

  const columns: ColumnDef<Train>[] = [
    { accessorKey: "trainID", header: "Mã tàu" },
    { accessorKey: "train_name", header: "Tên tàu" },
    { accessorKey: "startStation", header: "Ga đi" },
    { accessorKey: "endStation", header: "Ga đến" },
    {
      accessorKey: "departTime",
      header: "Giờ khởi hành",
      cell: ({ row }) => row.original.departTime || "--:--",
    },
    {
      accessorKey: "price",
      header: "Giá vé",
      cell: ({ row }) => {
        const price = row.original.price || 0;
        return (
          <span className="font-medium">
            {new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(price)}
          </span>
        );
      },
    },
    {
      accessorKey: "duration",
      header: "Thời gian (phút)",
      cell: ({ row }) => row.original.duration || 0,
    },
    { accessorKey: "total_seats", header: "Số ghế" },
    {
      id: "actions",
      enableHiding: false,
      header: "Thao tác",
      cell: ({ row }) => {
        const train = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  navigator.clipboard.writeText(train.trainID.toString())
                }
              >
                Sao chép mã tàu
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleView(train.trainID)}>
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdate(train.trainID)}>
                Cập nhật
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(train.trainID)}
                className="text-red-500"
              >
                Xóa
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="flex items-center"
              >
                <UpdateSegmentPrices
                  trainID={train.trainID}
                  onUpdate={fetchData}
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading)
    return <div className="flex justify-center py-8">Đang tải dữ liệu...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="w-full p-4">
      <div className="flex items-center justify-between py-4">
        <div className="relative w-64">
          <Input
            type="text"
            placeholder="Tìm kiếm tàu..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-8 pr-4"
          />
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
        </div>
        <Button onClick={() => setShowModalAdd(true)}>+ Thêm tàu mới</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Không tìm thấy tàu nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Add Train */}
      <Dialog open={showModalAdd} onOpenChange={setShowModalAdd}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm Chuyến Tàu Mới</DialogTitle>
            <DialogDescription>
              Thêm chuyến tàu mới bằng cách điền thông tin bên dưới
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="trainID" className="text-right">
                Mã tàu
              </Label>
              <Input
                id="trainID"
                name="trainID"
                type="number"
                value={newTrain.trainID || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="train_name" className="text-right">
                Tên tàu
              </Label>
              <Input
                id="train_name"
                name="train_name"
                value={newTrain.train_name || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="total_seats" className="text-right">
                Số ghế
              </Label>
              <Input
                id="total_seats"
                name="total_seats"
                type="number"
                value={newTrain.total_seats || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startStation" className="text-right">
                Ga đi (ID)
              </Label>
              <Input
                id="startStation"
                name="startStation"
                type="number"
                value={newTrain.startStation || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endStation" className="text-right">
                Ga đến (ID)
              </Label>
              <Input
                id="endStation"
                name="endStation"
                type="number"
                value={newTrain.endStation || ""}
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
                value={newTrain.departTime || ""}
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
                value={newTrain.arrivalTime || ""}
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
                value={newTrain.start_date || ""}
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
                value={newTrain.end_date || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="days_of_week" className="text-right">
                Ngày chạy (VD: 1111100)
              </Label>
              <Input
                id="days_of_week"
                name="days_of_week"
                value={newTrain.days_of_week || ""}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="1 = chạy, 0 = nghỉ (Thứ 2 -> Chủ nhật)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModalAdd(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddTrain}>Thêm tàu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal View Train */}
      <Dialog open={showModalView} onOpenChange={setShowModalView}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết chuyến tàu</DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về chuyến tàu được chọn
            </DialogDescription>
          </DialogHeader>

          {selectedTrainView ? (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Mã tàu:</Label>
                <span className="col-span-3">{selectedTrainView.trainID}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Tên tàu:</Label>
                <span className="col-span-3">
                  {selectedTrainView.train_name}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Số ghế:</Label>
                <span className="col-span-3">
                  {selectedTrainView.total_seats}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Ga đi:</Label>
                <span className="col-span-3">
                  {selectedTrainView.startStation}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Ga đến:</Label>
                <span className="col-span-3">
                  {selectedTrainView.endStation}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Giờ khởi hành:</Label>
                <span className="col-span-3">
                  {selectedTrainView.departTime}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Giờ đến:</Label>
                <span className="col-span-3">
                  {selectedTrainView.arrivalTime}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Giá vé:</Label>
                <span className="col-span-3 font-medium">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(selectedTrainView?.price || 0)}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">
                  Thời gian (phút):
                </Label>
                <span className="col-span-3">{selectedTrainView.duration}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Ngày bắt đầu:</Label>
                <span className="col-span-3">
                  {selectedTrainView.start_date}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Ngày kết thúc:</Label>
                <span className="col-span-3">{selectedTrainView.end_date}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Ngày chạy:</Label>
                <span className="col-span-3">
                  {selectedTrainView.days_of_week}
                </span>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right font-bold">Chi tiết chặng:</Label>
                <div className="col-span-3 space-y-2">
                  {selectedTrainView.segments?.map((segment, index) => (
                    <div key={index} className="border p-2 rounded">
                      <div className="font-medium">
                        {segment.from} → {segment.to}
                      </div>
                      <div className="text-sm">
                        Giờ: {segment.departTime} - {segment.arrivalTime}
                      </div>
                      <div className="text-sm">
                        Giá:{" "}
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(segment.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>Đang tải dữ liệu...</div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowModalView(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Update Train */}
      <Dialog open={showModalUpdate} onOpenChange={setShowModalUpdate}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cập Nhật Chuyến Tàu</DialogTitle>
            <DialogDescription>Cập nhật thông tin chuyến tàu</DialogDescription>
          </DialogHeader>

          {selectedTrainUpdate && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainID" className="text-right">
                  Mã tàu
                </Label>
                <Input
                  id="trainID"
                  name="trainID"
                  value={selectedTrainUpdate.trainID}
                  className="col-span-3"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="train_name" className="text-right">
                  Tên tàu
                </Label>
                <Input
                  id="train_name"
                  name="train_name"
                  value={selectedTrainUpdate.train_name}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="total_seats" className="text-right">
                  Số ghế
                </Label>
                <Input
                  id="total_seats"
                  name="total_seats"
                  type="number"
                  value={selectedTrainUpdate.total_seats}
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
                  value={selectedTrainUpdate.departTime}
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
                  value={selectedTrainUpdate.arrivalTime}
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
                  value={selectedTrainUpdate.start_date}
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
                  value={selectedTrainUpdate.end_date}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="days_of_week" className="text-right">
                  Ngày chạy (VD: 1111100)
                </Label>
                <Input
                  id="days_of_week"
                  name="days_of_week"
                  value={selectedTrainUpdate.days_of_week}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="1 = chạy, 0 = nghỉ (Thứ 2 -> Chủ nhật)"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModalUpdate(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateTrain}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
