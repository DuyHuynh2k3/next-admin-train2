// page.tsx
"use client";
import React, { useState } from "react";
import DataTableBlogs from "./data-table";
import { SContainer } from "../style";
import { Button } from "@/components/ui/button";
import { toast, ToastContainer } from 'react-toastify';
import axios from "axios";
import { DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { Dialog, DialogDescription, DialogHeader } from "@/components/ui/dialog";

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
// Thêm interface cho BlogSection
interface BlogSection {
  id: string;
  imageUrl: string;
  content: string;
}

// Thêm hàm parseSections trong component
const parseSections = (sections: any): BlogSection[] => {
  if (!sections) return [];
  if (Array.isArray(sections)) return sections;

  try {
    const parsed = typeof sections === 'string' ? JSON.parse(sections) : sections;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Lỗi khi parse sections:", e);
    return [];
  }
};

// Thêm hàm normalizeBlog để xử lý dữ liệu
const normalizeBlog = (blog: any): Blog => {
  return {
    ...blog,
    imageUrls: Array.isArray(blog.imageUrls)
      ? blog.imageUrls
      : typeof blog.imageUrls === 'string'
        ? JSON.parse(blog.imageUrls)
        : [],
    sections: Array.isArray(blog.sections)
      ? blog.sections
      : typeof blog.sections === 'string'
        ? JSON.parse(blog.sections)
        : []
  };
};
const TrainPage = () => {
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [viewingBlog, setViewingBlog] = useState<Blog | null>(null);

  // Xử lý khi API trả về sections không phải là mảng
  const normalizeBlog = (blog: Blog): Blog => {
    return {
      ...blog,
      sections: Array.isArray(blog.sections) ? blog.sections : [],
      imageUrls: Array.isArray(blog.imageUrls) ? blog.imageUrls : []
    };
  };

  const handleUpdateBlog = async () => {
    if (!editingBlog) return;

    try {
      await axios.put(`/api/blogs?id=${editingBlog.id}`, {
        ...editingBlog,
        imageUrls: JSON.stringify(editingBlog.imageUrls),
        sections: JSON.stringify(editingBlog.sections)
      });
      toast.success("Cập nhật bài viết thành công!");
      setEditingBlog(null);
    } catch (err) {
      console.error("Lỗi khi cập nhật bài viết:", err);
      toast.error("Có lỗi xảy ra khi cập nhật bài viết!");
    }
  };

  const handleSectionChange = (index: number, field: keyof BlogSection, value: string) => {
    if (!editingBlog) return;

    const updatedSections = [...editingBlog.sections];
    updatedSections[index] = {
      ...updatedSections[index],
      [field]: value
    };

    setEditingBlog({
      ...editingBlog,
      sections: updatedSections
    });
  };

  const handleAddSection = () => {
    if (!editingBlog) return;

    const newSection: BlogSection = {
      id: Date.now().toString(),
      imageUrl: "",
      content: ""
    };

    setEditingBlog({
      ...editingBlog,
      sections: [...editingBlog.sections, newSection]
    });
  };

  const handleRemoveSection = (index: number) => {
    if (!editingBlog) return;

    const updatedSections = [...editingBlog.sections];
    updatedSections.splice(index, 1);

    setEditingBlog({
      ...editingBlog,
      sections: updatedSections
    });
  };

  return (
    <div>
      <h1 style={{ marginBottom: "20px" }}>Quản lí tin tức</h1>
      <SContainer>
        <DataTableBlogs
          onEdit={(blog) => setEditingBlog(normalizeBlog(blog))}
          onView={(blog) => setViewingBlog(normalizeBlog(blog))}
        />
        <ToastContainer />
      </SContainer>
      {/* Modal xem bài viết */}
      {viewingBlog && (
        <Dialog open={!!viewingBlog} onOpenChange={() => setViewingBlog(null)}>
          <DialogContent className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <DialogTitle className="text-3xl font-bold text-gray-800">{viewingBlog.title}</DialogTitle>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewingBlog(null)}
                  className="text-gray-600 hover:text-gray-800 rounded-full p-2 transition duration-200 ease-in-out"
                >
                  <span className="material-icons">close</span>
                </Button>
              </div>

              <DialogDescription className="text-md text-gray-600 mb-6">
                Chuyên mục: <span className="font-semibold">{viewingBlog.category?.name || "Không xác định"}</span> |
                Tổng đoạn: {viewingBlog.sections.length}
              </DialogDescription>

              <div className="space-y-8">
                {/* Nội dung chính */}
                <div className="bg-gray-50 p-6 rounded-lg shadow-md">
                  <h3 className="font-semibold text-lg mb-4 text-gray-800">Nội dung chính:</h3>
                  <p className="whitespace-pre-line text-gray-700">{viewingBlog.content}</p>
                </div>

                {/* Hình ảnh chính */}
                {viewingBlog.imageUrls && viewingBlog.imageUrls.length > 0 ? (
                  <div>
                    <h3 className="font-semibold text-lg mb-4 text-gray-800">Ảnh bài viết:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {viewingBlog.imageUrls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Ảnh ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg shadow-sm"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Ảnh đang trống</p>
                )}

                {viewingBlog.sections.length > 0 ? (
                  <div>
                    <h3 className="font-semibold text-lg mb-4 text-gray-800">Các đoạn nội dung:</h3>
                    <div className="space-y-6">
                      {viewingBlog.sections.map((section, index) => (
                        <div key={section.id || index} className="p-4 bg-gray-50 rounded-lg shadow-md">
                          <div className="flex flex-col gap-4">
                            {/* Ảnh đoạn */}
                            <h4 className="font-medium text-gray-700 mb-3">Đoạn {index + 1}</h4>
                            <div className="w-full">
                              {section.imageUrl ? (
                                <img
                                  src={section.imageUrl}
                                  alt={`Ảnh đoạn ${index + 1}`}
                                  className="w-full h-40 object-cover rounded-lg shadow-sm"
                                />
                              ) : (
                                <p className="text-gray-500 italic">Ảnh đang trống</p>
                              )}
                            </div>

                            {/* Nội dung đoạn */}
                            <div className="flex-1">

                              <p className="whitespace-pre-line text-gray-700">{section.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-lg text-gray-500 italic">
                    Không có đoạn nội dung nào.
                  </div>
                )}



              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Form chỉnh sửa bài viết */}
      {editingBlog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">Chỉnh sửa bài viết</h2>

            <div className="mb-4">
              <label htmlFor="edit-title" className="block mb-2 font-medium">
                Tiêu đề
              </label>
              <input
                id="edit-title"
                type="text"
                value={editingBlog.title}
                onChange={(e) => setEditingBlog({ ...editingBlog, title: e.target.value })}
                className="w-full border p-2 rounded"
                placeholder="Nhập tiêu đề bài viết"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="edit-content" className="block mb-2 font-medium">
                Nội dung chính
              </label>
              <textarea
                id="edit-content"
                value={editingBlog.content}
                onChange={(e) => setEditingBlog({ ...editingBlog, content: e.target.value })}
                className="w-full border p-2 rounded h-32"
                placeholder="Nhập nội dung chính"
              />
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="font-medium">
                  Các đoạn nội dung ({editingBlog.sections.length})
                </label>
                <Button
                  variant="outline"
                  onClick={handleAddSection}
                >
                  Thêm đoạn
                </Button>
              </div>

              <div className="space-y-4">
                {editingBlog.sections.map((section, index) => (
                  <div key={section.id} className="border p-4 rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">Đoạn {index + 1}</h3>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveSection(index)}
                      >
                        Xóa
                      </Button>
                    </div>

                    <div className="mb-3">
                      <label htmlFor={`section-image-${index}`} className="block mb-1">
                        URL ảnh
                      </label>
                      <input
                        id={`section-image-${index}`}
                        type="text"
                        value={section.imageUrl}
                        onChange={(e) => handleSectionChange(index, 'imageUrl', e.target.value)}
                        className="w-full border p-2 rounded"
                        placeholder="Nhập URL ảnh"
                      />
                      {section.imageUrl && (
                        <img
                          src={section.imageUrl}
                          alt={`Preview ${index + 1}`}
                          className="mt-2 max-w-full h-40 object-contain"
                        />
                      )}
                    </div>

                    <div>
                      <label htmlFor={`section-content-${index}`} className="block mb-1">
                        Nội dung
                      </label>
                      <textarea
                        id={`section-content-${index}`}
                        value={section.content}
                        onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                        className="w-full border p-2 rounded h-24"
                        placeholder="Nhập nội dung đoạn"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <Button onClick={handleUpdateBlog}>
                Lưu thay đổi
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingBlog(null)}
              >
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainPage;