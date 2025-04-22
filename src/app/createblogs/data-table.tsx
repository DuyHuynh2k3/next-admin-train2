"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Category } from "../../types";
import Image from "next/image";
import { toast} from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Nhớ import CSS của react-toastify

interface Blog {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  imageUrls: string[]; // Mảng ảnh thay vì 1 ảnh
  categoryId: number;
  category: Category;
}

const DataTableCreateBlogs = ({ editBlog }: { editBlog?: Blog }) => {
  const [form, setForm] = useState<Partial<Blog>>({ imageUrls: [] });
  const [categories, setCategories] = useState<Category[]>([]);
  const [newImage, setNewImage] = useState<string>("");

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
        toast.success("Cập nhật bài viết thành công!"); // Hiển thị thông báo thành công
      } else {
        await axios.post("/api/blogs", form); // Tạo mới bài viết
        toast.success("Tạo bài viết mới thành công!"); // Hiển thị thông báo thành công
      }
      setForm({ imageUrls: [] }); // Reset form
    } catch (err) {
      console.error("Lỗi khi submit blog:", err);
      toast.error("Có lỗi xảy ra khi tạo hoặc cập nhật bài viết!"); // Hiển thị thông báo lỗi
    }
  };

  // Thêm ảnh vào mảng imageUrls
  const handleAddImage = () => {
    if (newImage && !form.imageUrls?.includes(newImage)) {
      setForm({
        ...form,
        imageUrls: [...(form.imageUrls || []), newImage], // Đảm bảo imageUrls là mảng
      });
      setNewImage(""); // Reset URL sau khi thêm
    }
  };

  // Xử lý khi xóa ảnh
  const handleRemoveImage = (image: string) => {
    setForm({
      ...form,
      imageUrls: form.imageUrls?.filter((url) => url !== image),
    });
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

      {/* Input để thêm ảnh */}
      <input
        type="text"
        placeholder="URL ảnh"
        value={newImage}
        onChange={(e) => setNewImage(e.target.value)}
        className="w-full border px-3 py-2 mb-2 rounded"
      />
      <Button onClick={handleAddImage}>Thêm ảnh</Button>

      {/* Hiển thị các ảnh đã thêm */}
      <div className="mt-2">
        {form.imageUrls?.map((image, index) => (
          <div key={index} className="flex items-center mb-2">
            <Image
              src={image}
              alt={`Ảnh ${index + 1}`}
              width={80} // Đặt chiều rộng của ảnh
              height={80} // Đặt chiều cao của ảnh
              className="object-cover mr-2"
            />
            <Button
              variant="destructive"
              onClick={() => handleRemoveImage(image)}
            >
              Xóa
            </Button>
          </div>
        ))}
      </div>

      <Button onClick={handleSubmit}>
        {editBlog ? "Cập nhật" : "Tạo mới"}
      </Button>
    </div>
  );
};

export default DataTableCreateBlogs;
