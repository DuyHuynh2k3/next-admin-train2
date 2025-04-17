// app/blogs/create-blog.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Category } from "../../types"; // Đảm bảo bạn định nghĩa Category type ở đây

interface Blog {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  imageUrl?: string;
  categoryId: number;
  category: Category;
}

const DataTableCreateBlogs = ({ editBlog }: { editBlog?: Blog }) => {
  const [form, setForm] = useState<Partial<Blog>>({});
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch danh sách categories
  const fetchCategories = async () => {
    try {
      const res = await axios.get("/api/blogs/categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Lỗi khi fetch categories:", err);
    }
  };

  // Xử lý submit bài viết
  const handleSubmit = async () => {
    if (!form.title || !form.content || !form.categoryId) return;

    try {
      if (editBlog) {
        await axios.put(`/api/blogs?id=${editBlog.id}`, form); // Cập nhật bài viết
      } else {
        await axios.post("/api/blogs", form); // Tạo mới bài viết
      }
      setForm({});
    } catch (err) {
      console.error("Lỗi khi submit blog:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
    if (editBlog) {
      setForm(editBlog);
    }
  }, [editBlog]);

  return (
    <div className="bg-white p-4 rounded shadow mb-6">
      <h2 className="text-xl font-semibold mb-2">
        {editBlog ? "Cập nhật bài viết" : "Tạo bài viết mới"}
      </h2>
      <input
        type="text"
        placeholder="Tiêu đề"
        value={form.title || ""}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full border px-3 py-2 mb-2 rounded"
      />
      <textarea
        placeholder="Nội dung"
        value={form.content || ""}
        onChange={(e) => setForm({ ...form, content: e.target.value })}
        className="w-full border px-3 py-2 mb-2 rounded h-28"
      />
      <label className="block mb-2">
        Chuyên mục
        <select
          value={form.categoryId || ""}
          onChange={(e) =>
            setForm({ ...form, categoryId: Number(e.target.value) })
          }
          className="w-full border px-3 py-2 mb-2 rounded"
        >
          <option value="">Chọn chuyên mục</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <input
        type="text"
        placeholder="URL ảnh (nếu có)"
        value={form.imageUrl || ""}
        onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        className="w-full border px-3 py-2 mb-2 rounded"
      />
      <Button onClick={handleSubmit}>
        {editBlog ? "Cập nhật" : "Tạo mới"}
      </Button>
    </div>
  );
};

export default DataTableCreateBlogs;
