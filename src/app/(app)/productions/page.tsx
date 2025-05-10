"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductionLogForm } from "./components/ProductionLogForm";
import { productionLogColumns } from "./components/ProductionLogColumns";
import { useStore } from "@/lib/store";
import type { ProductionLog, Product, BOM } from "@/types";
import { DataTable } from "@/components/DataTable";
import { PlusCircle, UploadCloud } from "lucide-react";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { downloadExcelTemplate, parseExcelFile, findProductIdByName, findBomIdByMainProductName } from "@/lib/excelUtils";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";

export default function ProductionLogsPage() {
  const { productionLogs, products, boms, addProductionLog } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const columns = productionLogColumns;

  const generateProductionLogTemplate = () => {
    const headers = ["Üretilen Mamul Adı*", "Kullanılan Reçetenin Ana Ürün Adı*", "Üretim Miktarı*", "Tarih (GG.AA.YYYY)*", "Notlar"];
    const exampleRow = ["Örnek Mamul A", "Örnek Mamul A", 50, "02.01.2024", "Günlük üretim"];
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Üretilen Mamul Adı' sistemde kayıtlı bir 'mamul' türünde ürün olmalıdır."],
        ["- 'Kullanılan Reçetenin Ana Ürün Adı' sistemde kayıtlı ve bu mamule ait bir ürün reçetesinin ana ürün adı olmalıdır."],
        ["- 'Üretim Miktarı' pozitif bir sayı olmalıdır."],
        ["- 'Tarih' GG.AA.YYYY formatında veya Excel'in tarih formatında olmalıdır."],
    ];
    downloadExcelTemplate([{ sheetName: "UretimKayitlari", data: [headers, exampleRow, [], ...notes] }], "Uretim_Kayit_Sablonu");
  };

  const handleProductionLogImport = async (file: File) => {
    try {
      const parsedData = await parseExcelFile(file);
      const sheet = parsedData["UretimKayitlari"];

      if (!sheet) {
        toast({ title: "İçe Aktarma Hatası", description: "Excel dosyasında 'UretimKayitlari' sayfası bulunamadı.", variant: "destructive" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];
      const allProducts = useStore.getState().products;
      const allBoms = useStore.getState().boms;

      const importSchema = z.object({
        "Üretilen Mamul Adı*": z.string().min(1, "Mamul adı zorunludur."),
        "Kullanılan Reçetenin Ana Ürün Adı*": z.string().min(1, "Reçete ana ürün adı zorunludur."),
        "Üretim Miktarı*": z.preprocess(val => Number(val), z.number().positive("Miktar pozitif olmalıdır.")),
        "Tarih (GG.AA.YYYY)*": z.date({ errorMap: () => ({ message: "Geçerli bir tarih girilmelidir."}) }),
        "Notlar": z.string().optional().nullable(),
      });
      
      for (const row of sheet) {
        const validationResult = importSchema.safeParse(row);
        if (validationResult.success) {
          const data = validationResult.data;
          
          const producedProductName = data["Üretilen Mamul Adı*"];
          const producedProduct = allProducts.find(p => p.name.toLowerCase().trim() === producedProductName.toLowerCase().trim() && p.type === 'mamul');
          if (!producedProduct) {
            errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${producedProductName}' adlı mamul ürün bulunamadı.`);
            errorCount++;
            continue;
          }

          const bomOwnerProductName = data["Kullanılan Reçetenin Ana Ürün Adı*"];
          const bomId = findBomIdByMainProductName(bomOwnerProductName, allBoms, allProducts);
          const bom = allBoms.find(b => b.id === bomId);

          if (!bom || bom.productId !== producedProduct.id) {
            errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${producedProductName}' için '${bomOwnerProductName}' adlı ana ürüne sahip geçerli bir reçete bulunamadı.`);
            errorCount++;
            continue;
          }

          // Check stock for components (simplified check, actual check is in addProductionLog)
          let canProduce = true;
          for (const component of bom.components) {
            const componentProduct = allProducts.find(p => p.id === component.productId);
            if (!componentProduct || componentProduct.stock < component.quantity * data["Üretim Miktarı*"]) {
              canProduce = false;
              errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${producedProductName}' üretimi için yeterli '${componentProduct?.name || component.productId}' stoğu yok.`);
              break;
            }
          }
          if(!canProduce) {
            errorCount++;
            continue;
          }


          const newLog: ProductionLog = {
            id: crypto.randomUUID(),
            productId: producedProduct.id,
            bomId: bom.id,
            quantity: data["Üretim Miktarı*"],
            date: data["Tarih (GG.AA.YYYY)*"].toISOString(),
            notes: data["Notlar"] || undefined,
          };
          
          // addProductionLog handles stock updates and its own error (e.g. insufficient stock)
          // For import, we rely on the store's internal logic for stock checks.
          // If addProductionLog internally throws or returns an error state, we should catch it.
          // For now, we assume addProductionLog will show its own toast for stock issues.
          const initialLogCount = useStore.getState().productionLogs.length;
          addProductionLog(newLog);
          if (useStore.getState().productionLogs.length > initialLogCount) {
            successCount++;
          } else {
            // Log was not added, likely due to stock issue alerted by addProductionLog
            errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${producedProductName}' üretimi yapılamadı (muhtemelen stok yetersiz).`);
            errorCount++;
          }

        } else {
          errorCount++;
          const errors = validationResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
          errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: ${row["Üretilen Mamul Adı*"] || 'Bilinmeyen Kayıt'} - ${errors}`);
        }
      }

      let description = `${successCount} üretim kaydı başarıyla içe aktarıldı.`;
      if (errorCount > 0) {
        description += ` ${errorCount} kayıtta hata oluştu.`;
        console.error("İçe aktarma hataları:", errorMessages);
      }
      toast({ title: "İçe Aktarma Tamamlandı", description });
      if(successCount > 0) setIsImportModalOpen(false);

    } catch (error: any) {
      toast({ title: "İçe Aktarma Hatası", description: error.message || "Dosya işlenirken bir hata oluştu.", variant: "destructive" });
    }
  };


  if (!isMounted) {
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <h1 className="text-3xl font-bold">Üretim Kayıtları</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" /> Excel'den İçe Aktar
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Üretim Kaydı
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <ProductionLogForm
                onSuccess={() => {
                  setIsFormOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <DataTable columns={columns} data={productionLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())} />
      <ExcelImportDialog
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        entityName="Üretim Kayıtları"
        templateGenerator={generateProductionLogTemplate}
        onImport={handleProductionLogImport}
        templateFileName="Uretim_Kayit_Sablonu.xlsx"
      />
    </div>
  );
}
