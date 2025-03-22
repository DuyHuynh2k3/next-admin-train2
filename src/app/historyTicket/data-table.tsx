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

export type Ticket = {
  ticket_id: string;
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
  trainID: string;
  qr_code: string;
  refund_status: string; // Thêm trạng thái refund_status
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
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(25);
  const [showRequestedTickets, setShowRequestedTickets] = React.useState(false); // State để quản lý hiển thị vé "Requested"

  const [selectedTicketView, setSelectedTicketView] =
    React.useState<Ticket | null>(null);
  const [selectedTicketUpdate, setSelectedTicketUpdate] =
    React.useState<Ticket | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/ticket?page=${page}&limit=${limit}`);
        if (!res.ok) {
          console.error("Failed to fetch tickets. Status:", res.status);
          throw new Error("Failed to fetch tickets");
        }
        const data = await res.json();
        console.log("Fetched data:", data);
        if (Array.isArray(data)) {
          setTicketData(data);
        } else {
          console.error("Fetched data is not an array:", data);
          setTicketData([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(`Failed to load data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, limit]);

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
    return ticketData.filter((item) => {
      return (
        item.passport.toLowerCase().includes(lowercasedSearchText) ||
        item.fullName.toLowerCase().includes(lowercasedSearchText) ||
        item.phoneNumber.toLowerCase().includes(lowercasedSearchText) ||
        item.email.toLowerCase().includes(lowercasedSearchText) ||
        item.startStation.toLowerCase().includes(lowercasedSearchText) ||
        item.endStation.toLowerCase().includes(lowercasedSearchText) ||
        item.trainID.toString().includes(lowercasedSearchText) ||
        item.ticket_id.toString().includes(lowercasedSearchText) ||
        item.qr_code.toLowerCase().includes(lowercasedSearchText) ||
        item.coach_seat.toLowerCase().includes(lowercasedSearchText) ||
        item.travel_date.toLowerCase().includes(lowercasedSearchText)
      );
    });
  }, [ticketData, debouncedSearchText]);

  const handleDelete = async (ticket_id: string) => {
    const confirmDelete = window.confirm("Bạn có chắc muốn xóa vé này?");
    if (confirmDelete) {
      try {
        const response = await fetch(`/api/ticket?ticket_id=${ticket_id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok) {
          setTicketData((prevRecords) =>
            prevRecords.filter((record) => record.ticket_id !== ticket_id)
          );
          setError(null);
        } else {
          setError(data.error || "Xóa vé thất bại");
        }
      } catch (error) {
        console.error("Error deleting ticket:", error);
        setError("Có lỗi xảy ra khi xóa vé");
      }
    }
  };

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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const handleView = (ticket_id: string) => {
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
      setError("Ticket not found in local data");
    }
  };

  const handleUpdate = (ticket_id: string) => {
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
      alert("No ticket selected for update.");
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (response.ok) {
        setTicketData((prevRecords) =>
          prevRecords.map((ticket) =>
            ticket.ticket_id === ticket_id
              ? { ...ticket, fullName, phoneNumber, email, passport }
              : ticket
          )
        );
        setError(null);
        setShowModalUpdate(false);
      } else {
        setError(data.error || "Cập nhật vé thất bại");
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      setError("Có lỗi xảy ra khi cập nhật vé");
    }
  };

  const columns: ColumnDef<Ticket>[] = [
    { accessorKey: "passport", header: "Passport" },
    { accessorKey: "fullName", header: "Họ và tên" },
    { accessorKey: "phoneNumber", header: "Số điện thoại" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "coach_seat", header: "(Toa - chỗ)" },
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
    { accessorKey: "price", header: "Giá vé" },
    {
      id: "actions",
      enableHiding: false,
      header: "Action",
      cell: ({ row }) => {
        const ticket = row.original;
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
                    navigator.clipboard.writeText(ticket.ticket_id);
                  }
                }}
              >
                Copy Ticket ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleView(ticket.ticket_id)}>
                View Ticket Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdate(ticket.ticket_id)}>
                Update Ticket Info
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(ticket.ticket_id)}>
                Delete Ticket
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
            placeholder="Search tickets..."
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
        <Button onClick={() => setShowRequestedTickets(!showRequestedTickets)}>
          {showRequestedTickets ? "Xem tất cả vé" : "Xem vé yêu cầu trả"}
        </Button>
      </div>
      {showRequestedTickets ? (
        <RequestedTicketsTable />
      ) : (
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
      )}
      {/* Modal View Ticket */}
      <Dialog
        open={showModalView}
        onOpenChange={(open) => setShowModalView(open)}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết vé</DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về vé được chọn.
            </DialogDescription>
          </DialogHeader>

          {!selectedTicketView ? (
            <div>Đang tải dữ liệu...</div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Ticket ID:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.ticket_id || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Train ID:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.trainID || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Passport:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.passport || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Full Name:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.fullName || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Phone Number:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.phoneNumber || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Email:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.email || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  QR Code:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.qr_code || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Coach and Seat:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.coach_seat || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Travel Date:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.travel_date
                    ? selectedTicketView.travel_date.slice(0, 10)
                    : "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Start Station:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.startStation || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  End Station:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.endStation || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Departure Time:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.departTime || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Arrival Time:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.arrivalTime || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold whitespace-nowrap min-w-[120px]">
                  Price:
                </Label>
                <span className="col-span-3 truncate">
                  {selectedTicketView.price !== undefined
                    ? selectedTicketView.price
                    : "N/A"}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowModalView(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal Update Ticket */}
      <Dialog
        open={showModalUpdate}
        onOpenChange={(open) => setShowModalUpdate(open)}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cập Nhật Vé</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin vé bằng cách điền vào các trường dưới đây.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ticket_id" className="text-right">
                Ticket ID
              </Label>
              <Input
                id="ticket_id"
                name="ticket_id"
                value={selectedTicketUpdate?.ticket_id || ""}
                onChange={handleInputChange}
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
                Full Name
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
                Phone Number
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
              Cancel
            </Button>
            <Button onClick={handleUpdateTicket}>Cập Nhật Vé</Button>
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
        const res = await fetch("/api/ticket/requested");
        if (!res.ok) {
          throw new Error("Failed to fetch requested tickets");
        }
        const data = await res.json();
        setRequestedTickets(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequestedTickets();
  }, []);

  if (loading) return <div>Đang tải dữ liệu...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã vé</TableHead>
          <TableHead>Họ và tên</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Số điện thoại</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requestedTickets.map((ticket) => (
          <TableRow key={ticket.ticket_id}>
            <TableCell>{ticket.ticket_id}</TableCell>
            <TableCell>{ticket.fullName}</TableCell>
            <TableCell>{ticket.email}</TableCell>
            <TableCell>{ticket.phoneNumber}</TableCell>
            <TableCell>{ticket.refund_status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
