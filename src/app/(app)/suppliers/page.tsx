
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SupplierForm } from "./components/SupplierForm";
import { getSupplierColumns } from "./components/SupplierColumns";
import { useStore } from "@/lib/store";
import type { Supplier } from "@/types";
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
import { downloadExcelTemplate, parseExcelFile } from "@/lib/excelUtils";
import * as z from "zod";

export default function SuppliersPage() {
  const { suppliers, deleteSupplier, addSupplier } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | undefined>(undefined);
  const [supplierToDelete, setSupplierToDelete] = React.useState<string | null>(null);
  const { toast } = useToast();
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = (supplierId: string) => {
    setSupplierToDelete(supplierId);
  };

  const handleDelete = () => {
    if (supplierToDelete) {
      try {
        deleteSupplier(supplierToDelete);
        toast({ title: "Tedarikçi Silindi", description: "Tedarikçi başarıyla silindi." });
      } catch (error: any) {
        toast({ title: "Silme Hatası", description: error.message, variant: "destructive" });
      }
      setSupplierToDelete(null);
    }
  };

  const generateSupplierTemplate = () => {
    const headers = ["Tedarikçi Adı*", "Yetkili Kişi", "E-posta", "Telefon", "Adres", "Notlar"];
    const exampleRow = ["ABC Tedarik A.Ş.", "Ahmet Yılmaz", "ahmet@abctedarik.com", "05xxxxxxxxx", "Örnek Mah. Örnek Sok. No:1", "Güvenilir tedarikçi"];
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Tedarikçi Adı' benzersiz olmalıdır."],
    ];
    downloadExcelTemplate([{ sheetName: "Tedarikciler", data: [headers, exampleRow, [], ...notes] }], "Tedarikci_Sablonu");
  };

  const handleSupplierImport = async (file: File) => {
    try {
      const parsedData = await parseExcelFile(file);
      const sheetData = parsedData["Tedarikciler"];

      if (!sheetData) {
        toast({ title: "İçe Aktarma Hatası", description: "Excel dosyasında 'Tedarikciler' sayfası bulunamadı.", variant: "destructive" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];
      
      const supplierImportSchema = z.object({
        "Tedarikçi Adı*": z.string().min(1, "Tedarikçi adı zorunludur."),
        "Yetkili Kişi": z.string().optional().nullable(),
        "E-posta": z.string().email("Geçersiz e-posta formatı.").optional().nullable().or(z.literal("")),
        "Telefon": z.string().optional().nullable(),
        "Adres": z.string().optional().nullable(),
        "Notlar": z.string().optional().nullable(),
      });

      for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
        const rowIndex = i + 2; 

        const validation = supplierImportSchema.safeParse(row);
        if (!validation.success) {
          errorMessages.push(`Satır ${rowIndex}: ${validation.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(', ')}`);
          errorCount++;
          continue;
        }
        
        const data = validation.data;
        const newSupplierData: Omit<Supplier, 'id'> = {
            name: data["Tedarikçi Adı*"],
            contactPerson: data["Yetkili Kişi"] || undefined,
            email: data["E-posta"] || undefined,
            phone: data["Telefon"] || undefined,
            address: data["Adres"] || undefined,
            notes: data["Notlar"] || undefined,
        };

        try {
          addSupplier(newSupplierData as Supplier); // addSupplier now expects Supplier type, will add ID inside
          successCount++;
        } catch (e: any) {
          errorMessages.push(`Satır ${rowIndex} ('${data["Tedarikçi Adı*"]}'): ${e.message}`);
          errorCount++;
        }
      }

      let description = `${successCount} tedarikçi başarıyla içe aktarıldı.`;
      if (errorCount > 0) {
        description += ` ${errorCount} tedarikçide hata oluştu veya atlandı.`;
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


  const columns = React.useMemo(() => getSupplierColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [handleEdit, handleDeleteConfirm]);

  if (!isMounted) {
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <h1 className="text-3xl font-bold">Tedarikçiler</h1>
        <div className="flex gap-2">
           <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" /> Excel'den İçe Aktar
          </Button>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
              setIsFormOpen(isOpen);
              if (!isOpen) setEditingSupplier(undefined);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Tedarikçi Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <SupplierForm
                supplier={editingSupplier}
                onSuccess={() => {
                  setIsFormOpen(false);
                  setEditingSupplier(undefined);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <DataTable columns={columns} data={suppliers} />

       {supplierToDelete && (
        <AlertDialog open={!!supplierToDelete} onOpenChange={() => setSupplierToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tedarikçiyi Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu işlem geri alınamaz. Bu tedarikçi veritabanından kalıcı olarak silinecektir. Tedarikçiye bağlı satınalma siparişleri varsa silme işlemi engellenecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>İptal Et</AlertDialogCancel>
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
        entityName="Tedarikçiler"
        templateGenerator={generateSupplierTemplate}
        onImport={handleSupplierImport}
        templateFileName="Tedarikci_Sablonu.xlsx"
      />
    </div>
  );
}
