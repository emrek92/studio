
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
import { useStore, getProductNameById, getProductCodeById } from "@/lib/store";
import type { BOM, Product, BomComponent, ProductType } from "@/types";
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
      const isUsedInProduction = useStore.getState().productionLogs.some(log => log.bomId === bomToDelete);
      if (isUsedInProduction) {
         toast({
          title: "Silme Hatası",
          description: "Bu Ürün Reçetesi (BOM) bir veya daha fazla üretim kaydında kullanılıyor. Lütfen önce üretim kayıtlarını silin/değiştirin.",
          variant: "destructive",
        });
        setBomToDelete(null);
        return;
      }

      deleteBom(bomToDelete);
      toast({ title: "Ürün Reçetesi (BOM) Silindi", description: "Ürün Reçetesi (BOM) başarıyla silindi." });
      setBomToDelete(null);
    }
  };

  const generateBomTemplate = () => {
    const headers = ["Ana Mamul Ürün Kodu*", "Ana Mamul Adı (Bilgi)", "Bileşen Ürün Kodu*", "Bileşen Adı (Bilgi)", "Miktar*"];
    const exampleRows = [
        ["MAM-001", "Örnek Kırmızı Boyalı Kutu", "HAM-001", "Kırmızı Boya", 0.5],
        ["MAM-001", "Örnek Kırmızı Boyalı Kutu", "YMM-001", "Karton Kutu", 1],
        ["MAM-002", "Örnek Montajlı Ürün", "HAM-002", "Vida", 10],
        ["MAM-002", "Örnek Montajlı Ürün", "YMM-002", "Metal Plaka", 2],
    ];
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- Her satır, bir ana mamulün bir bileşenini tanımlar."],
        ["- 'Ana Mamul Ürün Kodu' sistemde kayıtlı bir 'mamul' türünde ürünün kodu olmalıdır."],
        ["- 'Bileşen Ürün Kodu' sistemde kayıtlı bir 'hammadde' veya 'yari_mamul' türünde ürünün kodu olmalıdır."],
        ["- Bir ana mamul için birden fazla bileşen varsa, her bileşen için 'Ana Mamul Ürün Kodu' ve 'Ana Mamul Adı' tekrarlanmalıdır."],
        ["- 'Ana Mamul Adı' ve 'Bileşen Adı' sadece bilgilendirme amaçlıdır, içe aktarımda dikkate alınmaz (kodlar esastır)."],
        ["- 'Miktar' pozitif bir sayı olmalıdır."],
        ["- Bir ürün (ana mamul) kendi reçetesinde bileşen olarak kullanılamaz."],
    ];

    downloadExcelTemplate([
      { sheetName: "UrunReceteleri", data: [headers, ...exampleRows, [], ...notes] },
    ], "Urun_Recetesi_Tekli_Sablon");
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
        "Ana Mamul Ürün Kodu*": z.string().min(1, "Ana mamul ürün kodu zorunludur."),
        "Bileşen Ürün Kodu*": z.string().min(1, "Bileşen ürün kodu zorunludur."),
        "Miktar*": z.preprocess(val => Number(val), z.number({invalid_type_error: "Miktar sayı olmalıdır."}).positive("Miktar pozitif olmalıdır.")),
        // "Ana Mamul Adı (Bilgi)": z.string().optional().nullable(), // For Zod, not strictly needed for processing if only code is used
        // "Bileşen Adı (Bilgi)": z.string().optional().nullable(),
      });
      
      // Map to hold BOM data being constructed from the file: Key is mainProductCode
      const bomsFromFile: Map<string, { productId: string; name: string; components: BomComponent[], mainProductObject: Product }> = new Map();

      for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
        const rowIndex = i + 2; // For user-friendly error messages (1-based index, +1 for header)

        const validation = bomImportRowSchema.safeParse(row);
        if (!validation.success) {
          errorMessages.push(`Satır ${rowIndex}: Geçersiz veri - ${validation.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(', ')}`);
          errorCount++;
          continue;
        }
        
        const mainProductCode = validation.data["Ana Mamul Ürün Kodu*"];
        const componentProductCode = validation.data["Bileşen Ürün Kodu*"];
        const quantity = validation.data["Miktar*"];

        const mainProduct = findProductByCode(mainProductCode, allProducts);
        if (!mainProduct || mainProduct.type !== 'mamul') {
          errorMessages.push(`Satır ${rowIndex}: '${mainProductCode}' kodlu ana mamul ürün bulunamadı veya türü yanlış.`);
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
            errorMessages.push(`Satır ${rowIndex}: Ana mamul ('${mainProductCode}') kendi reçetesinde bileşen olarak kullanılamaz.`);
            errorCount++;
            continue;
        }

        // Initialize BOM in map if not present
        if (!bomsFromFile.has(mainProductCode)) {
           if (existingBomsStore.some(b => b.productId === mainProduct.id)) {
                errorMessages.push(`Satır ${rowIndex}: '${mainProductCode}' (${mainProduct.name}) için sistemde zaten bir ürün reçetesi mevcut. Dosyadan içe aktarma işlemi bu ürün için atlanacak.`);
                // To prevent adding components to an existing BOM or creating a duplicate, we can skip further processing for this mainProductCode if it's already in the store.
                // However, the current logic structure will process all lines from file for this mainProductCode.
                // A better way might be to collect all components for a mainProductCode, and only then decide to add/reject the BOM.
                // For now, we mark as error and potentially skip in final addBOM step.
                // Let's refine: if it's in store, we don't add it from file.
                 errorCount++; // Consider this an error if user tries to re-import existing.
                 // We can use a set to track mainProductCodes that are already in store to skip them entirely
                 // This check is now good here. If it's in the store, we don't want to process it from file.
                 // However, we need to continue parsing the file for other BOMs.
                 // A better approach would be to collect all lines for a specific mainProductCode and if it's already in store, skip all its lines.
                 // The current loop processes line by line.
                 // Alternative: build the bomsFromFile map, then filter out ones that exist in store before adding.
                 // For now, this error message is a good first step.
            }
          bomsFromFile.set(mainProductCode, {
            productId: mainProduct.id,
            name: `${mainProduct.productCode} - ${mainProduct.name} Reçetesi`,
            components: [],
            mainProductObject: mainProduct,
          });
        }
        
        const bomEntry = bomsFromFile.get(mainProductCode)!;

        // If this BOM is for a product that already has a BOM in the store, we should skip adding components to it from the file
        // This check is slightly redundant if we correctly skip existing BOMs above.
        // If `bomsFromFile.has(mainProductCode)` was false, and then we checked `existingBomsStore`, and it was true,
        // then `bomsFromFile.set` would not have happened for that `mainProductCode`.
        // The current logic is: if not in map, check store. If in store, error. If not in store, add to map.
        // So, if `bomEntry` exists, it means it wasn't in the store when first encountered in the file.

        if (bomEntry.components.some(c => c.productId === componentProduct.id)) {
           errorMessages.push(`Satır ${rowIndex}: '${mainProductCode}' reçetesi için '${componentProductCode}' bileşeni dosyada birden fazla kez tanımlanmış. Yalnızca ilk tanım dikkate alınacak.`);
           // Not necessarily an error that stops processing, but good to inform.
           // Let's count it as an error to be strict for now.
           errorCount++;
           continue; // Skip adding duplicate component
        }
        bomEntry.components.push({ productId: componentProduct.id, quantity });
      }
      
      // Step 3: Validate and add BOMs from the collected data
      for (const [mainCode, bomData] of bomsFromFile.entries()) {
          // Check again if a BOM for this product already exists in the store, in case it was added between file parsing and this step (unlikely for client-side)
          // or if the initial check logic needs reinforcement.
          if (existingBomsStore.some(b => b.productId === bomData.productId)) {
              if (!errorMessages.some(msg => msg.includes(`sistemde zaten bir ürün reçetesi mevcut`) && msg.includes(mainCode))) {
                errorMessages.push(`'${mainCode}' (${bomData.mainProductObject.name}) için sistemde zaten bir ürün reçetesi mevcut olduğundan dosyadan aktarılmadı.`);
              }
              errorCount++; // Count as error as we are not importing it
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


  const columns = React.useMemo(() => getBomColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [products, handleEdit, handleDeleteConfirm]);

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
        templateFileName="Urun_Recetesi_Tekli_Sablon.xlsx"
      />
    </div>
  );
}

    