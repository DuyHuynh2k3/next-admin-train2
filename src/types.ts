// src/types.ts
export interface Category {
    id: number;
    name: string;
  }
  
  export interface Blog {
    id: number;
    title: string;
    content: string;
    createdAt: string;
    imageUrl?: string;
    categoryId: number;
    category: Category;
  }
  