"use client";

import * as React from "react";
import { FiSearch } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { UpdateSegmentPrices } from "../../components/UpdateSegmentPrices/UpdateSegmentPrices";
import {
  Dialog,
  DialogFooter,
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
  from_station_id: number;
  to_station_id: number;
  base_price: number;
  duration: number;
  from?: string; // Tên ga đi (nếu có)
  to?: string; // Tên ga đến (nếu có)
  departTime?: string; // Giờ khởi hành của chặng
  arrivalTime?: string; // Giờ đến của chặng
  price?: number; // Giá vé của chặng
};

type Stop = {
  station_id: number;
  stop_order: number;
  arrival_time?: string;
  departure_time?: string;
  stop_duration?: number;
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
  stops: Stop[];
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

  const [newTrain, setNewTrain] = React.useState<Partial<Train>>({
    stops: [],
    segments: [],
  });
  const [selectedTrainView, setSelectedTrainView] =
    React.useState<Train | null>(null);
  const [selectedTrainUpdate, setSelectedTrainUpdate] =
    React.useState<Train | null>(null);

  // State để quản lý stops và segments trong modal
  const [newStop, setNewStop] = React.useState<Partial<Stop>>({});
  const [newSegment, setNewSegment] = React.useState<Partial<Segment>>({});

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

  React.useEffect(() => {
    fetchData();
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

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
        toast.success("Chuyến tàu đã được xóa thành công!");
      } catch (error) {
        console.error("Error deleting train:", error);
        toast.error(
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

  const handleStopInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewStop((prevStop) => ({
      ...prevStop,
      [name]: value,
    }));
  };

  const handleSegmentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSegment((prevSegment) => ({
      ...prevSegment,
      [name]: value,
    }));
  };

  const addStop = () => {
    if (!newStop.station_id || isNaN(newStop.station_id)) {
      toast.error("Vui lòng nhập ID ga hợp lệ");
      return;
    }

    setNewTrain((prevTrain) => ({
      ...prevTrain,
      stops: [
        ...(prevTrain.stops || []),
        {
          station_id: parseInt(newStop.station_id!.toString()),
          stop_order: (prevTrain.stops?.length || 0) + 1,
          arrival_time: newStop.arrival_time || undefined,
          departure_time: newStop.departure_time || undefined,
          stop_duration: newStop.stop_duration || 0,
        },
      ],
    }));
    setNewStop({});
    toast.success("Đã thêm ga thành công!");
  };

  const addSegment = () => {
    if (
      !newSegment.from_station_id ||
      !newSegment.to_station_id ||
      isNaN(newSegment.base_price!) ||
      isNaN(newSegment.duration!)
    ) {
      toast.error("Vui lòng nhập đầy đủ thông tin chặng hợp lệ");
      return;
    }

    setNewTrain((prevTrain) => ({
      ...prevTrain,
      segments: [
        ...(prevTrain.segments || []),
        {
          from_station_id: parseInt(newSegment.from_station_id!.toString()),
          to_station_id: parseInt(newSegment.to_station_id!.toString()),
          base_price: parseFloat(newSegment.base_price!.toString()),
          duration: parseInt(newSegment.duration!.toString()),
        },
      ],
    }));
    setNewSegment({});
    toast.success("Đã thêm chặng thành công!");
  };

  const handleAddTrain = async () => {
    const requiredFields: (keyof Train)[] = [
      "trainID",
      "train_name",
      "total_seats",
      "departTime",
      "arrivalTime",
      "start_date",
      "end_date",
      "days_of_week",
    ];

    for (const field of requiredFields) {
      if (!newTrain[field as keyof Train]) {
        toast.error(`Vui lòng điền đầy đủ thông tin cho trường ${field}!`);
        return;
      }
    }

    if (!newTrain.stops || newTrain.stops.length < 2) {
      toast.error("Phải có ít nhất 2 ga!");
      return;
    }

    if (
      !newTrain.segments ||
      newTrain.segments.length !== newTrain.stops.length - 1
    ) {
      toast.error("Số chặng phải bằng số ga trừ 1!");
      return;
    }

    // Kiểm tra định dạng thời gian
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (
      !timeRegex.test(newTrain.departTime!) || // Sử dụng ! vì đã kiểm tra trong requiredFields
      !timeRegex.test(newTrain.arrivalTime!) // Sử dụng ! vì đã kiểm tra trong requiredFields
    ) {
      toast.error("Thời gian phải ở định dạng HH:MM!");
      return;
    }

    // Kiểm tra định dạng ngày
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (
      !dateRegex.test(newTrain.start_date!) || // Sử dụng ! vì đã kiểm tra trong requiredFields
      !dateRegex.test(newTrain.end_date!) // Sử dụng ! vì đã kiểm tra trong requiredFields
    ) {
      toast.error("Ngày phải ở định dạng YYYY-MM-DD!");
      return;
    }

    // Kiểm tra end_date không trước start_date
    if (new Date(newTrain.end_date!) < new Date(newTrain.start_date!)) {
      // Sử dụng ! vì đã kiểm tra trong requiredFields
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu!");
      return;
    }

    // Kiểm tra days_of_week
    if (!/^[01]{7}$/.test(newTrain.days_of_week!)) {
      // Sử dụng ! vì đã kiểm tra trong requiredFields
      toast.error("days_of_week phải là chuỗi 7 ký tự 0 hoặc 1!");
      return;
    }

    try {
      const response = await fetch("/api/trains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainID: parseInt(newTrain.trainID!.toString()), // Sử dụng ! và chuyển thành string
          train_name: newTrain.train_name!,
          total_seats: parseInt(newTrain.total_seats!.toString()), // Sử dụng ! và chuyển thành string
          departTime: newTrain.departTime!,
          arrivalTime: newTrain.arrivalTime!,
          start_date: newTrain.start_date!,
          end_date: newTrain.end_date!,
          days_of_week: newTrain.days_of_week!,
          stops: newTrain.stops,
          segments: newTrain.segments,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTrainData((prevRecords) => [...prevRecords, data as Train]);
        toast.success("Chuyến tàu đã được thêm thành công!");
        setShowModalAdd(false);
        setNewTrain({ stops: [], segments: [] });
      } else {
        toast.error(data.error || "Thêm chuyến tàu thất bại");
      }
    } catch (error) {
      console.error("Error adding train:", error);
      toast.error("Có lỗi xảy ra khi thêm chuyến tàu");
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
      toast.error("Có lỗi xảy ra khi xem chuyến tàu");
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
      toast.error("No train selected for update.");
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
        toast.success("Chuyến tàu đã được cập nhật thành công!");
        setShowModalUpdate(false);
      } else {
        toast.error(data.error || "Cập nhật chuyến tàu thất bại");
      }
    } catch (error) {
      console.error("Error updating train:", error);
      toast.error("Có lỗi xảy ra khi cập nhật chuyến tàu");
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
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
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

            {/* Phần thêm ga (stops) */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Thêm Ga</h3>
              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="station_id" className="text-right">
                  ID Ga
                </Label>
                <Input
                  id="station_id"
                  name="station_id"
                  type="number"
                  value={newStop.station_id || ""}
                  onChange={handleStopInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="arrival_time" className="text-right">
                  Giờ đến
                </Label>
                <Input
                  id="arrival_time"
                  name="arrival_time"
                  type="time"
                  value={newStop.arrival_time || ""}
                  onChange={handleStopInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="departure_time" className="text-right">
                  Giờ đi
                </Label>
                <Input
                  id="departure_time"
                  name="departure_time"
                  type="time"
                  value={newStop.departure_time || ""}
                  onChange={handleStopInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="stop_duration" className="text-right">
                  Thời gian dừng (phút)
                </Label>
                <Input
                  id="stop_duration"
                  name="stop_duration"
                  type="number"
                  value={newStop.stop_duration || ""}
                  onChange={handleStopInputChange}
                  className="col-span-3"
                />
              </div>
              <Button onClick={addStop} className="mt-2">
                Thêm Ga
              </Button>

              {/* Hiển thị danh sách ga đã thêm */}
              {newTrain.stops && newTrain.stops.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium">Danh sách ga:</h4>
                  <ul className="list-disc pl-5">
                    {newTrain.stops.map((stop, index) => (
                      <li key={index}>
                        Ga {stop.station_id} (Thứ tự: {stop.stop_order}, Đến:{" "}
                        {stop.arrival_time || "--:--"}, Đi:{" "}
                        {stop.departure_time || "--:--"}, Dừng:{" "}
                        {stop.stop_duration} phút)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Phần thêm chặng (segments) */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Thêm Chặng</h3>
              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="from_station_id" className="text-right">
                  ID Ga đi
                </Label>
                <Input
                  id="from_station_id"
                  name="from_station_id"
                  type="number"
                  value={newSegment.from_station_id || ""}
                  onChange={handleSegmentInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="to_station_id" className="text-right">
                  ID Ga đến
                </Label>
                <Input
                  id="to_station_id"
                  name="to_station_id"
                  type="number"
                  value={newSegment.to_station_id || ""}
                  onChange={handleSegmentInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="base_price" className="text-right">
                  Giá cơ bản (VND)
                </Label>
                <Input
                  id="base_price"
                  name="base_price"
                  type="number"
                  value={newSegment.base_price || ""}
                  onChange={handleSegmentInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="duration" className="text-right">
                  Thời gian (phút)
                </Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  value={newSegment.duration || ""}
                  onChange={handleSegmentInputChange}
                  className="col-span-3"
                />
              </div>
              <Button onClick={addSegment} className="mt-2">
                Thêm Chặng
              </Button>

              {/* Hiển thị danh sách chặng đã thêm */}
              {newTrain.segments && newTrain.segments.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium">Danh sách chặng:</h4>
                  <ul className="list-disc pl-5">
                    {newTrain.segments.map((segment, index) => (
                      <li key={index}>
                        {segment.from_station_id} → {segment.to_station_id}{" "}
                        (Giá: {segment.base_price} VND, Thời gian:{" "}
                        {segment.duration} phút)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                  {selectedTrainView?.segments?.length > 0 ? (
                    selectedTrainView.segments.map((segment, index) => (
                      <div key={index} className="border p-2 rounded">
                        <div className="font-medium">
                          {segment.from || `Ga ${segment.from_station_id}`} →{" "}
                          {segment.to || `Ga ${segment.to_station_id}`}
                        </div>
                        <div className="text-sm">
                          Giờ: {segment.departTime || "--:--"} -{" "}
                          {segment.arrivalTime || "--:--"}
                        </div>
                        <div className="text-sm">
                          Giá:{" "}
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(segment.price || segment.base_price || 0)}
                        </div>
                        <div className="text-sm">
                          Thời gian: {segment.duration} phút
                        </div>
                      </div>
                    ))
                  ) : (
                    <div>Không có thông tin chặng</div>
                  )}
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
