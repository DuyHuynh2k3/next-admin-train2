"use client";

import React, { useState } from "react";
import axios from "axios";
import DataTableBlogs from "./data-table";
import { SContainer } from "../style";
import { Blog } from "../../types";
import { Button } from "@/components/ui/button";
import Image from 'next/image';


const TrainPage = () => {
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  // Hàm cập nhật blog
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlog) return;

    try {
      await axios.put("/api/blogs", editingBlog);
      alert("Đã cập nhật bài viết!");
      setEditingBlog(null);
    } catch (err) {
      console.error("Lỗi khi cập nhật:", err);
      alert("Lỗi khi cập nhật bài viết!");
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: "20px" }}>Quản lí tin tức</h1>
      <SContainer>
        <DataTableBlogs onEdit={(blog) => setEditingBlog(blog)} />
      </SContainer>

      {editingBlog && (
        <form onSubmit={handleUpdate} className="p-4 bg-white border mt-6 space-y-4">
          <h2 className="text-xl font-bold">Chỉnh sửa bài viết</h2>

          <input
            type="text"
            placeholder="Tiêu đề"
            value={editingBlog.title}
            onChange={(e) =>
              setEditingBlog({ ...editingBlog, title: e.target.value })
            }
            className="border p-2 w-full"
          />

          <textarea
            placeholder="Nội dung"
            value={editingBlog.content}
            onChange={(e) =>
              setEditingBlog({ ...editingBlog, content: e.target.value })
            }
            className="border p-2 w-full h-32"
          />

          <input
            type="text"
            placeholder="Ảnh (URL)"
            value={editingBlog.imageUrl ?? ""}
            onChange={(e) =>
              setEditingBlog({ ...editingBlog, imageUrl: e.target.value })
            }
            className="border p-2 w-full"
          />

          {/* Preview ảnh nếu có */}
          {editingBlog.imageUrl && (
            <image
              src={editingBlog.imageUrl}
              alt="Ảnh xem trước"
              className="w-64 h-auto border rounded"
            />
          )}

          <div className="space-x-2">
            <Button type="submit">Lưu thay đổi</Button>
            <Button type="button" variant="outline" onClick={() => setEditingBlog(null)}>
              Huỷ
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TrainPage;
