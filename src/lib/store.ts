import { create } from 'zustand';
// import { persist, createJSONStorage } from 'zustand/middleware'; // Removed persist
import type { Product, BOM, RawMaterialEntry, ProductionLog, ProductType, BomComponent, CustomerOrder, OrderItem, ShipmentLog, Supplier, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '@/types';

interface AppState {
  products: Product[];
  boms: BOM[];
  rawMaterialEntries: RawMaterialEntry[];
  productionLogs: ProductionLog[];
  customerOrders: CustomerOrder[];
  shipmentLogs: ShipmentLog[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];

  // Product actions
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  getProductById: (productId: string) => Product | undefined;
  getProductByCode: (productCode: string) => Product | undefined;
  applyStockCount: (counts: Array<{ productId: string; quantity: number }>) => void;
  
  // BOM actions
  addBom: (bom: Omit<BOM, 'id' | 'name'>) => void;
  updateBom: (bom: BOM) => void;
  deleteBom: (bomId: string) => void;
  getBomById: (bomId: string) => BOM | undefined;

  // Raw Material Entry actions
  addRawMaterialEntry: (entry: Omit<RawMaterialEntry, 'id'>) => void;
  updateRawMaterialEntry: (updatedEntry: RawMaterialEntry) => void;
  deleteRawMaterialEntry: (entryId: string) => void;

  // Production Log actions
  addProductionLog: (log: Omit<ProductionLog, 'id'>) => void;
  updateProductionLog: (log: ProductionLog) => void; 
  deleteProductionLog: (logId: string) => void; 

  // Customer Order actions
  addCustomerOrder: (order: Omit<CustomerOrder, 'id'>) => void;
  updateCustomerOrder: (updatedOrder: CustomerOrder) => void;
  deleteCustomerOrder: (orderId: string) => void;
  getCustomerOrderById: (orderId: string) => CustomerOrder | undefined;

  // ShipmentLog actions
  addShipmentLog: (log: Omit<ShipmentLog, 'id'>) => void;
  updateShipmentLog: (updatedLog: ShipmentLog) => void;
  deleteShipmentLog: (logId: string) => void;

  // Supplier actions
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (supplierId: string) => void;
  getSupplierById: (supplierId: string) => Supplier | undefined;

  // Purchase Order actions
  addPurchaseOrder: (order: Omit<PurchaseOrder, 'id'>) => void;
  updatePurchaseOrder: (order: PurchaseOrder) => void;
  deletePurchaseOrder: (orderId: string) => void;
  getPurchaseOrderById: (orderId: string) => PurchaseOrder | undefined;
  updatePurchaseOrderStatus: (orderId: string) => void;
}

export const useStore = create<AppState>()(
  // persist( // Removed persist wrapper
    (set, get) => ({
      products: [],
      boms: [],
      rawMaterialEntries: [],
      productionLogs: [],
      customerOrders: [],
      shipmentLogs: [],
      suppliers: [],
      purchaseOrders: [],

      // Product actions
      addProduct: (productData) => {
        const existingProduct = get().products.find(p => p.productCode.toLowerCase() === productData.productCode.toLowerCase());
        if (existingProduct) {
          throw new Error(`'${productData.productCode}' kodlu ürün zaten mevcut.`);
        }
        const newProduct = { ...productData, id: crypto.randomUUID() };
        set((state) => ({ products: [...state.products, newProduct] }));
      },
      updateProduct: (updatedProduct) =>
        set((state) => ({
          products: state.products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
        })),
      deleteProduct: (productId) => {
        const isUsedInBom = get().boms.some(bom => bom.productId === productId || bom.components.some(c => c.productId === productId));
        if (isUsedInBom) {
          throw new Error("Bu ürün bir veya daha fazla Ürün Reçetesinde (BOM) kullanılıyor. Lütfen önce Ürün Reçetelerinden kaldırın.");
        }
        const isUsedInRawMaterialEntry = get().rawMaterialEntries.some(entry => entry.productId === productId);
        if (isUsedInRawMaterialEntry) {
          throw new Error("Bu ürün Hammadde Girişlerinde kullanılıyor. Lütfen önce girişleri silin.");
        }
        const isUsedInProductionLog = get().productionLogs.some(log => log.productId === productId);
        if (isUsedInProductionLog) {
          throw new Error("Bu ürün Üretim Kayıtlarında kullanılıyor. Lütfen önce üretim kayıtlarını silin.");
        }
        const isUsedInCustomerOrderItem = get().customerOrders.some(order => order.items.some(item => item.productId === productId));
        if (isUsedInCustomerOrderItem) {
            throw new Error("Bu ürün Müşteri Siparişlerinde kullanılıyor. Lütfen önce sipariş kalemlerinden kaldırın.");
        }
        const isUsedInShipmentLog = get().shipmentLogs.some(log => log.productId === productId);
        if (isUsedInShipmentLog) {
            throw new Error("Bu ürün Sevkiyat Kayıtlarında kullanılıyor. Lütfen önce sevkiyat kayıtlarını silin.");
        }
        const isUsedInPurchaseOrderItem = get().purchaseOrders.some(order => order.items.some(item => item.productId === productId));
        if (isUsedInPurchaseOrderItem) {
            throw new Error("Bu ürün Satınalma Siparişlerinde kullanılıyor. Lütfen önce sipariş kalemlerinden kaldırın.");
        }

        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
        }));
      },
      getProductById: (productId) => get().products.find(p => p.id === productId),
      getProductByCode: (productCode) => get().products.find(p => p.productCode.toLowerCase() === productCode.toLowerCase()),
      applyStockCount: (counts) => {
        set((state) => ({
          products: state.products.map(p => {
            const countedItem = counts.find(c => c.productId === p.id);
            return countedItem ? { ...p, stock: countedItem.quantity } : p;
          })
        }));
      },

      // BOM actions
      addBom: (bomData) => {
        const mainProduct = get().getProductById(bomData.productId);
        if (!mainProduct) throw new Error("Ana ürün bulunamadı.");
        const name = `${mainProduct.productCode} - ${mainProduct.name} Reçetesi`;
        const newBom: BOM = { ...bomData, id: crypto.randomUUID(), name };
        set((state) => ({ boms: [...state.boms, newBom] }));
      },
      updateBom: (updatedBomData) => {
        const mainProduct = get().getProductById(updatedBomData.productId);
        if (!mainProduct) throw new Error("Ana ürün bulunamadı.");
        const name = `${mainProduct.productCode} - ${mainProduct.name} Reçetesi`;
        const updatedBom = { ...updatedBomData, name };
        set((state) => ({
          boms: state.boms.map((b) => (b.id === updatedBom.id ? updatedBom : b)),
        }));
      },
      deleteBom: (bomId) => {
        const isUsedInProduction = get().productionLogs.some(log => log.bomId === bomId);
        if (isUsedInProduction) {
          throw new Error("Bu Ürün Reçetesi (BOM) bir veya daha fazla üretim kaydında kullanılıyor. Lütfen önce üretim kayıtlarını silin/değiştirin.");
        }
        set((state) => ({
          boms: state.boms.filter((b) => b.id !== bomId),
        }));
      },
      getBomById: (bomId) => get().boms.find(b => b.id === bomId),

      // Raw Material Entry actions
      addRawMaterialEntry: (entryData) => {
        const newEntry: RawMaterialEntry = { ...entryData, id: crypto.randomUUID() };
        set((state) => ({
          rawMaterialEntries: [...state.rawMaterialEntries, newEntry],
          products: state.products.map((p) =>
            p.id === newEntry.productId ? { ...p, stock: (p.stock || 0) + newEntry.quantity } : p
          ),
        }));

        if (newEntry.purchaseOrderId && newEntry.productId) {
          const po = get().purchaseOrders.find(o => o.id === newEntry.purchaseOrderId);
          if (po) {
            let poItemUpdated = false;
            const updatedItems = po.items.map(item => {
              if (item.productId === newEntry.productId) {
                const newReceived = item.receivedQuantity + newEntry.quantity;
                poItemUpdated = true;
                return { ...item, receivedQuantity: Math.min(newReceived, item.orderedQuantity) };
              }
              return item;
            });
            if (poItemUpdated) {
              get().updatePurchaseOrder({ ...po, items: updatedItems });
              get().updatePurchaseOrderStatus(po.id);
            }
          }
        }
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
            p.id === updatedEntry.productId ? { ...p, stock: Math.max(0, (p.stock || 0) + stockAdjustment) } : p
          ),
        }));
        
        if (oldEntry.purchaseOrderId && oldEntry.productId && oldEntry.purchaseOrderId !== updatedEntry.purchaseOrderId) {
            const oldPo = get().purchaseOrders.find(o => o.id === oldEntry.purchaseOrderId);
            if (oldPo) {
                const updatedOldPoItems = oldPo.items.map(item => {
                    if (item.productId === oldEntry.productId) {
                        return { ...item, receivedQuantity: Math.max(0, item.receivedQuantity - oldEntry.quantity) };
                    }
                    return item;
                });
                get().updatePurchaseOrder({ ...oldPo, items: updatedOldPoItems });
                get().updatePurchaseOrderStatus(oldPo.id);
            }
        }
        
        if (updatedEntry.purchaseOrderId && updatedEntry.productId) {
            const newPo = get().purchaseOrders.find(o => o.id === updatedEntry.purchaseOrderId);
            if (newPo) {
                const updatedNewPoItems = newPo.items.map(item => {
                    if (item.productId === updatedEntry.productId) {
                        let quantityChangeForNewPo = updatedEntry.quantity;
                        if (oldEntry.purchaseOrderId === updatedEntry.purchaseOrderId) {
                             quantityChangeForNewPo = updatedEntry.quantity - oldEntry.quantity; // only the diff
                        }
                        const newReceived = item.receivedQuantity + quantityChangeForNewPo;
                        return { ...item, receivedQuantity: Math.min(newReceived, item.orderedQuantity) };
                    }
                    return item;
                });
                get().updatePurchaseOrder({ ...newPo, items: updatedNewPoItems });
                get().updatePurchaseOrderStatus(newPo.id);
            }
        }
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
            p.id === entryToDelete.productId ? { ...p, stock: Math.max(0, (p.stock || 0) + stockAdjustment) } : p
          ),
        }));

        if (entryToDelete.purchaseOrderId && entryToDelete.productId) {
            const po = get().purchaseOrders.find(o => o.id === entryToDelete.purchaseOrderId);
            if (po) {
                const updatedItems = po.items.map(item => {
                    if (item.productId === entryToDelete.productId) {
                        return { ...item, receivedQuantity: Math.max(0, item.receivedQuantity - entryToDelete.quantity) };
                    }
                    return item;
                });
                get().updatePurchaseOrder({ ...po, items: updatedItems });
                get().updatePurchaseOrderStatus(po.id);
            }
        }
      },

      // Production Log actions
      addProductionLog: (logData) => {
        const bom = get().boms.find(b => b.id === logData.bomId);
        if (!bom) {
          const errorMsg = "Üretim kaydı için Ürün Reçetesi (BOM) bulunamadı.";
          throw new Error(errorMsg);
        }

        let productsToUpdate = [...get().products];
        let possible = true;
        let insufficientComponentName = '';

        const componentUpdates = bom.components.map(component => {
          const product = productsToUpdate.find(p => p.id === component.productId);
          if (!product || (product.stock || 0) < component.quantity * logData.quantity) {
            possible = false;
            insufficientComponentName = product ? `${product.productCode} - ${product.name}` : `ID: ${component.productId}`;
          }
          return {
            productId: component.productId,
            newStock: product ? (product.stock || 0) - (component.quantity * logData.quantity) : 0,
          };
        });
        
        if (!possible) {
          const errorMsg = `Üretim için yeterli '${insufficientComponentName}' bileşen stoğu bulunmamaktadır.`;
          throw new Error(errorMsg);
        }

        componentUpdates.forEach(update => {
          productsToUpdate = productsToUpdate.map(p => 
            p.id === update.productId ? { ...p, stock: update.newStock } : p
          );
        });
        
        productsToUpdate = productsToUpdate.map((p) =>
          p.id === logData.productId ? { ...p, stock: (p.stock || 0) + logData.quantity } : p
        );
        const newLog = { ...logData, id: crypto.randomUUID() };
        set({
          productionLogs: [...get().productionLogs, newLog],
          products: productsToUpdate,
        });
      },
      updateProductionLog: (updatedLog) => {
        const { products, boms, productionLogs } = get();
        const oldLog = productionLogs.find(l => l.id === updatedLog.id);

        if (!oldLog) {
          throw new Error("Güncellenecek üretim kaydı bulunamadı.");
        }
         if (oldLog.productId !== updatedLog.productId || oldLog.bomId !== updatedLog.bomId) {
          throw new Error("Üretim kaydı güncellenirken üretilen ürün veya kullanılan reçete değiştirilemez. Lütfen kaydı silip yenisini oluşturun.");
        }

        const bomUsed = boms.find(b => b.id === updatedLog.bomId);
        if (!bomUsed) {
          throw new Error("Üretim kaydının ürün reçetesi bulunamadı.");
        }

        const quantityDifference = updatedLog.quantity - oldLog.quantity;

        let tempProducts = [...products];
        tempProducts = tempProducts.map(p => {
          if (p.id === updatedLog.productId) {
            return { ...p, stock: Math.max(0, (p.stock || 0) + quantityDifference) };
          }
          return p;
        });

        let possible = true;
        let insufficientComponentName = '';
        bomUsed.components.forEach(comp => {
          tempProducts = tempProducts.map(p => {
            if (p.id === comp.productId) {
              const newStock = (p.stock || 0) - (comp.quantity * quantityDifference);
              if (newStock < 0) {
                possible = false;
                insufficientComponentName = `${p.productCode} - ${p.name}`;
              }
              return { ...p, stock: newStock };
            }
            return p;
          });
        });
        
        if (!possible) {
          throw new Error(`Güncelleme başarısız: Yeterli '${insufficientComponentName}' bileşen stoğu yok.`);
        }
        
        set({
          products: tempProducts,
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
              return { ...p, stock: (p.stock || 0) + (comp.quantity * logToDelete.quantity) };
            }
            return p;
          });
        });
        updatedProducts = updatedProducts.map(p => {
          if (p.id === logToDelete.productId) {
            return { ...p, stock: Math.max(0, (p.stock || 0) - logToDelete.quantity) };
          }
          return p;
        });

        set({
          products: updatedProducts,
          productionLogs: productionLogs.filter(l => l.id !== logId),
        });
      },

      // Customer Order Actions
      addCustomerOrder: (orderData) => {
        const newOrder = { ...orderData, id: crypto.randomUUID() };
        set((state) => ({ customerOrders: [...state.customerOrders, newOrder] }));
      },
      updateCustomerOrder: (updatedOrder) =>
        set((state) => ({
          customerOrders: state.customerOrders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)),
        })),
      deleteCustomerOrder: (orderId) => {
        const isUsedInShipment = get().shipmentLogs.some(log => log.customerOrderId === orderId);
        if (isUsedInShipment) {
          throw new Error("Bu müşteri siparişi bir veya daha fazla sevkiyat kaydında kullanılıyor. Lütfen önce sevkiyatları silin/değiştirin.");
        }
        set((state) => ({
          customerOrders: state.customerOrders.filter((o) => o.id !== orderId),
        }));
      },
      getCustomerOrderById: (orderId) => get().customerOrders.find(o => o.id === orderId),

       // ShipmentLog Actions
      addShipmentLog: (logData) => {
        const product = get().products.find(p => p.id === logData.productId);
        if (!product) {
          throw new Error(`Sevk edilecek ürün (ID: ${logData.productId}) bulunamadı.`);
        }
        if (product.type !== 'mamul') {
            throw new Error(`Sadece mamul ürünler sevk edilebilir. ${product.name} bir mamul değildir.`);
        }
        if ((product.stock || 0) < logData.quantity) {
          throw new Error(`Yetersiz stok: ${product.name} (${product.productCode}) için ${logData.quantity} adet sevk edilemez. Mevcut stok: ${product.stock || 0}.`);
        }
        const newLog: ShipmentLog = { ...logData, id: crypto.randomUUID() };
        set((state) => ({
          shipmentLogs: [...state.shipmentLogs, newLog],
          products: state.products.map((p) =>
            p.id === newLog.productId ? { ...p, stock: (p.stock || 0) - newLog.quantity } : p
          ),
        }));
      },
      updateShipmentLog: (updatedLog) => {
        const { products, shipmentLogs } = get();
        const oldLog = shipmentLogs.find(l => l.id === updatedLog.id);

        if (!oldLog) {
          throw new Error("Güncellenecek sevkiyat kaydı bulunamadı.");
        }
        if (oldLog.productId !== updatedLog.productId) {
          throw new Error("Sevkiyat kaydı güncellenirken ürün ID'si değiştirilemez. Lütfen mevcut kaydı silip yeni bir kayıt oluşturun.");
        }

        const product = products.find(p => p.id === updatedLog.productId);
        if (!product) {
          throw new Error(`Sevk edilen ürün (ID: ${updatedLog.productId}) bulunamadı.`);
        }

        const quantityChange = updatedLog.quantity - oldLog.quantity; 
        const newStockForProduct = (product.stock || 0) - quantityChange;

        if (newStockForProduct < 0) {
          throw new Error(`Yetersiz stok: ${product.name} (${product.productCode}) için stok ${newStockForProduct} olamaz. Mevcut stok: ${product.stock || 0}, Eski sevk: ${oldLog.quantity}, Yeni sevk: ${updatedLog.quantity}.`);
        }
        
        set((state) => ({
          shipmentLogs: state.shipmentLogs.map((l) => (l.id === updatedLog.id ? updatedLog : l)),
          products: state.products.map((p) =>
            p.id === updatedLog.productId ? { ...p, stock: newStockForProduct } : p
          ),
        }));
      },
      deleteShipmentLog: (logId: string) => {
        const logToDelete = get().shipmentLogs.find(l => l.id === logId);
        if (!logToDelete) {
          throw new Error("Silinecek sevkiyat kaydı bulunamadı.");
        }
        
        set(state => {
          const updatedShipmentLogs = state.shipmentLogs.filter(l => l.id !== logId);
          const productToAdjust = state.products.find(p => p.id === logToDelete.productId);

          if (!productToAdjust) {
             console.warn(`Sevkiyat (ID: ${logId}) silindi ancak ilişkili ürün (ID: ${logToDelete.productId}) bulunamadığı için stok güncellenemedi.`);
             return { shipmentLogs: updatedShipmentLogs, products: state.products };
          }
          
          const newStock = (productToAdjust.stock || 0) + logToDelete.quantity;
          const updatedProducts = state.products.map(p =>
            p.id === logToDelete.productId
              ? { ...p, stock: newStock }
              : p
          );
          
          return {
            shipmentLogs: updatedShipmentLogs,
            products: updatedProducts,
          };
        });
      },

      // Supplier actions
      addSupplier: (supplierData) => {
        const existingSupplier = get().suppliers.find(s => s.name.toLowerCase() === supplierData.name.toLowerCase());
        if (existingSupplier) {
          throw new Error(`'${supplierData.name}' adlı tedarikçi zaten mevcut.`);
        }
        const newSupplier = { ...supplierData, id: crypto.randomUUID() };
        set((state) => ({ suppliers: [...state.suppliers, newSupplier] }));
      },
      updateSupplier: (updatedSupplier) =>
        set((state) => ({
          suppliers: state.suppliers.map((s) => (s.id === updatedSupplier.id ? updatedSupplier : s)),
        })),
      deleteSupplier: (supplierId) => {
        const isUsedInPurchaseOrder = get().purchaseOrders.some(po => po.supplierId === supplierId);
        if (isUsedInPurchaseOrder) {
          throw new Error("Bu tedarikçi bir veya daha fazla satınalma siparişinde kullanılıyor. Lütfen önce siparişleri silin/değiştirin.");
        }
        const isUsedInRawMaterialEntry = get().rawMaterialEntries.some(rme => rme.supplierId === supplierId);
        if(isUsedInRawMaterialEntry) {
            throw new Error("Bu tedarikçi bir veya daha fazla hammadde girişinde kullanılıyor. Lütfen önce girişleri silin/değiştirin.");
        }
        set((state) => ({
          suppliers: state.suppliers.filter((s) => s.id !== supplierId),
        }));
      },
      getSupplierById: (supplierId) => get().suppliers.find(s => s.id === supplierId),

      // Purchase Order actions
      addPurchaseOrder: (orderData) => {
        if (orderData.orderReference) {
            const existingOrder = get().purchaseOrders.find(po => po.orderReference?.toLowerCase() === orderData.orderReference?.toLowerCase());
            if(existingOrder) {
                throw new Error(`'${orderData.orderReference}' referans numaralı satınalma siparişi zaten mevcut.`);
            }
        }
        const newOrder = { ...orderData, id: crypto.randomUUID() };
        set((state) => ({ purchaseOrders: [...state.purchaseOrders, newOrder] }));
      },
      updatePurchaseOrder: (updatedOrder) =>
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)),
        })),
      deletePurchaseOrder: (orderId) => {
        const isUsedInRawMaterialEntry = get().rawMaterialEntries.some(entry => entry.purchaseOrderId === orderId);
        if (isUsedInRawMaterialEntry) {
          throw new Error("Bu satınalma siparişi bir veya daha fazla hammadde girişinde kullanılıyor. Lütfen önce girişleri güncelleyin.");
        }
        set((state) => ({
          purchaseOrders: state.purchaseOrders.filter((o) => o.id !== orderId),
        }));
      },
      getPurchaseOrderById: (orderId) => get().purchaseOrders.find(o => o.id === orderId),
      updatePurchaseOrderStatus: (orderId: string) => {
        const order = get().purchaseOrders.find(o => o.id === orderId);
        if (!order) return;

        if (order.status === 'cancelled') return; 

        const allItemsClosed = order.items.every(item => item.receivedQuantity >= item.orderedQuantity);
        const anyItemPartiallyReceived = order.items.some(item => item.receivedQuantity > 0 && item.receivedQuantity < item.orderedQuantity);
        const anyItemOpen = order.items.some(item => item.receivedQuantity < item.orderedQuantity);

        let newStatus: PurchaseOrderStatus = 'open';
        if (allItemsClosed) {
          newStatus = 'closed';
        } else if (anyItemPartiallyReceived || (order.items.some(i => i.receivedQuantity > 0) && anyItemOpen)) {
          newStatus = 'partially_received';
        }
        
        if (order.status !== newStatus) {
          get().updatePurchaseOrder({ ...order, status: newStatus });
        }
      },

    })
  // ) // Removed persist closing parenthesis
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

export const getSupplierNameById = (supplierId?: string): string => {
  if (!supplierId) return "Bilinmeyen Tedarikçi";
  const supplier = useStore.getState().suppliers.find(s => s.id === supplierId);
  return supplier ? supplier.name : "Bilinmeyen Tedarikçi";
}

export const getPurchaseOrderReferenceById = (orderId?: string): string => {
    if (!orderId) return "Sipariş Yok";
    const order = useStore.getState().purchaseOrders.find(po => po.id === orderId);
    if (!order) return "Bilinmeyen Satınalma Siparişi";
    return order.orderReference || `ID: ${order.id.substring(0,8)}`;
}

export const isProductPurchasable = (productId: string): boolean => {
  const product = useStore.getState().products.find(p => p.id === productId);
  return product ? product.type === 'hammadde' || product.type === 'yardimci_malzeme' : false;
};
