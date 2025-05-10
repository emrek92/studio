
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BomForm } from "./components/BomForm";
import { getBomColumns } from "./components/BomColumns";
import { useStore } from "@/lib/store"; // Removed getProductNameById, getProductCodeById as they are available in useStore directly or via DataTable cell renderers
import type { BOM, Product, BomComponent } from "@/types"; // Removed ProductType as it's part of Product
import { DataTable } from "@/components/DataTable";
import { PlusCircle, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { downloadExcelTemplate, parseExcelFile, findProductByCode } from "@/lib/excelUtils";
import * as z from "zod";

export default function BomsPage() {
  const { products, boms, deleteBom, addBom } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingBom, setEditingBom] = React.useState<BOM | undefined>(undefined);
  const [bomToDelete, setBomToDelete] = React.useState<string | null>(null);
  const { toast } = useToast();
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEdit = (bom: BOM) => {
    setEditingBom(bom);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = (bomId: string) => {
    setBomToDelete(bomId);
  };

  const handleDelete = () => {
    if (bomToDelete) {
      try {
        deleteBom(bomToDelete);
        toast({ title: "Ürün Reçetesi (BOM) Silindi", description: "Ürün Reçetesi (BOM) başarıyla silindi." });
      } catch (error: any) {
         toast({
          title: "Silme Hatası",
          description: error.message || "Ürün Reçetesi (BOM) silinirken bir hata oluştu.",
          variant: "destructive",
        });
      }
      setBomToDelete(null);
    }
  };

  const generateBomTemplate = () => {
    const headers = ["Ana Ürün Kodu (Mamul/Yarı Mamul)*", "Bileşen Ürün Kodu (Hammadde/Yarı Mamul)*", "Bileşen Miktarı*"];
    const exampleRows = [
        ["MAM-001", "HAM-001", 0.5],
        ["MAM-001", "YMM-001", 1],
        ["YMM-002", "HAM-002", 10],
        ["YMM-002", "HAM-003", 2],
    ];
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- Her satır, bir ana ürünün bir bileşenini tanımlar."],
        ["- 'Ana Ürün Kodu' sistemde kayıtlı bir 'mamul' veya 'yari_mamul' türünde ürünün kodu olmalıdır."],
        ["- 'Bileşen Ürün Kodu' sistemde kayıtlı bir 'hammadde' veya 'yari_mamul' türünde ürünün kodu olmalıdır."],
        ["- Bir ana ürün için birden fazla bileşen varsa, her bileşen için 'Ana Ürün Kodu' tekrarlanmalıdır."],
        ["- 'Bileşen Miktarı' pozitif bir sayı olmalıdır."],
        ["- Bir ürün (ana ürün) kendi reçetesinde bileşen olarak kullanılamaz."],
    ];

    downloadExcelTemplate([
      { sheetName: "UrunReceteleri", data: [headers, ...exampleRows, [], ...notes] },
    ], "Urun_Recetesi_Sablonu");
  };

  const handleBomImport = async (file: File) => {
    try {
      const parsedData = await parseExcelFile(file);
      const sheetData = parsedData["UrunReceteleri"];

      if (!sheetData) {
        toast({ title: "İçe Aktarma Hatası", description: "Excel dosyasında 'UrunReceteleri' sayfası bulunamadı.", variant: "destructive" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];
      
      const allProducts = useStore.getState().products;
      const existingBomsStore = useStore.getState().boms;

      const bomImportRowSchema = z.object({
        "Ana Ürün Kodu (Mamul/Yarı Mamul)*": z.string().min(1, "Ana ürün kodu zorunludur."),
        "Bileşen Ürün Kodu (Hammadde/Yarı Mamul)*": z.string().min(1, "Bileşen ürün kodu zorunludur."),
        "Bileşen Miktarı*": z.preprocess(val => Number(val), z.number({invalid_type_error: "Miktar sayı olmalıdır."}).positive("Miktar pozitif olmalıdır.")),
      });
      
      const bomsFromFile: Map<string, { productId: string; name: string; components: BomComponent[], mainProductObject: Product }> = new Map();

      for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
        const rowIndex = i + 2; 

        const validation = bomImportRowSchema.safeParse(row);
        if (!validation.success) {
          errorMessages.push(`Satır ${rowIndex}: Geçersiz veri - ${validation.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(', ')}`);
          errorCount++;
          continue;
        }
        
        const mainProductCode = validation.data["Ana Ürün Kodu (Mamul/Yarı Mamul)*"];
        const componentProductCode = validation.data["Bileşen Ürün Kodu (Hammadde/Yarı Mamul)*"];
        const quantity = validation.data["Bileşen Miktarı*"];

        const mainProduct = findProductByCode(mainProductCode, allProducts);
        if (!mainProduct || (mainProduct.type !== 'mamul' && mainProduct.type !== 'yari_mamul')) {
          errorMessages.push(`Satır ${rowIndex}: '${mainProductCode}' kodlu ana ürün (mamul/yarı mamul) bulunamadı veya türü yanlış.`);
          errorCount++;
          continue;
        }

        const componentProduct = findProductByCode(componentProductCode, allProducts);
        if (!componentProduct || (componentProduct.type !== 'hammadde' && componentProduct.type !== 'yari_mamul')) {
          errorMessages.push(`Satır ${rowIndex}: '${componentProductCode}' kodlu bileşen (hammadde/yarı mamul) ürün bulunamadı veya türü yanlış.`);
          errorCount++;
          continue;
        }

        if (mainProduct.id === componentProduct.id) {
            errorMessages.push(`Satır ${rowIndex}: Ana ürün ('${mainProductCode}') kendi reçetesinde bileşen olarak kullanılamaz.`);
            errorCount++;
            continue;
        }

        if (!bomsFromFile.has(mainProductCode)) {
           if (existingBomsStore.some(b => b.productId === mainProduct.id)) {
                errorMessages.push(`Satır ${rowIndex}: '${mainProductCode}' (${mainProduct.name}) için sistemde zaten bir ürün reçetesi mevcut. Bu ürün için içe aktarma atlanacak.`);
                errorCount++;
                // Mark this main product code to be skipped entirely later
                bomsFromFile.set(mainProductCode, { productId: "SKIP", name: "SKIP", components:[], mainProductObject: mainProduct});
                continue; 
            }
          bomsFromFile.set(mainProductCode, {
            productId: mainProduct.id,
            name: `${mainProduct.productCode} - ${mainProduct.name} Reçetesi`,
            components: [],
            mainProductObject: mainProduct,
          });
        }
        
        const bomEntry = bomsFromFile.get(mainProductCode)!;

        // If this main product is marked for skipping, don't add components
        if (bomEntry.productId === "SKIP") {
            continue;
        }


        if (bomEntry.components.some(c => c.productId === componentProduct.id)) {
           errorMessages.push(`Satır ${rowIndex}: '${mainProductCode}' reçetesi için '${componentProductCode}' bileşeni dosyada birden fazla kez tanımlanmış. Yalnızca ilk tanım dikkate alınacak.`);
           errorCount++;
           continue; 
        }
        bomEntry.components.push({ productId: componentProduct.id, quantity });
      }
      
      for (const [mainCode, bomData] of bomsFromFile.entries()) {
          if (bomData.productId === "SKIP") { // Skip if marked due to pre-existing BOM in store
              continue;
          }

          if (existingBomsStore.some(b => b.productId === bomData.productId)) {
              if (!errorMessages.some(msg => msg.includes(`sistemde zaten bir ürün reçetesi mevcut`) && msg.includes(mainCode))) {
                errorMessages.push(`'${mainCode}' (${bomData.mainProductObject.name}) için sistemde zaten bir ürün reçetesi mevcut olduğundan dosyadan aktarılmadı (dosya işlendikten sonra farkedildi).`);
              }
              errorCount++;
              continue;
          }

          if (bomData.components.length === 0) {
              errorMessages.push(`'${mainCode}' (${bomData.mainProductObject.name}) kodlu reçete için dosyada hiç geçerli bileşen tanımlanmamış veya eklenememiş.`);
              errorCount++;
              continue;
          }
          try {
            addBom({ id: crypto.randomUUID(), productId: bomData.productId, name: bomData.name, components: bomData.components });
            successCount++;
          } catch (e: any) {
            errorMessages.push(`'${mainCode}' reçetesi eklenirken hata: ${e.message}`);
            errorCount++;
          }
      }

      let description = `${successCount} Ürün Reçetesi (BOM) başarıyla içe aktarıldı.`;
      if (errorCount > 0) {
        description += ` ${errorCount} satır/reçetede hata oluştu veya atlandı.`;
        console.error("İçe aktarma hataları/notları:", errorMessages.join("\n"));
        toast({
            title: successCount > 0 && errorCount > 0 ? "Kısmi İçe Aktarma Tamamlandı" : "İçe Aktarma Tamamlanamadı",
            description: `${description}\nDetaylar için konsolu kontrol edin.`,
            variant: successCount === 0 && errorCount > 0 ? "destructive" : "default",
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


  const columns = React.useMemo(() => getBomColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [products, handleEdit, handleDeleteConfirm]); // dependencies re-evaluated

  if (!isMounted) {
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <h1 className="text-3xl font-bold">Ürün Reçeteleri (BOM)</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" /> Excel'den İçe Aktar
          </Button>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
              setIsFormOpen(isOpen);
              if (!isOpen) setEditingBom(undefined);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Ürün Reçetesi Oluştur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <BomForm
                bom={editingBom}
                onSuccess={() => {
                  setIsFormOpen(false);
                  setEditingBom(undefined);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <DataTable columns={columns} data={boms} />

       {bomToDelete && (
        <AlertDialog open={!!bomToDelete} onOpenChange={() => setBomToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ürün Reçetesini (BOM) Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu işlem geri alınamaz. Bu Ürün Reçetesi (BOM) veritabanından kalıcı olarak silinecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBomToDelete(null)}>İptal Et</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <ExcelImportDialog
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        entityName="Ürün Reçeteleri (BOM)"
        templateGenerator={generateBomTemplate}
        onImport={handleBomImport}
        templateFileName="Urun_Recetesi_Sablonu.xlsx"
      />
    </div>
  );
}
