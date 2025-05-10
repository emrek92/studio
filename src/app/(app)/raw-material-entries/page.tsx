
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RawMaterialEntryForm } from "./components/RawMaterialEntryForm";
import { getRawMaterialEntryColumns } from "./components/RawMaterialEntryColumns";
import { useStore } from "@/lib/store";
import type { RawMaterialEntry, Product } from "@/types";
import { DataTable } from "@/components/DataTable";
import { PlusCircle, UploadCloud } from "lucide-react";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { downloadExcelTemplate, parseExcelFile, findProductByCode } from "@/lib/excelUtils";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
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

export default function RawMaterialEntriesPage() {
  const { rawMaterialEntries, products, addRawMaterialEntry, deleteRawMaterialEntry } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<RawMaterialEntry | undefined>(undefined);
  const [entryToDelete, setEntryToDelete] = React.useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEdit = (entry: RawMaterialEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = (entryId: string) => {
    setEntryToDelete(entryId);
  };

  const handleDelete = () => {
    if (entryToDelete) {
      try {
        deleteRawMaterialEntry(entryToDelete);
        toast({ title: "Hammadde Girişi Silindi", description: "Giriş başarıyla silindi." });
      } catch (error: any) {
         toast({ title: "Silme Hatası", description: error.message || "Giriş silinirken bir hata oluştu.", variant: "destructive" });
      }
      setEntryToDelete(null);
    }
  };
  
  const columns = React.useMemo(() => getRawMaterialEntryColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [handleEdit, handleDeleteConfirm]);


  const generateRawMaterialEntryTemplate = () => {
    const headers = ["Hammadde/Yardımcı Malzeme Kodu*", "Hammadde/Yardımcı Malzeme Adı - Bilgilendirme", "Miktar*", "Tarih (GG.AA.YYYY)*", "Tedarikçi", "Notlar"];
    const exampleRow = ["HAM-001", "Örnek Hammadde X", 150, "01.01.2024", "ABC Tedarikçi", "İlk parti alımı"];
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Hammadde/Yardımcı Malzeme Kodu' sistemde kayıtlı bir 'hammadde' veya 'yardimci_malzeme' türünde ürünün kodu olmalıdır."],
        ["- 'Hammadde/Yardımcı Malzeme Adı' sadece bilgilendirme amaçlıdır, içe aktarımda dikkate alınmaz."],
        ["- 'Miktar' pozitif bir sayı olmalıdır."],
        ["- 'Tarih' GG.AA.YYYY formatında veya Excel'in tarih formatında olmalıdır."],
    ];
    downloadExcelTemplate([{ sheetName: "HammaddeGirisleri", data: [headers, exampleRow, [], ...notes] }], "Hammadde_Giris_Sablonu");
  };

  const handleRawMaterialEntryImport = async (file: File) => {
    try {
      const parsedData = await parseExcelFile(file);
      const sheet = parsedData["HammaddeGirisleri"];

      if (!sheet) {
        toast({ title: "İçe Aktarma Hatası", description: "Excel dosyasında 'HammaddeGirisleri' sayfası bulunamadı.", variant: "destructive" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];
      const allProducts = useStore.getState().products;

      const importSchema = z.object({
        "Hammadde/Yardımcı Malzeme Kodu*": z.string().min(1, "Hammadde ürün kodu zorunludur."),
        "Miktar*": z.preprocess(val => Number(val), z.number({invalid_type_error: "Miktar sayı olmalıdır."}).positive("Miktar pozitif olmalıdır.")),
        "Tarih (GG.AA.YYYY)*": z.date({ errorMap: () => ({ message: "Geçerli bir tarih girilmelidir."}) }),
        "Tedarikçi": z.string().optional().nullable(),
        "Notlar": z.string().optional().nullable(),
      });

      for (const row of sheet) {
        const validationResult = importSchema.safeParse(row);
        if (validationResult.success) {
          const data = validationResult.data;
          const productCode = data["Hammadde/Yardımcı Malzeme Kodu*"];
          const product = findProductByCode(productCode, allProducts);

          if (!product || (product.type !== 'hammadde' && product.type !== 'yardimci_malzeme')) {
            errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${productCode}' kodlu hammadde/yardımcı malzeme bulunamadı veya türü yanlış.`);
            errorCount++;
            continue;
          }
          try {
            const newEntry: RawMaterialEntry = {
              id: crypto.randomUUID(),
              productId: product.id,
              quantity: data["Miktar*"],
              date: data["Tarih (GG.AA.YYYY)*"].toISOString(),
              supplier: data["Tedarikçi"] || undefined,
              notes: data["Notlar"] || undefined,
            };
            addRawMaterialEntry(newEntry);
            successCount++;
          } catch (e:any) {
             errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${productCode}' için giriş eklenirken hata: ${e.message}`);
             errorCount++;
          }
        } else {
          errorCount++;
          const errors = validationResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
           errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: ${row["Hammadde/Yardımcı Malzeme Kodu*"] || 'Bilinmeyen Kayıt'} - ${errors}`);
        }
      }

      let description = `${successCount} hammadde girişi başarıyla içe aktarıldı.`;
      if (errorCount > 0) {
        description += ` ${errorCount} girişte hata oluştu veya atlandı.`;
        console.error("İçe aktarma hataları:", errorMessages.join("\n"));
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

  if (!isMounted) {
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <h1 className="text-3xl font-bold">Hammadde Girişleri</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" /> Excel'den İçe Aktar
          </Button>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
              setIsFormOpen(isOpen);
              if (!isOpen) setEditingEntry(undefined);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Giriş Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <RawMaterialEntryForm
                entry={editingEntry}
                onSuccess={() => {
                  setIsFormOpen(false);
                  setEditingEntry(undefined);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <DataTable columns={columns} data={rawMaterialEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())} />
      
      {entryToDelete && (
        <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hammadde Girişini Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu işlem geri alınamaz. Bu hammadde girişi silinecek ve stok miktarı güncellenecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEntryToDelete(null)}>İptal Et</AlertDialogCancel>
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
        entityName="Hammadde Girişleri"
        templateGenerator={generateRawMaterialEntryTemplate}
        onImport={handleRawMaterialEntryImport}
        templateFileName="Hammadde_Giris_Sablonu.xlsx"
      />
    </div>
  );
}
