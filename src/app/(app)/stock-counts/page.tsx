"use client";

import * as React from "react";
import { StockCountForm } from "./components/StockCountForm";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { downloadExcelTemplate, parseExcelFile, findProductByCode } from "@/lib/excelUtils";
import { PlusCircle, UploadCloud } from "lucide-react";
import * as z from "zod";

interface CountItem {
  productId: string;
  quantity: number;
}

export default function StockCountsPage() {
  const { products, applyStockCount, getProductById } = useStore();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
  const [pendingCounts, setPendingCounts] = React.useState<CountItem[] | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSaveCount = (counts: CountItem[]) => {
    setPendingCounts(counts);
    setIsConfirmDialogOpen(true);
  };

  const confirmApplyCount = () => {
    if (pendingCounts) {
      try {
        applyStockCount(pendingCounts);
        toast({
          title: "Stok Sayımı Uygulandı",
          description: "Tüm ürün stokları başarıyla güncellendi.",
        });
      } catch (error: any) {
        toast({
          title: "Hata",
          description: error.message || "Stok sayımı uygulanırken bir hata oluştu.",
          variant: "destructive",
        });
      }
    }
    setIsConfirmDialogOpen(false);
    setPendingCounts(null);
  };

  const generateStockCountTemplate = () => {
    const headers = ["Ürün Kodu*", "Sayılan Miktar*"];
    const exampleProduct = products.length > 0 ? products[0] : null;
    const exampleRows = exampleProduct ? [[exampleProduct.productCode, exampleProduct.stock]] : [["ÖRNEK-KOD-001", 10]];
    
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Ürün Kodu' sistemde kayıtlı bir ürünün kodu olmalıdır."],
        ["- 'Sayılan Miktar' pozitif bir sayı veya 0 olmalıdır."],
        ["- Excel'de bulunmayan ürünlerin stokları değişmeyecektir."]
    ];
    downloadExcelTemplate([{ sheetName: "StokSayimi", data: [headers, ...exampleRows, [], ...notes] }], "Stok_Sayim_Sablonu");
  };

  const handleStockCountImport = async (file: File) => {
    try {
      const parsedData = await parseExcelFile(file);
      const sheetData = parsedData["StokSayimi"];

      if (!sheetData) {
        toast({ title: "İçe Aktarma Hatası", description: "Excel dosyasında 'StokSayimi' sayfası bulunamadı.", variant: "destructive" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];
      const importedCounts: CountItem[] = [];
      const allProducts = useStore.getState().products;

      const stockCountImportSchema = z.object({
        "Ürün Kodu*": z.string().min(1, "Ürün kodu zorunludur."),
        "Sayılan Miktar*": z.preprocess(
          val => Number(val), 
          z.number({invalid_type_error: "Sayılan miktar sayı olmalıdır."}).min(0, "Sayılan miktar 0 veya daha büyük olmalıdır.")
        ),
      });
      
      for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
        const rowIndex = i + 2; 

        const validation = stockCountImportSchema.safeParse(row);
        if (!validation.success) {
          errorMessages.push(`Satır ${rowIndex}: ${validation.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(', ')}`);
          errorCount++;
          continue;
        }
        
        const data = validation.data;
        const product = findProductByCode(data["Ürün Kodu*"], allProducts);

        if (!product) {
          errorMessages.push(`Satır ${rowIndex}: '${data["Ürün Kodu*"]}' kodlu ürün sistemde bulunamadı.`);
          errorCount++;
          continue;
        }
        
        importedCounts.push({ productId: product.id, quantity: data["Sayılan Miktar*"] });
        successCount++;
      }
      
      if (errorCount > 0) {
        toast({
            title: "İçe Aktarma Hatası",
            description: `${errorCount} satırda hata bulundu. Detaylar için konsolu kontrol edin.\nBaşarılı satır sayısı: ${successCount}`,
            variant: "destructive",
            duration: 10000,
         });
        console.error("Stok Sayımı İçe Aktarma Hataları:", errorMessages.join("\n"));
      } else if (successCount === 0) {
         toast({
            title: "İçe Aktarma Başarısız",
            description: "Excel dosyasında geçerli veri bulunamadı.",
            variant: "destructive",
         });
         return;
      }

      if (successCount > 0) {
        setPendingCounts(importedCounts);
        setIsConfirmDialogOpen(true);
        toast({
          title: "Veri Okundu",
          description: `${successCount} ürün için sayım verisi okundu. Uygulamak için onaylayın.`,
        });
      }
      setIsImportModalOpen(false);

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
        <h1 className="text-3xl font-bold">Stok Sayımı</h1>
        <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" /> Excel'den İçe Aktar
        </Button>
      </div>
      <StockCountForm
        initialProducts={products}
        onSubmit={handleSaveCount}
        getProductById={getProductById}
      />
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stok Sayımını Onayla</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem, {pendingCounts?.length || 0} ürünün stok miktarını girilen/içe aktarılan sayım değerlerine göre güncelleyecektir. Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingCounts(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApplyCount}>Onayla ve Uygula</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExcelImportDialog
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        entityName="Stok Sayımı"
        templateGenerator={generateStockCountTemplate}
        onImport={handleStockCountImport}
        templateFileName="Stok_Sayim_Sablonu.xlsx"
      />
    </div>
  );
}
