// ./src/app/historyTicket/data-table.tsx
"use client";

import * as React from "react";
import { FiSearch } from "react-icons/fi";
import { Button } from "@/components/ui/button";
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

export type Ticket = {
  ticket_id: number;
  passport: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  coach_seat: string;
  travel_date: string;
  startStation: string;
  endStation: string;
  departTime: string;
  arrivalTime: string;
  price: number;
  trainID: number;
  qr_code: string;
  payment_status: string;
  refund_status: string;
  passenger_type: string;
  seat_number?: string;
  train_name?: string;
};

export function DataTableTicket() {
  const [ticketData, setTicketData] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState("");
  const [debouncedSearchText, setDebouncedSearchText] =
    React.useState(searchText);
  const [showModalView, setShowModalView] = React.useState(false);
  const [showModalUpdate, setShowModalUpdate] = React.useState(false);
  const [limit, setLimit] = React.useState(25);
  const [showRequestedTickets, setShowRequestedTickets] = React.useState(false);
  const [selectedTicketView, setSelectedTicketView] =
    React.useState<Ticket | null>(null);
  const [selectedTicketUpdate, setSelectedTicketUpdate] =
    React.useState<Ticket | null>(null);
  const [pageIndex, setPageIndex] = React.useState(1); // bắt đầu từ trang 1
  const [isLastPage, setIsLastPage] = React.useState(false); // Trạng thái kiểm tra trang cuối

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/ticket?page=${pageIndex}&limit=${limit}`);
        if (!res.ok) {
          console.error("Failed to fetch tickets. Status:", res.status);
          throw new Error("Failed to fetch tickets");
        }
        const data = await res.json();
        setTicketData(data);
        // Kiểm tra nếu số lượng vé nhỏ hơn limit, thì đây là trang cuối
        setIsLastPage(data.length < limit);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(
          `Không thể tải dữ liệu: ${
            error instanceof Error ? error.message : "Lỗi không xác định"
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [limit, pageIndex]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  const filteredData = React.useMemo(() => {
    const lowercasedSearchText = debouncedSearchText.toLowerCase();
    return ticketData.filter((item) => {
      return (
        (item.passport?.toLowerCase() || "").includes(lowercasedSearchText) ||
        (item.fullName?.toLowerCase() || "").includes(lowercasedSearchText) ||
        (item.phoneNumber?.toLowerCase() || "").includes(
          lowercasedSearchText
        ) ||
        (item.email?.toLowerCase() || "").includes(lowercasedSearchText) ||
        (item.startStation?.toLowerCase() || "").includes(
          lowercasedSearchText
        ) ||
        (item.endStation?.toLowerCase() || "").includes(lowercasedSearchText) ||
        item.trainID.toString().includes(lowercasedSearchText) ||
        item.ticket_id.toString().includes(lowercasedSearchText) ||
        (item.qr_code?.toLowerCase() || "").includes(lowercasedSearchText) ||
        (item.coach_seat?.toLowerCase() || "").includes(lowercasedSearchText) ||
        (item.travel_date?.toLowerCase() || "").includes(lowercasedSearchText)
      );
    });
  }, [ticketData, debouncedSearchText]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (showModalUpdate && selectedTicketUpdate) {
      setSelectedTicketUpdate((prevTicket) => ({
        ...prevTicket!,
        [name]: value,
      }));
    }
  };

  function formatDate(dateString: string): string {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("vi-VN");
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }

  const handleView = (ticket_id: number) => {
    const selectedTicket = ticketData.find(
      (ticket) => ticket.ticket_id === ticket_id
    );
    if (selectedTicket) {
      const formattedTicket = {
        ...selectedTicket,
        travel_date: formatDate(selectedTicket.travel_date),
      };
      setSelectedTicketView(formattedTicket);
      setShowModalView(true);
    } else {
      setError("Không tìm thấy vé trong dữ liệu cục bộ");
    }
  };

  const handleUpdate = (ticket_id: number) => {
    const selected = ticketData.find(
      (ticket) => ticket.ticket_id === ticket_id
    );
    if (selected) {
      setSelectedTicketUpdate(selected);
      setShowModalUpdate(true);
    }
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicketUpdate) {
      alert("Không có vé nào được chọn để cập nhật.");
      return;
    }

    const { ticket_id, passport, fullName, phoneNumber, email } =
      selectedTicketUpdate;

    try {
      const response = await fetch(`/api/ticket`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id,
          passport,
          fullName,
          phoneNumber,
          email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Cập nhật vé thất bại");
      }

      const updatedTicket = await response.json();
      console.log("Vé đã được cập nhật:", updatedTicket);

      setTicketData((prevRecords) =>
        prevRecords.map((ticket) =>
          ticket.ticket_id === ticket_id
            ? { ...ticket, fullName, phoneNumber, email, passport }
            : ticket
        )
      );
      setError(null);
      setShowModalUpdate(false);
    } catch (error) {
      console.error("Lỗi khi cập nhật vé:", error);
      setError(
        error instanceof Error ? error.message : "Có lỗi xảy ra khi cập nhật vé"
      );
    }
  };

  const columns: ColumnDef<Ticket>[] = [
    { accessorKey: "ticket_id", header: "Mã vé" },
    { accessorKey: "fullName", header: "Họ và tên" },
    { accessorKey: "passport", header: "Passport" },
    { accessorKey: "phoneNumber", header: "Số điện thoại" },
    {
      accessorKey: "coach_seat",
      header: "Toa - Ghế",
      cell: ({ row }) => row.original.coach_seat || "N/A",
    },
    {
      accessorKey: "travel_date",
      header: "Ngày đi",
      cell: ({ row }) => formatDate(row.original.travel_date),
    },
    {
      accessorKey: "startStation",
      header: "Ga đi - đến",
      cell: ({ row }) => (
        <span>
          {row.original.startStation} - {row.original.endStation}
        </span>
      ),
    },
    {
      accessorKey: "departTime",
      header: "Giờ đi - đến",
      cell: ({ row }) => (
        <span>
          {row.original.departTime} - {row.original.arrivalTime}
        </span>
      ),
    },
    {
      accessorKey: "price",
      header: "Giá vé",
      cell: ({ row }) => formatCurrency(row.original.price),
    },
    {
      accessorKey: "refund_status",
      header: "Trạng thái",
      cell: ({ row }) => {
        const status = row.original.refund_status;
        let color = "";
        if (status === "Requested") color = "text-orange-500";
        if (status === "Refunded") color = "text-green-500";
        return <span className={color}>{status || "Không có"}</span>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      header: "Thao tác",
      cell: ({ row }) => {
        const ticket = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Mở menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  navigator.clipboard.writeText(ticket.ticket_id.toString())
                }
              >
                Sao chép mã vé
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleView(ticket.ticket_id)}>
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdate(ticket.ticket_id)}>
                Cập nhật thông tin
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
    initialState: {
      pagination: {
        pageSize: limit,
      },
    },
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
            placeholder="Tìm kiếm vé..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-8 pr-4"
          />
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
        </div>
        <Button
          onClick={() => setShowRequestedTickets(!showRequestedTickets)}
          variant={showRequestedTickets ? "outline" : "default"}
        >
          {showRequestedTickets ? "Xem tất cả vé" : "Xem vé yêu cầu trả"}
        </Button>
      </div>

      {showRequestedTickets ? (
        <RequestedTicketsTable />
      ) : (
        <>
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
                      Không tìm thấy vé nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((prev) => Math.max(prev - 1, 1))}
              disabled={pageIndex === 1}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((prev) => prev + 1)}
              disabled={isLastPage} // Vô hiệu hóa nút "Sau" khi là trang cuối
            >
              Sau
            </Button>
            <select
              className="border rounded p-1"
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
                setLimit(Number(e.target.value));
              }}
              aria-label="Chọn số lượng mục hiển thị mỗi trang"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  Hiển thị {pageSize}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* View Ticket Modal */}
      <Dialog open={showModalView} onOpenChange={setShowModalView}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết vé</DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về vé được chọn
            </DialogDescription>
          </DialogHeader>
          {selectedTicketView ? (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Mã vé:</Label>
                <div className="col-span-3">{selectedTicketView.ticket_id}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Tên tàu:</Label>
                <div className="col-span-3">
                  {selectedTicketView.train_name || "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Họ tên:</Label>
                <div className="col-span-3">{selectedTicketView.fullName}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Passport:</Label>
                <div className="col-span-3">
                  {selectedTicketView.passport || "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Số điện thoại:</Label>
                <div className="col-span-3">
                  {selectedTicketView.phoneNumber || "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Email:</Label>
                <div className="col-span-3">
                  {selectedTicketView.email || "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Toa - Ghế:</Label>
                <div className="col-span-3">
                  {selectedTicketView.coach_seat || "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Ngày đi:</Label>
                <div className="col-span-3">
                  {selectedTicketView.travel_date}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Ga đi:</Label>
                <div className="col-span-3">
                  {selectedTicketView.startStation || "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Ga đến:</Label>
                <div className="col-span-3">
                  {selectedTicketView.endStation || "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Giờ đi:</Label>
                <div className="col-span-3">
                  {selectedTicketView.departTime || "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Giờ đến:</Label>
                <div className="col-span-3">
                  {selectedTicketView.arrivalTime || "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Giá vé:</Label>
                <div className="col-span-3">
                  {formatCurrency(selectedTicketView.price)}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">
                  Trạng thái thanh toán:
                </Label>
                <div className="col-span-3">
                  {selectedTicketView.payment_status || "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">
                  Trạng thái hoàn tiền:
                </Label>
                <div className="col-span-3">
                  {selectedTicketView.refund_status || "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">
                  Loại hành khách:
                </Label>
                <div className="col-span-3">
                  {selectedTicketView.passenger_type || "N/A"}
                </div>
              </div>
            </div>
          ) : (
            <div>Đang tải thông tin vé...</div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowModalView(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Ticket Modal */}
      <Dialog open={showModalUpdate} onOpenChange={setShowModalUpdate}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Cập nhật thông tin vé</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin hành khách cho vé
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ticket_id" className="text-right">
                Mã vé
              </Label>
              <Input
                id="ticket_id"
                value={selectedTicketUpdate?.ticket_id || ""}
                className="col-span-3"
                disabled
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="passport" className="text-right">
                Passport
              </Label>
              <Input
                id="passport"
                name="passport"
                value={selectedTicketUpdate?.passport || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullName" className="text-right">
                Họ và tên
              </Label>
              <Input
                id="fullName"
                name="fullName"
                value={selectedTicketUpdate?.fullName || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phoneNumber" className="text-right">
                Số điện thoại
              </Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={selectedTicketUpdate?.phoneNumber || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                value={selectedTicketUpdate?.email || ""}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModalUpdate(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateTicket}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestedTicketsTable() {
  const [requestedTickets, setRequestedTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchRequestedTickets = async () => {
      try {
        const res = await fetch("/api/ticket?refund_status=Requested");
        if (!res.ok) {
          throw new Error("Không thể lấy danh sách vé yêu cầu hoàn tiền");
        }
        const data = await res.json();
        setRequestedTickets(data);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Không thể tải dữ liệu"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRequestedTickets();
  }, []);

  if (loading)
    return <div className="flex justify-center py-8">Đang tải dữ liệu...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã vé</TableHead>
            <TableHead>Họ và tên</TableHead>
            <TableHead>Passport</TableHead>
            <TableHead>Số điện thoại</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requestedTickets.length > 0 ? (
            requestedTickets.map((ticket) => (
              <TableRow key={ticket.ticket_id}>
                <TableCell>{ticket.ticket_id}</TableCell>
                <TableCell>{ticket.fullName}</TableCell>
                <TableCell>{ticket.passport || "N/A"}</TableCell>
                <TableCell>{ticket.phoneNumber || "N/A"}</TableCell>
                <TableCell className="text-orange-500">
                  {ticket.refund_status}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Không có vé nào yêu cầu hoàn tiền
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
