export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface BlogSection {
  id: string;
  imageUrl: string;
  content: string;
}

export interface Blog {
 id: number;
  title: string;
  content: string;
  createdAt: string;
  imageUrls: string[];
  categoryId: number;
  category?: Category;
  sections: BlogSection[];
}