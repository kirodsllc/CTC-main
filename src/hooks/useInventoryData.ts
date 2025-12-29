import { useState, useEffect, createContext, useContext } from 'react';

export interface Part {
  id: string;
  partNo: string;
  brand: string;
  uom: string;
  cost: number | null;
  price: number | null;
  stock: number;
}

export interface Kit {
  id: string;
  name: string;
  badge?: string;
  itemsCount: number;
  totalCost: number;
  price: number;
}

export interface Supplier {
  id: string;
  code: string;
  companyName: string;
  status: "active" | "inactive";
}

export interface Category {
  id: string;
  name: string;
  count?: number;
}

// Initial data - starts empty
const initialParts: Part[] = [];

const initialKits: Kit[] = [];

const initialSuppliers: Supplier[] = [];

const initialCategories: Category[] = [];

const STORAGE_KEYS = {
  parts: 'inventory-parts',
  kits: 'inventory-kits',
  suppliers: 'inventory-suppliers',
  categories: 'inventory-categories',
};

// Helper to load from localStorage
const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

// Helper to save to localStorage
const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export interface InventoryDataContextType {
  parts: Part[];
  kits: Kit[];
  suppliers: Supplier[];
  categories: Category[];
  addPart: (part: Part) => void;
  updatePart: (part: Part) => void;
  deletePart: (id: string) => void;
  addKit: (kit: Kit) => void;
  updateKit: (kit: Kit) => void;
  deleteKit: (id: string) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
}

const InventoryDataContext = createContext<InventoryDataContextType | undefined>(undefined);

export const useInventoryData = () => {
  const context = useContext(InventoryDataContext);
  if (!context) {
    throw new Error('useInventoryData must be used within InventoryDataProvider');
  }
  return context;
};

// For use in dashboard without provider
export const useInventoryStats = () => {
  const [stats, setStats] = useState({
    partsCount: 0,
    kitsCount: 0,
    suppliersCount: 0,
    categoriesCount: 0,
  });

  useEffect(() => {
    const parts = loadFromStorage<Part[]>(STORAGE_KEYS.parts, initialParts);
    const kits = loadFromStorage<Kit[]>(STORAGE_KEYS.kits, initialKits);
    const suppliers = loadFromStorage<Supplier[]>(STORAGE_KEYS.suppliers, initialSuppliers);
    const categories = loadFromStorage<Category[]>(STORAGE_KEYS.categories, initialCategories);

    setStats({
      partsCount: parts.length,
      kitsCount: kits.length,
      suppliersCount: suppliers.filter(s => s.status === 'active').length,
      categoriesCount: categories.length,
    });

    // Listen for storage changes
    const handleStorageChange = () => {
      const updatedParts = loadFromStorage<Part[]>(STORAGE_KEYS.parts, initialParts);
      const updatedKits = loadFromStorage<Kit[]>(STORAGE_KEYS.kits, initialKits);
      const updatedSuppliers = loadFromStorage<Supplier[]>(STORAGE_KEYS.suppliers, initialSuppliers);
      const updatedCategories = loadFromStorage<Category[]>(STORAGE_KEYS.categories, initialCategories);

      setStats({
        partsCount: updatedParts.length,
        kitsCount: updatedKits.length,
        suppliersCount: updatedSuppliers.filter(s => s.status === 'active').length,
        categoriesCount: updatedCategories.length,
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('inventory-updated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('inventory-updated', handleStorageChange);
    };
  }, []);

  return stats;
};

export { InventoryDataContext, loadFromStorage, saveToStorage, STORAGE_KEYS, initialParts, initialKits, initialSuppliers, initialCategories };
