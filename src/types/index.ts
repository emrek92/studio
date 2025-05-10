export type ProductType = 'hammadde' | 'yari_mamul' | 'mamul' | 'yardimci_malzeme';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  unit: string; // e.g., kg, adet, litre, metre
  stock: number;
  description?: string;
}

export interface BomComponent {
  productId: string; // ID of Hammadde or Yarı Mamul
  quantity: number;
}

export interface BOM {
  id: string;
  productId: string; // ID of the Mamul this BOM is for
  name: string; // Name of the BOM (e.g., "BOM for Product X")
  components: BomComponent[];
}

export interface RawMaterialEntry {
  id: string;
  productId: string; // ID of the Hammadde
  quantity: number;
  date: string; // ISO date string
  supplier?: string;
  notes?: string;
}

export interface ProductionLog {
  id: string;
  productId: string; // ID of the Mamul produced
  bomId: string; // ID of the BOM used
  quantity: number;
  date: string; // ISO date string
  notes?: string;
}
