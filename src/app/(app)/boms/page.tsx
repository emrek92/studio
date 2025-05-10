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
    const bomHeaders = ["Ana Ürün Kodu (Mamul)*", "Ana Ürün Adı (Mamul) - Bilgilendirme"];
    const bomExample = ["MAM-001", "Örnek Mamul A"];
    const bomNotes = [
        ["Notlar (Ürün Reçeteleri Sayfası):"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Ana Ürün Kodu (Mamul)' sistemde kayıtlı bir 'mamul' türünde ürünün kodu olmalıdır."],
        ["- 'Ana Ürün Adı' sadece bilgilendirme amaçlıdır, içe aktarımda dikkate alınmaz."],
        ["- Her satır yeni bir ürün reçetesi tanımlar."]
    ];

    const componentHeaders = ["Ana Ürün Kodu (Reçete Sahibi)*", "Bileşen Ürün Kodu*", "Bileşen Ürün Adı - Bilgilendirme", "Miktar*"];
    const componentExample = ["MAM-001", "HAM-001", "Örnek Hammadde X", 2.5];
    const componentNotes = [
        ["Notlar (Reçete Bileşenleri Sayfası):"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Ana Ürün Kodu (Reçete Sahibi)' Ürün Reçeteleri sayfasında tanımlanmış bir ana ürünün kodu olmalıdır."],
        ["- 'Bileşen Ürün Kodu' sistemde kayıtlı bir 'hammadde' veya 'yari_mamul' türünde ürünün kodu olmalıdır."],
        ["- 'Bileşen Ürün Adı' sadece bilgilendirme amaçlıdır, içe aktarımda dikkate alınmaz."],
        ["- 'Miktar' pozitif bir sayı olmalıdır."]
    ];

    downloadExcelTemplate([
      { sheetName: "UrunReceteleri", data: [bomHeaders, bomExample, [], ...bomNotes] },
      { sheetName: "ReceteBilesenleri", data: [componentHeaders, componentExample, [], ...componentNotes] }
    ], "Urun_Recetesi_Sablonu");
  };

  const handleBomImport = async (file: File) => {
    try {
      const parsedData = await parseExcelFile(file);
      const bomsSheet = parsedData["UrunReceteleri"];
      const componentsSheet = parsedData["ReceteBilesenleri"];

      if (!bomsSheet || !componentsSheet) {
        toast({ title: "İçe Aktarma Hatası", description: "Excel dosyasında 'UrunReceteleri' veya 'ReceteBilesenleri' sayfası bulunamadı.", variant: "destructive" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];
      const importedBoms: BOM[] = [];
      const allProducts = useStore.getState().products;
      const existingBoms = useStore.getState().boms;

      const bomSchema = z.object({ "Ana Ürün Kodu (Mamul)*": z.string().min(1) });
      const componentSchema = z.object({
        "Ana Ürün Kodu (Reçete Sahibi)*": z.string().min(1),
        "Bileşen Ürün Kodu*": z.string().min(1),
        "Miktar*": z.preprocess(val => Number(val), z.number().positive()),
      });

      // Step 1: Process BOMs sheet
      for (const row of bomsSheet) {
        const bomValidation = bomSchema.safeParse(row);
        if (!bomValidation.success) {
          errorMessages.push(`Reçeteler Satır ${bomsSheet.indexOf(row) + 2}: Geçersiz veri - ${bomValidation.error.errors.map(e => e.message).join(', ')}`);
          errorCount++;
          continue;
        }
        
        const mainProductCode = bomValidation.data["Ana Ürün Kodu (Mamul)*"];
        const mainProduct = findProductByCode(mainProductCode, allProducts);

        if (!mainProduct || mainProduct.type !== 'mamul') {
          errorMessages.push(`Reçeteler Satır ${bomsSheet.indexOf(row) + 2}: '${mainProductCode}' kodlu mamul ürün bulunamadı veya türü yanlış.`);
          errorCount++;
          continue;
        }

        if (existingBoms.some(b => b.productId === mainProduct.id) || importedBoms.some(b => b.productId === mainProduct.id)) {
            errorMessages.push(`Reçeteler Satır ${bomsSheet.indexOf(row) + 2}: '${mainProductCode}' (${mainProduct.name}) için zaten bir reçete mevcut veya dosyada tekrar ediyor.`);
            errorCount++;
            continue;
        }

        importedBoms.push({
          id: crypto.randomUUID(),
          productId: mainProduct.id,
          name: `${mainProduct.productCode} - ${mainProduct.name} Reçetesi`,
          components: [],
        });
      }

      // Step 2: Process Components sheet
      for (const row of componentsSheet) {
        const compValidation = componentSchema.safeParse(row);
        if (!compValidation.success) {
          errorMessages.push(`Bileşenler Satır ${componentsSheet.indexOf(row) + 2}: Geçersiz veri - ${compValidation.error.errors.map(e => e.message).join(', ')}`);
          errorCount++;
          continue;
        }

        const bomOwnerProductCode = compValidation.data["Ana Ürün Kodu (Reçete Sahibi)*"];
        const componentProductCode = compValidation.data["Bileşen Ürün Kodu*"];
        const quantity = compValidation.data["Miktar*"];

        const targetBom = importedBoms.find(b => getProductCodeById(b.productId)?.toLowerCase().trim() === bomOwnerProductCode.toLowerCase().trim());
        if (!targetBom) {
          errorMessages.push(`Bileşenler Satır ${componentsSheet.indexOf(row) + 2}: '${bomOwnerProductCode}' kodlu ana ürüne sahip reçete bulunamadı (önce UrunReceteleri sayfasında tanımlanmalı).`);
          errorCount++;
          continue;
        }
        
        const mainProductOfTargetBom = findProductByCode(bomOwnerProductCode, allProducts); // for error message

        const componentProduct = findProductByCode(componentProductCode, allProducts);
        if (!componentProduct || (componentProduct.type !== 'hammadde' && componentProduct.type !== 'yari_mamul')) {
          errorMessages.push(`Bileşenler Satır ${componentsSheet.indexOf(row) + 2}: '${componentProductCode}' kodlu hammadde/yarı mamul ürün bulunamadı veya türü yanlış.`);
          errorCount++;
          continue;
        }
        
        if (targetBom.productId === componentProduct.id) {
            errorMessages.push(`Bileşenler Satır ${componentsSheet.indexOf(row) + 2}: Ana ürün ('${bomOwnerProductCode}' - ${mainProductOfTargetBom?.name}) kendi reçetesinde bileşen olarak kullanılamaz.`);
            errorCount++;
            continue;
        }

        targetBom.components.push({ productId: componentProduct.id, quantity });
      }
      
      // Step 3: Validate and add BOMs
      for(const bomToAdd of importedBoms) {
          if (bomToAdd.components.length === 0) {
              const bomProduct = findProductByCode(getProductCodeById(bomToAdd.productId) || "", allProducts);
              errorMessages.push(`'${bomToAdd.productId}' (${bomProduct?.name}) kodlu reçete için hiç bileşen tanımlanmamış.`);
              errorCount++;
              continue;
          }
          addBom(bomToAdd);
          successCount++;
      }

      let description = `${successCount} Ürün Reçetesi (BOM) başarıyla içe aktarıldı.`;
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
        templateFileName="Urun_Recetesi_Sablonu.xlsx"
      />
    </div>
  );
}
