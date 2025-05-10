import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, BOM, RawMaterialEntry, ProductionLog, ProductType, BomComponent } from '@/types';

interface AppState {
  products: Product[];
  boms: BOM[];
  rawMaterialEntries: RawMaterialEntry[];
  productionLogs: ProductionLog[];

  // Product actions
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  getProductById: (productId: string) => Product | undefined;
  
  // BOM actions
  addBom: (bom: BOM) => void;
  updateBom: (bom: BOM) => void;
  deleteBom: (bomId: string) => void;
  getBomById: (bomId: string) => BOM | undefined;

  // Raw Material Entry actions
  addRawMaterialEntry: (entry: RawMaterialEntry) => void;
  // updateRawMaterialEntry: (entry: RawMaterialEntry) => void; // Future enhancement
  // deleteRawMaterialEntry: (entryId: string) => void; // Future enhancement

  // Production Log actions
  addProductionLog: (log: ProductionLog) => void;
  // updateProductionLog: (log: ProductionLog) => void; // Future enhancement
  // deleteProductionLog: (logId: string) => void; // Future enhancement
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      products: [],
      boms: [],
      rawMaterialEntries: [],
      productionLogs: [],

      // Product actions
      addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
      updateProduct: (updatedProduct) =>
        set((state) => ({
          products: state.products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
        })),
      deleteProduct: (productId) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
          // Also consider implications for BOMs and entries/logs
        })),
      getProductById: (productId) => get().products.find(p => p.id === productId),

      // BOM actions
      addBom: (bom) => set((state) => ({ boms: [...state.boms, bom] })),
      updateBom: (updatedBom) =>
        set((state) => ({
          boms: state.boms.map((b) => (b.id === updatedBom.id ? updatedBom : b)),
        })),
      deleteBom: (bomId) =>
        set((state) => ({
          boms: state.boms.filter((b) => b.id !== bomId),
        })),
      getBomById: (bomId) => get().boms.find(b => b.id === bomId),

      // Raw Material Entry actions
      addRawMaterialEntry: (entry) => {
        set((state) => ({
          rawMaterialEntries: [...state.rawMaterialEntries, entry],
          products: state.products.map((p) =>
            p.id === entry.productId ? { ...p, stock: p.stock + entry.quantity } : p
          ),
        }));
      },

      // Production Log actions
      addProductionLog: (log) => {
        const bom = get().boms.find(b => b.id === log.bomId);
        if (!bom) {
          console.error("BOM not found for production log");
          // Potentially show a toast error to the user
          return; 
        }

        let productsToUpdate = [...get().products];
        let possible = true;

        // Check stock for components and prepare updates (without committing yet)
        const componentUpdates = bom.components.map(component => {
          const product = productsToUpdate.find(p => p.id === component.productId);
          if (!product || product.stock < component.quantity * log.quantity) {
            possible = false;
            // console.warn(`Not enough stock for component ${product?.name || component.productId}`);
            // Here you might throw an error or notify the user
          }
          return {
            productId: component.productId,
            newStock: product ? product.stock - (component.quantity * log.quantity) : 0
          };
        });
        
        if (!possible) {
          // Use your toast system here
          // Example: toast({ title: "Error", description: "Not enough stock for components.", variant: "destructive" });
          alert("İstehsal üçün kifayət qədər komponent stoku yoxdur."); // Simple alert, replace with toast
          return; // Stop processing
        }

        // Apply component stock deductions
        componentUpdates.forEach(update => {
          productsToUpdate = productsToUpdate.map(p => 
            p.id === update.productId ? { ...p, stock: update.newStock } : p
          );
        });
        
        // Increase stock of the produced item
        productsToUpdate = productsToUpdate.map((p) =>
          p.id === log.productId ? { ...p, stock: p.stock + log.quantity } : p
        );

        set({
          productionLogs: [...get().productionLogs, log],
          products: productsToUpdate,
        });
      },
    }),
    {
      name: 'stoktakip-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);

// Helper function to get product name by ID
export const getProductNameById = (productId: string): string => {
  const products = useStore.getState().products;
  const product = products.find(p => p.id === productId);
  return product ? product.name : 'Unknown Product';
};
