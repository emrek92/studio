import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, BOM, RawMaterialEntry, ProductionLog, ProductType, BomComponent, CustomerOrder, OrderItem, ShipmentLog } from '@/types';

interface AppState {
  products: Product[];
  boms: BOM[];
  rawMaterialEntries: RawMaterialEntry[];
  productionLogs: ProductionLog[];
  customerOrders: CustomerOrder[];
  shipmentLogs: ShipmentLog[];

  // Product actions
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  getProductById: (productId: string) => Product | undefined;
  getProductByCode: (productCode: string) => Product | undefined;
  
  // BOM actions
  addBom: (bom: BOM) => void;
  updateBom: (bom: BOM) => void;
  deleteBom: (bomId: string) => void;
  getBomById: (bomId: string) => BOM | undefined;

  // Raw Material Entry actions
  addRawMaterialEntry: (entry: RawMaterialEntry) => void;
  updateRawMaterialEntry: (updatedEntry: RawMaterialEntry) => void;
  deleteRawMaterialEntry: (entryId: string) => void;

  // Production Log actions
  addProductionLog: (log: ProductionLog) => void;
  updateProductionLog: (log: ProductionLog) => void; 
  deleteProductionLog: (logId: string) => void; 

  // Customer Order actions
  addCustomerOrder: (order: CustomerOrder) => void;
  updateCustomerOrder: (updatedOrder: CustomerOrder) => void;
  deleteCustomerOrder: (orderId: string) => void;
  getCustomerOrderById: (orderId: string) => CustomerOrder | undefined;

  // ShipmentLog actions
  addShipmentLog: (log: ShipmentLog) => void;
  updateShipmentLog: (updatedLog: ShipmentLog) => void;
  deleteShipmentLog: (logId: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      products: [],
      boms: [],
      rawMaterialEntries: [],
      productionLogs: [],
      customerOrders: [],
      shipmentLogs: [],

      // Product actions
      addProduct: (product) => {
        const existingProduct = get().products.find(p => p.productCode.toLowerCase() === product.productCode.toLowerCase());
        if (existingProduct) {
          throw new Error(`'${product.productCode}' kodlu ürün zaten mevcut.`);
        }
        set((state) => ({ products: [...state.products, product] }));
      },
      updateProduct: (updatedProduct) =>
        set((state) => ({
          products: state.products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
        })),
      deleteProduct: (productId) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
        })),
      getProductById: (productId) => get().products.find(p => p.id === productId),
      getProductByCode: (productCode) => get().products.find(p => p.productCode.toLowerCase() === productCode.toLowerCase()),

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
      updateRawMaterialEntry: (updatedEntry) => {
        const oldEntry = get().rawMaterialEntries.find(e => e.id === updatedEntry.id);
        if (!oldEntry) {
          throw new Error("Güncellenecek hammadde girişi bulunamadı.");
        }
        if (oldEntry.productId !== updatedEntry.productId) {
            throw new Error("Hammadde girişi güncellenirken ürün ID'si değiştirilemez. Lütfen mevcut kaydı silip yeni bir kayıt oluşturun.");
        }

        const stockAdjustment = updatedEntry.quantity - oldEntry.quantity;
        set((state) => ({
          rawMaterialEntries: state.rawMaterialEntries.map((e) =>
            e.id === updatedEntry.id ? updatedEntry : e
          ),
          products: state.products.map((p) =>
            p.id === updatedEntry.productId ? { ...p, stock: p.stock + stockAdjustment } : p
          ),
        }));
      },
      deleteRawMaterialEntry: (entryId) => {
        const entryToDelete = get().rawMaterialEntries.find(e => e.id === entryId);
        if (!entryToDelete) {
          throw new Error("Silinecek hammadde girişi bulunamadı.");
        }
        const stockAdjustment = -entryToDelete.quantity; 
        set((state) => ({
          rawMaterialEntries: state.rawMaterialEntries.filter((e) => e.id !== entryId),
          products: state.products.map((p) =>
            p.id === entryToDelete.productId ? { ...p, stock: p.stock + stockAdjustment } : p
          ),
        }));
      },

      // Production Log actions
      addProductionLog: (log) => {
        const bom = get().boms.find(b => b.id === log.bomId);
        if (!bom) {
          const errorMsg = "Üretim kaydı için Ürün Reçetesi (BOM) bulunamadı.";
          console.error(errorMsg);
          alert(errorMsg); 
          throw new Error(errorMsg);
        }

        let productsToUpdate = [...get().products];
        let possible = true;
        let insufficientComponentName = '';

        const componentUpdates = bom.components.map(component => {
          const product = productsToUpdate.find(p => p.id === component.productId);
          if (!product || product.stock < component.quantity * log.quantity) {
            possible = false;
            insufficientComponentName = product ? `${product.productCode} - ${product.name}` : `ID: ${component.productId}`;
          }
          return {
            productId: component.productId,
            newStock: product ? product.stock - (component.quantity * log.quantity) : 0,
          };
        });
        
        if (!possible) {
          const errorMsg = `Üretim için yeterli '${insufficientComponentName}' bileşen stoğu bulunmamaktadır.`;
          alert(errorMsg);
          throw new Error(errorMsg);
        }

        componentUpdates.forEach(update => {
          productsToUpdate = productsToUpdate.map(p => 
            p.id === update.productId ? { ...p, stock: update.newStock } : p
          );
        });
        
        productsToUpdate = productsToUpdate.map((p) =>
          p.id === log.productId ? { ...p, stock: p.stock + log.quantity } : p
        );

        set({
          productionLogs: [...get().productionLogs, log],
          products: productsToUpdate,
        });
      },
      updateProductionLog: (updatedLog) => {
        const { products, boms, productionLogs } = get();
        const oldLog = productionLogs.find(l => l.id === updatedLog.id);

        if (!oldLog) {
          throw new Error("Güncellenecek üretim kaydı bulunamadı.");
        }

        const oldBom = boms.find(b => b.id === oldLog.bomId);
        if (!oldBom) {
          throw new Error("Eski üretim kaydının ürün reçetesi bulunamadı.");
        }

        let tempProducts = [...products];
        tempProducts = tempProducts.map(p => {
          if (p.id === oldLog.productId) {
            return { ...p, stock: p.stock - oldLog.quantity };
          }
          return p;
        });
        oldBom.components.forEach(comp => {
          tempProducts = tempProducts.map(p => {
            if (p.id === comp.productId) {
              return { ...p, stock: p.stock + (comp.quantity * oldLog.quantity) };
            }
            return p;
          });
        });

        const newBom = boms.find(b => b.id === updatedLog.bomId);
        if (!newBom) {
          throw new Error("Yeni üretim kaydının ürün reçetesi bulunamadı.");
        }

        let possible = true;
        let insufficientComponentName = '';
        newBom.components.forEach(comp => {
          const product = tempProducts.find(p => p.id === comp.productId);
          if (!product || product.stock < comp.quantity * updatedLog.quantity) {
            possible = false;
            insufficientComponentName = product ? `${product.productCode} - ${product.name}` : `ID: ${comp.productId}`;
          }
        });

        if (!possible) {
          throw new Error(`Güncelleme başarısız: Yeni üretim için yeterli '${insufficientComponentName}' bileşen stoğu yok.`);
        }

        let finalProducts = [...tempProducts];
        newBom.components.forEach(comp => {
          finalProducts = finalProducts.map(p => {
            if (p.id === comp.productId) {
              return { ...p, stock: p.stock - (comp.quantity * updatedLog.quantity) };
            }
            return p;
          });
        });
        finalProducts = finalProducts.map(p => {
          if (p.id === updatedLog.productId) {
            return { ...p, stock: p.stock + updatedLog.quantity };
          }
          return p;
        });
        
        set({
          products: finalProducts,
          productionLogs: productionLogs.map(l => l.id === updatedLog.id ? updatedLog : l),
        });
      },
      deleteProductionLog: (logId) => {
        const { products, boms, productionLogs } = get();
        const logToDelete = productionLogs.find(l => l.id === logId);

        if (!logToDelete) {
          throw new Error("Silinecek üretim kaydı bulunamadı.");
        }

        const bomUsed = boms.find(b => b.id === logToDelete.bomId);
        if (!bomUsed) {
          throw new Error("Silinecek üretim kaydının ürün reçetesi bulunamadı.");
        }

        let updatedProducts = [...products];
        bomUsed.components.forEach(comp => {
          updatedProducts = updatedProducts.map(p => {
            if (p.id === comp.productId) {
              return { ...p, stock: p.stock + (comp.quantity * logToDelete.quantity) };
            }
            return p;
          });
        });
        updatedProducts = updatedProducts.map(p => {
          if (p.id === logToDelete.productId) {
            return { ...p, stock: p.stock - logToDelete.quantity };
          }
          return p;
        });

        set({
          products: updatedProducts,
          productionLogs: productionLogs.filter(l => l.id !== logId),
        });
      },

      // Customer Order Actions
      addCustomerOrder: (order) => {
        set((state) => ({ customerOrders: [...state.customerOrders, order] }));
      },
      updateCustomerOrder: (updatedOrder) =>
        set((state) => ({
          customerOrders: state.customerOrders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)),
        })),
      deleteCustomerOrder: (orderId) =>
        set((state) => ({
          customerOrders: state.customerOrders.filter((o) => o.id !== orderId),
        })),
      getCustomerOrderById: (orderId) => get().customerOrders.find(o => o.id === orderId),

      // ShipmentLog Actions
      addShipmentLog: (log) => {
        const product = get().products.find(p => p.id === log.productId);
        if (!product) {
          throw new Error(`Sevk edilecek ürün (ID: ${log.productId}) bulunamadı.`);
        }
        if (product.stock < log.quantity) {
          throw new Error(`Yetersiz stok: ${product.name} (${product.productCode}) için ${log.quantity} adet sevk edilemez. Mevcut stok: ${product.stock}.`);
        }
        set((state) => ({
          shipmentLogs: [...state.shipmentLogs, log],
          products: state.products.map((p) =>
            p.id === log.productId ? { ...p, stock: p.stock - log.quantity } : p
          ),
        }));
      },
      updateShipmentLog: (updatedLog) => {
        const { products, shipmentLogs } = get();
        const oldLog = shipmentLogs.find(l => l.id === updatedLog.id);

        if (!oldLog) {
          throw new Error("Güncellenecek sevkiyat kaydı bulunamadı.");
        }
        // Product ID cannot change during update for simplicity
        if (oldLog.productId !== updatedLog.productId) {
          throw new Error("Sevkiyat kaydı güncellenirken ürün ID'si değiştirilemez. Lütfen mevcut kaydı silip yeni bir kayıt oluşturun.");
        }

        const product = products.find(p => p.id === updatedLog.productId);
        if (!product) {
          throw new Error(`Sevk edilen ürün (ID: ${updatedLog.productId}) bulunamadı.`);
        }

        const quantityChange = updatedLog.quantity - oldLog.quantity; // new quantity - old quantity
        const newStockForProduct = product.stock - quantityChange; // if new qty > old qty, change is positive, stock decreases more. if new qty < old qty, change is negative, stock increases.

        if (newStockForProduct < 0) {
          throw new Error(`Yetersiz stok: ${product.name} (${product.productCode}) için stok ${newStockForProduct} olamaz. Mevcut stok: ${product.stock}, Eski sevk: ${oldLog.quantity}, Yeni sevk: ${updatedLog.quantity}.`);
        }
        
        set((state) => ({
          shipmentLogs: state.shipmentLogs.map((l) => (l.id === updatedLog.id ? updatedLog : l)),
          products: state.products.map((p) =>
            p.id === updatedLog.productId ? { ...p, stock: newStockForProduct } : p
          ),
        }));
      },
      deleteShipmentLog: (logId) => {
        const { products, shipmentLogs } = get();
        const logToDelete = shipmentLogs.find(l => l.id === logId);

        if (!logToDelete) {
          throw new Error("Silinecek sevkiyat kaydı bulunamadı.");
        }

        const product = products.find(p => p.id === logToDelete.productId);
        if (!product) {
          // This case should ideally not happen if data integrity is maintained.
          // If it does, we can only remove the log but can't adjust stock.
          console.warn(`Sevkiyatı silinecek ürün (ID: ${logToDelete.productId}) bulunamadı. Stok ayarlanamadı.`);
          set((state) => ({
            shipmentLogs: state.shipmentLogs.filter((l) => l.id !== logId),
          }));
          return;
        }

        set((state) => ({
          shipmentLogs: state.shipmentLogs.filter((l) => l.id !== logId),
          products: state.products.map((p) =>
            p.id === logToDelete.productId ? { ...p, stock: p.stock + logToDelete.quantity } : p
          ),
        }));
      },

    }),
    {
      name: 'stoktakip-storage', 
      storage: createJSONStorage(() => localStorage), 
    }
  )
);

export const getProductDisplayInfoById = (productId: string): string => {
  const products = useStore.getState().products;
  const product = products.find(p => p.id === productId);
  return product ? `${product.productCode} - ${product.name}` : 'Bilinmeyen Ürün';
};

export const getProductNameById = (productId: string): string => {
  const products = useStore.getState().products;
  const product = products.find(p => p.id === productId);
  return product ? product.name : 'Bilinmeyen Ürün';
};

export const getProductCodeById = (productId: string): string | undefined => {
    const product = useStore.getState().products.find(p => p.id === productId);
    return product?.productCode;
};

export const getProductUnitById = (productId: string): string | undefined => {
    const product = useStore.getState().products.find(p => p.id === productId);
    return product?.unit;
}

export const getCustomerOrderDisplayInfoById = (orderId?: string): string => {
  if (!orderId) return "Sipariş Yok";
  const order = useStore.getState().customerOrders.find(co => co.id === orderId);
  if (!order) return "Bilinmeyen Sipariş";
  return `${order.customerName} - ${new Date(order.orderDate).toLocaleDateString('tr-TR')}`;
}
