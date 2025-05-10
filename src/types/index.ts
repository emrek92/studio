export type ProductType = 'hammadde' | 'yari_mamul' | 'mamul' | 'yardimci_malzeme';

export interface Product {
  id: string;
  productCode: string; 
  name: string;
  type: ProductType;
  unit: string; // örn: kg, adet, litre, metre
  stock: number;
  description?: string;
}

export interface BomComponent {
  productId: string; // Hammadde veya Yarı Mamul ID'si
  quantity: number;
}

export interface BOM {
  id: string;
  productId: string; // Bu BOM'un ait olduğu Mamul ID'si
  name: string; // BOM Adı (örn: "X Ürünü için BOM") - Otomatik oluşturulacak
  components: BomComponent[];
}

export interface RawMaterialEntry {
  id:string;
  productId: string; // Hammadde veya Yardımcı Malzeme ID'si
  quantity: number;
  date: string; // ISO tarih formatı
  supplierId?: string; // Tedarikçi ID'si
  purchaseOrderId?: string; // Satınalma Sipariş ID'si
  notes?: string;
}

export interface ProductionLog {
  id: string;
  productId: string; // Üretilen Mamul ID'si
  bomId: string; // Kullanılan BOM ID'si
  quantity: number;
  date: string; // ISO tarih formatı
  notes?: string;
}

export interface OrderItem {
  productId: string; // Mamul ID'si
  quantity: number;
}

export interface CustomerOrder {
  id: string;
  customerName: string;
  orderDate: string; // ISO tarih formatı
  items: OrderItem[];
}

export interface ShipmentLog {
  id: string;
  productId: string; // Sevk edilen Mamul ID'si
  quantity: number;
  date: string; // ISO tarih formatı
  customerOrderId?: string; // Bağlı müşteri sipariş ID'si (opsiyonel)
  notes?: string;
}

// New types for Suppliers and Purchase Orders
export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface PurchaseOrderItem {
  productId: string; // Hammadde veya Yardımcı Malzeme ID'si
  orderedQuantity: number;
  receivedQuantity: number;
  // unitPrice?: number; // Future enhancement
}

export type PurchaseOrderStatus = 'open' | 'partially_received' | 'closed' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  orderReference?: string; // Benzersiz sipariş referans no (opsiyonel, kullanıcı girebilir)
  supplierId: string;
  orderDate: string; // ISO
  expectedDeliveryDate?: string; // ISO
  items: PurchaseOrderItem[];
  status: PurchaseOrderStatus;
  notes?: string;
}
