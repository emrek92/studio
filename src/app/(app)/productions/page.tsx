
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
import { downloadExcelTemplate, parseExcelFile, findProductByCode, findBomIdByMainProductCode } from "@/lib/excelUtils";
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
    const headers = ["Üretilen Mamul Kodu*", "Üretilen Mamul Adı - Bilgilendirme", "Kullanılan Reçetenin Ana Ürün Kodu*", "Üretim Miktarı*", "Tarih (GG.AA.YYYY)*", "Notlar"];
    const exampleRow = ["MAM-001", "Örnek Mamul A", "MAM-001", 50, "02.01.2024", "Günlük üretim"];
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Üretilen Mamul Kodu' sistemde kayıtlı bir 'mamul' türünde ürünün kodu olmalıdır."],
        ["- 'Üretilen Mamul Adı' sadece bilgilendirme amaçlıdır, içe aktarımda dikkate alınmaz."],
        ["- 'Kullanılan Reçetenin Ana Ürün Kodu' sistemde kayıtlı ve bu mamule ait bir ürün reçetesinin ana ürün kodu olmalıdır."],
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
        "Üretilen Mamul Kodu*": z.preprocess(
          val => (typeof val === 'number' ? String(val) : val),
          z.string().min(1, "Mamul ürün kodu zorunludur.")
        ),
        "Kullanılan Reçetenin Ana Ürün Kodu*": z.preprocess(
          val => (typeof val === 'number' ? String(val) : val),
          z.string().min(1, "Reçete ana ürün kodu zorunludur.")
        ),
        "Üretim Miktarı*": z.preprocess(val => Number(val), z.number().positive("Miktar pozitif olmalıdır.")),
        "Tarih (GG.AA.YYYY)*": z.date({ errorMap: () => ({ message: "Geçerli bir tarih girilmelidir."}) }),
        "Notlar": z.string().optional().nullable(),
      });
      
      for (const row of sheet) {
        // Skip empty rows or rows that are likely headers/notes based on fewer expected values
        if (Object.values(row).filter(v => v !== null && v !== undefined && String(v).trim() !== '').length < 3) { 
            continue;
        }

        const validationResult = importSchema.safeParse(row);
        if (validationResult.success) {
          const data = validationResult.data;
          
          const producedProductCode = data["Üretilen Mamul Kodu*"];
          const producedProduct = findProductByCode(producedProductCode, allProducts);
          if (!producedProduct || producedProduct.type !== 'mamul') {
            errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${producedProductCode}' kodlu mamul ürün bulunamadı veya türü yanlış.`);
            errorCount++;
            continue;
          }

          const bomOwnerProductCode = data["Kullanılan Reçetenin Ana Ürün Kodu*"];
          const bomId = findBomIdByMainProductCode(bomOwnerProductCode, allBoms, allProducts);
          const bom = allBoms.find(b => b.id === bomId);

          if (!bom || bom.productId !== producedProduct.id) {
            errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${producedProductCode}' (${producedProduct.name}) için '${bomOwnerProductCode}' kodlu ana ürüne sahip geçerli bir reçete bulunamadı.`);
            errorCount++;
            continue;
          }

          // Preliminary stock check for components (actual check is in addProductionLog)
          let canProduce = true;
          for (const component of bom.components) {
            const componentProduct = allProducts.find(p => p.id === component.productId);
            if (!componentProduct || componentProduct.stock < component.quantity * data["Üretim Miktarı*"]) {
              canProduce = false;
              errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${producedProductCode}' (${producedProduct.name}) üretimi için yeterli '${componentProduct?.productCode || component.productId}' (${componentProduct?.name || 'Bilinmeyen'}) stoğu yok.`);
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
          
          const initialLogCount = useStore.getState().productionLogs.length;
          addProductionLog(newLog);
          if (useStore.getState().productionLogs.length > initialLogCount) {
            successCount++;
          } else {
            errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${producedProductCode}' (${producedProduct.name}) üretimi yapılamadı (muhtemelen stok yetersiz).`);
            errorCount++;
          }

        } else {
          errorCount++;
          const errors = validationResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
          errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: ${row["Üretilen Mamul Kodu*"] || 'Bilinmeyen Kayıt'} - ${errors}`);
        }
      }

      let description = `${successCount} üretim kaydı başarıyla içe aktarıldı.`;
      if (errorCount > 0) {
        description += ` ${errorCount} kayıtta hata oluştu.`;
        console.error("İçe aktarma hataları:", errorMessages.join("\n"));
        toast({
            title: "Kısmi İçe Aktarma Tamamlandı",
            description: `${description}\nDetaylar için konsolu kontrol edin.`,
            variant: "default",
            duration: 10000,
         });
      } else {
        toast({ title: "İçe Aktarma Tamamlandı", description });
      }
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
