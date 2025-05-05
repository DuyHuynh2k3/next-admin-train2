// data-table.tsx
"use client";
import { useEffect, useState } from "react";
import { AiFillEdit, AiFillDelete, AiFillEye } from "react-icons/ai";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "react-toastify";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface BlogSection {
  id: string;
  imageUrl: string;
  content: string;
}

interface Blog {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  imageUrls: string[];
  categoryId: number;
  category?: Category;
  sections: BlogSection[];
}

const DataTableBlogs = ({
  onEdit,
  onView
}: {
  onEdit: (blog: Blog) => void;
  onView: (blog: Blog) => void;
}) => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const fetchBlogs = async () => {
    try {
      const res = await axios.get("/api/blogs");
      const blogsWithSections = res.data.map((blog: any) => ({
        ...blog,
        imageUrls: Array.isArray(blog.imageUrls) ? blog.imageUrls : [],
        sections: Array.isArray(blog.sections) ? blog.sections : []
      }));
      setBlogs(blogsWithSections);
      setFilteredBlogs(blogsWithSections);
    } catch (err) {
      console.error("Lỗi khi fetch blogs:", err);
      toast.error("Lỗi khi tải dữ liệu blog.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;

    setIsDeleting(id);
    try {
      await axios.delete(`/api/blogs?id=${id}`);
      await fetchBlogs();
      toast.success("Đã xóa blog thành công.");
    } catch (err) {
      console.error("Lỗi khi xóa blog:", err);
      toast.error("Lỗi khi xóa blog.");
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    const filtered = blogs.filter((blog) =>
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (blog.category?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      blog.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBlogs(filtered);
  }, [searchTerm, blogs]);

  useEffect(() => {
    fetchBlogs();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Tìm theo tiêu đề, nội dung hoặc chuyên mục..."
          className="border p-2 rounded w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Tìm kiếm bài viết"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 border">STT</th>
              <th className="p-3 border">Tiêu đề</th>
              <th className="p-3 border">Chuyên mục</th>
              <th className="p-3 border">Số đoạn</th>
              <th className="p-3 border">Ngày tạo</th>
              <th className="p-3 border">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredBlogs.length > 0 ? (
              filteredBlogs.map((blog, index) => (
                <tr key={blog.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 border">{index + 1}</td>
                  <td className="p-3 border font-medium">
                    {blog.title}
                  </td>
                  <td className="p-3 border">{blog.category?.name || "Không có"}</td>
                  <td className="p-3 border">{blog.sections.length}</td>
                  <td className="p-3 border">
                    {new Date(blog.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 border">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(blog)}
                        aria-label={`Xem bài viết ${blog.title}`}
                      >
                        <AiFillEye />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(blog)}
                        aria-label={`Chỉnh sửa bài viết ${blog.title}`}
                      >
                        <AiFillEdit />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(blog.id)}
                        disabled={isDeleting === blog.id}
                        aria-label={`Xóa bài viết ${blog.title}`}
                      >
                        <AiFillDelete />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Không tìm thấy bài viết nào phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTableBlogs;