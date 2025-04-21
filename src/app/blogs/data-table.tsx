"use client";

import { useEffect, useState } from "react";
import { AiFillEdit, AiFillDelete } from "react-icons/ai";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Blog } from "../../types";
import { toast } from "react-toastify";

const DataTableBlogs = ({ onEdit }: { onEdit: (blog: Blog) => void }) => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBlogs = async () => {
    try {
      const res = await axios.get("/api/blogs");
      setBlogs(res.data);
      setFilteredBlogs(res.data); // Khởi tạo dữ liệu lọc ban đầu
    } catch (err) {
      console.error("Lỗi khi fetch blogs:", err);
      toast.error("Lỗi khi tải dữ liệu blog.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/blogs?id=${id}`);
      fetchBlogs();
      toast.success("Đã xóa blog thành công.");
    } catch (err) {
      console.error("Lỗi khi xóa blog:", err);
      toast.error("Lỗi khi xóa blog.");
    }
  };

  // Lọc blog theo tiêu đề hoặc tên chuyên mục
  useEffect(() => {
    const filtered = blogs.filter((blog) =>
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBlogs(filtered);
  }, [searchTerm, blogs]);

  useEffect(() => {
    fetchBlogs();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          placeholder="Tìm theo tiêu đề hoặc chuyên mục..."
          className="border p-2 rounded w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

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
          {filteredBlogs.map((blog, index) => (
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
