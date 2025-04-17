// app/blogs/data-table.tsx
"use client";

import { useEffect, useState } from "react";
import { AiFillEdit, AiFillDelete } from "react-icons/ai";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Blog } from "../../types"; // Tùy cấp độ thư mục

const DataTableBlogs = ({ onEdit }: { onEdit: (blog: Blog) => void }) => {
  const [blogs, setBlogs] = useState<Blog[]>([]);

  // Fetch danh sách blogs
  const fetchBlogs = async () => {
    try {
      const res = await axios.get("/api/blogs");
      setBlogs(res.data);
    } catch (err) {
      console.error("Lỗi khi fetch blogs:", err);
    }
  };

  // Xoá blog
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/blogs?id=${id}`);
      fetchBlogs();
    } catch (err) {
      console.error("Lỗi khi xóa blog:", err);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <table className="w-full text-left border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">STT</th>
            <th className="p-2 border">Tiêu đề</th>
            <th className="p-2 border">Chuyên mục</th>
            <th className="p-2 border">Ngày tạo</th>
            <th className="p-2 border">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {blogs.map((blog, index) => (
            <tr key={blog.id} className="border-t">
              <td className="p-2 border">{index + 1}</td>
              <td className="p-2 border">{blog.title}</td>
              <td className="p-2 border">{blog.category.name}</td>
              <td className="p-2 border">
                {new Date(blog.createdAt).toLocaleDateString()}
              </td>
              <td className="p-2 border space-x-2">
                <Button variant="outline" onClick={() => onEdit(blog)}>
                  <AiFillEdit />
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(blog.id)}
                >
                  <AiFillDelete />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTableBlogs;
