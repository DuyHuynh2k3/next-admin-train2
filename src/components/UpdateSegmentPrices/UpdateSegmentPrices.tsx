"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Segment {
  segment_id: number;
  from_station: string;
  to_station: string;
  current_price: number;
  depart_time: string;
  arrival_time: string;
  new_price?: number;
}

interface UpdateSegmentPricesProps {
  trainID: number;
  onUpdate?: () => Promise<void> | void;
}

export function UpdateSegmentPrices({
  trainID,
  onUpdate,
}: UpdateSegmentPricesProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSegments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trains/segments?trainID=${trainID}`);
      if (!res.ok) throw new Error("Không thể lấy dữ liệu chặng đường");
      const data = await res.json();
      setSegments(data);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu chặng đường:", error);
      toast.error("Lỗi khi lấy dữ liệu chặng đường");
    } finally {
      setLoading(false);
    }
  }, [trainID]);

  const handlePriceChange = (segmentId: number, value: string) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue < 0) return;

    setSegments((prev) =>
      prev.map((seg) =>
        seg.segment_id === segmentId ? { ...seg, new_price: numericValue } : seg
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = segments.filter(
        (seg) =>
          seg.new_price !== undefined && seg.new_price !== seg.current_price
      );

      if (updates.length === 0) {
        toast.info("Không có thay đổi nào để cập nhật");
        setOpen(false);
        return;
      }

      const updatePromises = updates.map(async (seg) => {
        const res = await fetch("/api/trains/segments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            segment_id: seg.segment_id,
            new_price: seg.new_price,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.error || `Lỗi khi cập nhật chặng ${seg.segment_id}`
          );
        }
        return res.json();
      });

      await Promise.all(updatePromises);

      if (onUpdate) {
        await Promise.resolve(onUpdate());
      }

      toast.success("Cập nhật giá vé thành công!");
      setOpen(false);
    } catch (error) {
      console.error("Lỗi khi cập nhật giá vé:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi cập nhật giá vé"
      );
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSegments();
    }
  }, [open, fetchSegments]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="ml-2">
          Cập nhật giá vé từng chặng
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cập nhật giá vé từng chặng</DialogTitle>
          <DialogDescription>
            Thay đổi giá vé cho từng chặng của tàu {trainID}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-4 text-center">Đang tải dữ liệu...</div>
        ) : (
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chặng đường</TableHead>
                  <TableHead>Giờ đi</TableHead>
                  <TableHead>Giờ đến</TableHead>
                  <TableHead>Giá hiện tại</TableHead>
                  <TableHead>Giá mới (VND)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.length > 0 ? (
                  segments.map((segment) => (
                    <TableRow key={segment.segment_id}>
                      <TableCell className="font-medium">
                        {segment.from_station} → {segment.to_station}
                      </TableCell>
                      <TableCell>{segment.depart_time || "--:--"}</TableCell>
                      <TableCell>{segment.arrival_time || "--:--"}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(segment.current_price || 0)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="1000"
                          value={
                            segment.new_price !== undefined
                              ? segment.new_price
                              : segment.current_price || ""
                          }
                          onChange={(e) =>
                            handlePriceChange(
                              segment.segment_id,
                              e.target.value
                            )
                          }
                          className="w-32"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Không tìm thấy chặng đường nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isSaving || loading}>
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
