
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
import { useStore, getSupplierNameById, getPurchaseOrderReferenceById } from "@/lib/store";
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
import { format, isValid, parse } from "date-fns"; // For date parsing in import

export default function RawMaterialEntriesPage() {
  const { rawMaterialEntries, products, suppliers, purchaseOrders, addRawMaterialEntry, deleteRawMaterialEntry } = useStore();
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
  
  const columns = React.useMemo(() => getRawMaterialEntryColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [handleEdit, handleDeleteConfirm, suppliers, purchaseOrders]);


  const generateRawMaterialEntryTemplate = () => {
    const headers = ["Hammadde/Yardımcı Malzeme Kodu*", "Miktar*", "Tarih (GG.AA.YYYY)*", "Tedarikçi Adı (Opsiyonel)", "Satınalma Sipariş ID (Opsiyonel)", "Notlar"];
    const exampleProduct = products.find(p => p.type === 'hammadde' || p.type === 'yardimci_malzeme');
    const exampleProductCode = exampleProduct ? exampleProduct.productCode : "HAM-001";
    const exampleSupplierName = suppliers.length > 0 ? suppliers[0].name : "ABC Tedarik";
    const examplePO = purchaseOrders.find(po => po.supplierId === (suppliers.length > 0 ? suppliers[0].id : "") && (po.status === 'open' || po.status === 'partially_received'));
    const examplePOId = examplePO ? examplePO.id : "PO_ID_ORNEK";


    const exampleRow = [exampleProductCode, 150, "01.01.2024", exampleSupplierName, examplePOId, "İlk parti alımı"];
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Hammadde/Yardımcı Malzeme Kodu' sistemde kayıtlı bir 'hammadde' veya 'yardimci_malzeme' türünde ürünün kodu olmalıdır."],
        ["- 'Tedarikçi Adı' sistemde kayıtlı bir tedarikçi adı olmalıdır (eğer girilirse)."],
        ["- 'Satınalma Sipariş ID' sistemde kayıtlı ve ilgili tedarikçiye ait bir satınalma siparişinin ID'si olmalıdır (eğer girilirse)."],
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
      const allSuppliers = useStore.getState().suppliers;
      const allPurchaseOrders = useStore.getState().purchaseOrders;

      const importSchema = z.object({
        "Hammadde/Yardımcı Malzeme Kodu*": z.string().min(1, "Hammadde ürün kodu zorunludur."),
        "Miktar*": z.preprocess(val => Number(val), z.number({invalid_type_error: "Miktar sayı olmalıdır."}).positive("Miktar pozitif olmalıdır.")),
        "Tarih (GG.AA.YYYY)*": z.preprocess(val => {
          if (val instanceof Date && isValid(val)) return val;
          if (typeof val === 'string') {
            const parsedDate = parse(val, "dd.MM.yyyy", new Date());
            if (isValid(parsedDate)) return parsedDate;
            const parsedDateAlt = parse(val, "d.M.yyyy", new Date());
            if (isValid(parsedDateAlt)) return parsedDateAlt;
          }
          if (typeof val === 'number') { 
             const excelEpochDiff = val > 60 ? 25567 : 25569;
             const date = new Date((val - excelEpochDiff) * 24 * 60 * 60 * 1000);
             if (isValid(date)) return date;
          }
          return undefined; 
        }, z.date({ errorMap: () => ({ message: "Geçerli bir tarih girilmelidir (örn: 01.12.2023 veya Excel tarih formatı)."}) })),
        "Tedarikçi Adı (Opsiyonel)": z.string().optional().nullable(),
        "Satınalma Sipariş ID (Opsiyonel)": z.string().optional().nullable(),
        "Notlar": z.string().optional().nullable(),
      });

      for (const row of sheet) {
        const rowIndex = sheet.indexOf(row) + 2;
        const validationResult = importSchema.safeParse(row);
        if (validationResult.success) {
          const data = validationResult.data;
          const productCode = data["Hammadde/Yardımcı Malzeme Kodu*"];
          const product = findProductByCode(productCode, allProducts);

          if (!product || (product.type !== 'hammadde' && product.type !== 'yardimci_malzeme')) {
            errorMessages.push(`Satır ${rowIndex}: '${productCode}' kodlu hammadde/yardımcı malzeme bulunamadı veya türü yanlış.`);
            errorCount++;
            continue;
          }

          let supplierId: string | undefined = undefined;
          if (data["Tedarikçi Adı (Opsiyonel)"]) {
            const supplier = allSuppliers.find(s => s.name.toLowerCase() === data["Tedarikçi Adı (Opsiyonel)"]!.toLowerCase());
            if (!supplier) {
                errorMessages.push(`Satır ${rowIndex}: '${data["Tedarikçi Adı (Opsiyonel)"]}' adlı tedarikçi bulunamadı.`);
                errorCount++;
                continue;
            }
            supplierId = supplier.id;
          }

          let purchaseOrderId: string | undefined = undefined;
          if (data["Satınalma Sipariş ID (Opsiyonel)"]) {
            const po = allPurchaseOrders.find(p => p.id === data["Satınalma Sipariş ID (Opsiyonel)"]! || p.orderReference === data["Satınalma Sipariş ID (Opsiyonel)"]!);
            if (!po) {
                errorMessages.push(`Satır ${rowIndex}: '${data["Satınalma Sipariş ID (Opsiyonel)"]}' ID/referanslı satınalma siparişi bulunamadı.`);
                errorCount++;
                continue;
            }
            if (supplierId && po.supplierId !== supplierId) {
                 errorMessages.push(`Satır ${rowIndex}: Satınalma siparişi ('${data["Satınalma Sipariş ID (Opsiyonel)"]}') belirtilen tedarikçiye ('${data["Tedarikçi Adı (Opsiyonel)"]}') ait değil.`);
                 errorCount++;
                 continue;
            }
            if (!po.items.some(item => item.productId === product.id)) {
                errorMessages.push(`Satır ${rowIndex}: Satınalma siparişi ('${data["Satınalma Sipariş ID (Opsiyonel)"]}') '${product.productCode}' ürününü içermiyor.`);
                errorCount++;
                continue;
            }
            purchaseOrderId = po.id;
          }


          try {
            const newEntry: Omit<RawMaterialEntry, 'id'> = {
              productId: product.id,
              quantity: data["Miktar*"],
              date: data["Tarih (GG.AA.YYYY)*"].toISOString(),
              supplierId: supplierId,
              purchaseOrderId: purchaseOrderId,
              notes: data["Notlar"] || undefined,
            };
            addRawMaterialEntry(newEntry);
            successCount++;
          } catch (e:any) {
             errorMessages.push(`Satır ${rowIndex}: '${productCode}' için giriş eklenirken hata: ${e.message}`);
             errorCount++;
          }
        } else {
          errorCount++;
          const errors = validationResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
           errorMessages.push(`Satır ${rowIndex}: ${row["Hammadde/Yardımcı Malzeme Kodu*"] || 'Bilinmeyen Kayıt'} - ${errors}`);
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
            <DialogContent className="sm:max-w-lg"> {/* Wider for more fields */}
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
                Bu işlem geri alınamaz. Bu hammadde girişi silinecek ve stok miktarı güncellenecektir. Varsa, bağlı satınalma siparişindeki teslim alınan miktar da düşürülecektir.
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
