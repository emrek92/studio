// src/lib/excelUtils.ts
import * as XLSX from 'xlsx';
import type { Product, ProductType, BOM, BomComponent, RawMaterialEntry, ProductionLog } from '@/types';
import { useStore } from './store'; // For accessing product list during parsing

export const downloadExcelTemplate = (sheetsData: { sheetName: string, data: (string | number)[][] }[], fileName: string) => {
  const wb = XLSX.utils.book_new();
  sheetsData.forEach(sheetInfo => {
    const ws = XLSX.utils.aoa_to_sheet(sheetInfo.data);
    // Set column widths (optional, for better readability)
    if (sheetInfo.data.length > 0 && sheetInfo.data[0].length > 0) {
        ws['!cols'] = sheetInfo.data[0].map((header: any) => ({ wch: String(header).length > 20 ? String(header).length : 20 }));
    }
    XLSX.utils.book_append_sheet(wb, ws, sheetInfo.sheetName);
  });
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const parseExcelFile = async (file: File): Promise<Record<string, any[]>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const binaryStr = event.target?.result;
        if (!binaryStr) {
          reject(new Error("Dosya okunamadı."));
          return;
        }
        // cellDates: true attempts to parse Excel dates into JS Date objects
        const workbook = XLSX.read(binaryStr, { type: 'binary', cellDates: true }); 
        const result: Record<string, any[]> = {};

        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          // header: 1 uses the first row as headers
          // defval: null ensures empty cells are null not undefined, for easier checking
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, blankrows: false });
          
          if (jsonData.length === 0) {
            result[sheetName] = [];
            return;
          }

          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1) as (string | number | Date | null)[][];
          
          result[sheetName] = dataRows
            .map(rowArray => {
              const rowObject: Record<string, any> = {};
              let hasValue = false; // Check if row has any non-empty value
              headers.forEach((header, index) => {
                const cellValue = rowArray[index];
                rowObject[header] = cellValue;
                if (cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '') {
                    hasValue = true;
                }
              });
              // Only include row if it has at least one value
              return hasValue ? rowObject : null; 
            })
            .filter(row => row !== null) as any[]; // Filter out completely empty rows
        });
        resolve(result);
      } catch (e) {
        console.error("Excel parse error:", e);
        reject(new Error("Excel dosyası işlenirken hata oluştu. Dosya formatını kontrol edin."));
      }
    };
    reader.onerror = (error) => {
        console.error("File reader error:", error);
        reject(new Error("Dosya okunurken bir hata oluştu."));
    };
    reader.readAsBinaryString(file);
  });
};

// Helper to find product ID by name (case-insensitive, trimmed)
export const findProductIdByName = (name: string, products: Product[]): string | undefined => {
    if (!name || typeof name !== 'string') return undefined;
    const product = products.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());
    return product?.id;
};

// Helper to find BOM ID by its main product's name
export const findBomIdByMainProductName = (mainProductName: string, boms: BOM[], products: Product[]): string | undefined => {
    if (!mainProductName || typeof mainProductName !== 'string') return undefined;
    const mainProductId = findProductIdByName(mainProductName, products);
    if (!mainProductId) return undefined;
    const bom = boms.find(b => b.productId === mainProductId);
    return bom?.id;
};
