"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import Image from "next/image";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "react-toastify/dist/ReactToastify.css";

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

interface BlogFormData {
  title?: string;
  content?: string;
  categoryId?: number;
  imageUrls: string[];
  sections: BlogSection[];
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

interface SortableSectionProps {
  section: BlogSection;
  index: number;
  onChange: (
    index: number,
    field: "imageUrl" | "content",
    value: string
  ) => void;
  onRemove: (index: number) => void;
}

const SortableSection = ({
  section,
  index,
  onChange,
  onRemove,
}: SortableSectionProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = res.data.url;
      onChange(index, "imageUrl", imageUrl);
    } catch (err) {
      console.error('Lỗi khi tải lên ảnh:', err);
      toast.error('Có lỗi xảy ra khi tải lên ảnh!');
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border p-3 mb-3 rounded bg-gray-50"
    >
      <div {...attributes} {...listeners} className="cursor-move mb-2 text-sm text-gray-500">
        ⇅ Kéo để sắp xếp
      </div>

      <input
        type="file"
        placeholder="Thêm ảnh"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileChange(e, index)}
        className="w-full border px-2 py-1 mb-2 rounded"
      />

      {section.imageUrl && (
        <img
          src={section.imageUrl}
          alt="preview"
          className="w-full h-40 object-cover mb-2 rounded"
        />
      )}

      <textarea
        placeholder="Nội dung đoạn"
        value={section.content}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          onChange(index, "content", e.currentTarget.value)
        }
        className="w-full border px-2 py-1 mb-2 rounded h-24"
      />

      <Button
        variant="destructive"
        className="mt-2"
        onClick={() => onRemove(index)}
      >
        Xoá đoạn
      </Button>
    </div>
  );
};

const DataTableCreateBlogs = ({ editBlog }: { editBlog?: Blog }) => {
  const [form, setForm] = useState<BlogFormData>({
    title: "",
    content: "",
    categoryId: undefined,
    imageUrls: [],
    sections: [],
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [newImage, setNewImage] = useState<string>("");

  const sensors = useSensors(useSensor(PointerSensor));

  const fetchCategories = async () => {
    try {
      const res = await axios.get("/api/blogs/categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Lỗi khi fetch categories:", err);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = res.data.url;
      setForm((prevForm) => ({
        ...prevForm,
        imageUrls: [...prevForm.imageUrls, imageUrl],
      }));
    } catch (err) {
      console.error('Lỗi khi tải lên ảnh:', err);
      toast.error('Có lỗi xảy ra khi tải lên ảnh!');
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.content || !form.categoryId) return;

    try {
      const payload = {
        ...form,
        imageUrls: form.imageUrls,
        sections: form.sections,
      };
      if (editBlog) {
        await axios.put(`/api/blogs?id=${editBlog.id}`, payload);
        toast.success("Cập nhật bài viết thành công!");
      } else {
        await axios.post("/api/blogs", payload);
        toast.success("Tạo bài viết mới thành công!");
      }
      setForm({
        title: "",
        content: "",
        categoryId: undefined,
        imageUrls: [],
        sections: [],
      });
    } catch (err) {
      console.error("Lỗi khi submit blog:", err);
      toast.error("Có lỗi xảy ra khi tạo hoặc cập nhật bài viết!");
    }
  };

  const handleAddImage = () => {
    if (newImage && !form.imageUrls.includes(newImage)) {
      setForm({
        ...form,
        imageUrls: [...form.imageUrls, newImage],
      });
      setNewImage("");
    }
  };

  const handleRemoveImage = (image: string) => {
    setForm({
      ...form,
      imageUrls: form.imageUrls.filter((url) => url !== image),
    });
  };

  const handleAddSection = () => {
    const newSection: BlogSection = {
      id: uuidv4(),
      imageUrl: "",
      content: "",
    };
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  };

  const handleSectionChange = (
    index: number,
    field: "imageUrl" | "content",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index ? { ...section, [field]: value } : section
      ),
    }));
  };

  const handleRemoveSection = (index: number) => {
    const updated = [...form.sections];
    updated.splice(index, 1);
    setForm({ ...form, sections: updated });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = form.sections.findIndex((s) => s.id === active.id);
      const newIndex = form.sections.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(form.sections, oldIndex, newIndex);
      setForm({ ...form, sections: reordered });
    }
  };

  useEffect(() => {
    fetchCategories();
    if (editBlog) {
      const parsedImageUrls = editBlog.imageUrls || [];
      const parsedSections = editBlog.sections || [];
      setForm({
        title: editBlog.title,
        content: editBlog.content,
        categoryId: editBlog.categoryId,
        imageUrls: parsedImageUrls,
        sections: parsedSections,
      });
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
        onChange={(e) =>
          setForm({ ...form, title: (e.target as HTMLInputElement).value })
        }
        className="w-full border px-3 py-2 mb-2 rounded"
      />

      <textarea
        placeholder="Mô tả ngắn"
        value={form.content || ""}
        onChange={(e) => setForm({ ...form, content: e.currentTarget.value })}
        className="w-full border px-3 py-2 mb-2 rounded h-24"
      />

      <label className="block mb-2">
        Chuyên mục
        <select
          value={form.categoryId || ""}
          onChange={(e) =>
            setForm({ ...form, categoryId: Number(e.currentTarget.value) })
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
        type="file"
        placeholder="URL ảnh"
        onChange={handleFileChange}
        className="w-full border px-3 py-2 mb-2 rounded"
      />
      <Button onClick={handleAddImage}>Thêm ảnh</Button>

      <div className="mt-2">
        {form.imageUrls.map((image, index) => (
          <div key={index} className="flex items-center mb-2">
            <Image
              src={image}
              alt={`Ảnh ${index + 1}`}
              width={80}
              height={80}
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

      <div className="mt-6">
        <h3 className="font-semibold mb-2">Các đoạn nội dung</h3>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={form.sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {form.sections.map((section, index) => (
              <SortableSection
                key={section.id}
                section={section}
                index={index}
                onChange={handleSectionChange}
                onRemove={handleRemoveSection}
              />
            ))}
          </SortableContext>
        </DndContext>

        <Button variant="outline" className="mt-2" onClick={handleAddSection}>
          Thêm đoạn mới
        </Button>
      </div>

      <Button onClick={handleSubmit} className="mt-4">
        {editBlog ? "Cập nhật" : "Tạo mới"}
      </Button>
    </div>
  );
};

export default DataTableCreateBlogs;