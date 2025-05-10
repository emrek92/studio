"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductForm } from "./components/ProductForm";
import { getProductColumns } from "./components/ProductColumns";
import { useStore } from "@/lib/store";
import type { Product, ProductType } from "@/types";
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
import { productFormSchema } from "./components/ProductForm"; // Assuming schema is exported
import * as z from "zod";

// Re-define or import productTypes from ProductForm, ensuring it's accessible
const productTypesArray: { value: ProductType; label: string }[] = [
  { value: "hammadde", label: "Hammadde" },
  { value: "yari_mamul", label: "Yarı Mamul" },
  { value: "mamul", label: "Mamul" },
  { value: "yardimci_malzeme", label: "Yardımcı Malzeme" },
];
const validProductTypes = productTypesArray.map(pt => pt.value);


export default function ProductsPage() {
  const { products, deleteProduct, addProduct } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | undefined>(undefined);
  const [productToDelete, setProductToDelete] = React.useState<string | null>(null);
  const { toast } = useToast();
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = (productId: string) => {
    setProductToDelete(productId);
  };

  const handleDelete = () => {
    if (productToDelete) {
      const isUsedInBom = useStore.getState().boms.some(bom => bom.productId === productToDelete || bom.components.some(c => c.productId === productToDelete));
      if (isUsedInBom) {
        toast({
          title: "Silme Hatası",
          description: "Bu ürün bir veya daha fazla Ürün Reçetesinde (BOM) kullanılmaktadır. Lütfen önce Ürün Reçetelerinden kaldırın.",
          variant: "destructive",
        });
        setProductToDelete(null);
        return;
      }
      
      deleteProduct(productToDelete);
      toast({ title: "Ürün Silindi", description: "Ürün başarıyla silindi." });
      setProductToDelete(null);
    }
  };

  const generateProductTemplate = () => {
    const headers = ["Ürün Adı*", "Türü (hammadde, yari_mamul, mamul, yardimci_malzeme)*", "Ölçü Birimi*", "Başlangıç Stok Miktarı", "Açıklama"];
    const exampleRow = ["Örnek Kırmızı Boya", "hammadde", "kg", 100, "Kaliteli kırmızı boya"];
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- Tür alanı şu değerlerden biri olmalıdır: hammadde, yari_mamul, mamul, yardimci_malzeme"],
        ["- Başlangıç Stok Miktarı sayı olmalıdır, boş bırakılırsa 0 kabul edilir."],
    ];
    downloadExcelTemplate([{ sheetName: "Urunler", data: [headers, exampleRow, [], ...notes] }], "Urun_Sablonu");
  };

  const handleProductImport = async (file: File) => {
    try {
      const parsedData = await parseExcelFile(file);
      const productSheet = parsedData["Urunler"];

      if (!productSheet) {
        toast({ title: "İçe Aktarma Hatası", description: "Excel dosyasında 'Urunler' sayfası bulunamadı.", variant: "destructive" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];
      const existingProductNames = new Set(products.map(p => p.name.toLowerCase().trim()));

      // Schema for import validation (stock can be string then coerced)
      const importProductSchema = z.object({
        "Ürün Adı*": z.string().min(2, "Ürün adı en az 2 karakter olmalıdır."),
        "Türü (hammadde, yari_mamul, mamul, yardimci_malzeme)*": z.enum(validProductTypes as [ProductType, ...ProductType[]], { errorMap: () => ({ message: "Geçersiz ürün türü."}) }),
        "Ölçü Birimi*": z.string().min(1, "Ölçü birimi girilmelidir."),
        "Başlangıç Stok Miktarı": z.preprocess(val => (val === null || val === undefined || String(val).trim() === '') ? 0 : Number(val), z.number().min(0, "Stok miktarı negatif olamaz.").default(0)),
        "Açıklama": z.string().optional().nullable(),
      });


      for (const row of productSheet) {
        const validationResult = importProductSchema.safeParse(row);
        if (validationResult.success) {
          const data = validationResult.data;
          const productName = data["Ürün Adı*"].toLowerCase().trim();
          if (existingProductNames.has(productName)) {
            errorMessages.push(`'${data["Ürün Adı*"]}' adlı ürün zaten mevcut.`);
            errorCount++;
            continue;
          }

          const newProduct: Product = {
            id: crypto.randomUUID(),
            name: data["Ürün Adı*"].trim(),
            type: data["Türü (hammadde, yari_mamul, mamul, yardimci_malzeme)*"],
            unit: data["Ölçü Birimi*"],
            stock: data["Başlangıç Stok Miktarı"],
            description: data["Açıklama"] || "",
          };
          addProduct(newProduct);
          existingProductNames.add(productName); // Add to set to prevent duplicates within the same file
          successCount++;
        } else {
          errorCount++;
          const errors = validationResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
          errorMessages.push(`Satır ${productSheet.indexOf(row) + 2}: ${row["Ürün Adı*"] || 'Bilinmeyen Ürün'} - ${errors}`);
        }
      }

      let description = `${successCount} ürün başarıyla içe aktarıldı.`;
      if (errorCount > 0) {
        description += ` ${errorCount} üründe hata oluştu.`;
        console.error("İçe aktarma hataları:", errorMessages);
      }
      toast({ title: "İçe Aktarma Tamamlandı", description });
      if(successCount > 0) setIsImportModalOpen(false);


    } catch (error: any) {
      toast({ title: "İçe Aktarma Hatası", description: error.message || "Dosya işlenirken bir hata oluştu.", variant: "destructive" });
    }
  };


  const columns = React.useMemo(() => getProductColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [handleEdit, handleDeleteConfirm]);

  if (!isMounted) {
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <h1 className="text-3xl font-bold">Ürünler</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" /> Excel'den İçe Aktar
          </Button>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
              setIsFormOpen(isOpen);
              if (!isOpen) setEditingProduct(undefined);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Ürün Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <ProductForm
                product={editingProduct}
                onSuccess={() => {
                  setIsFormOpen(false);
                  setEditingProduct(undefined);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <DataTable columns={columns} data={products} />

      {productToDelete && (
        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ürünü Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu işlem geri alınamaz. Bu ürün veritabanından kalıcı olarak silinecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProductToDelete(null)}>İptal Et</AlertDialogCancel>
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
        entityName="Ürünler"
        templateGenerator={generateProductTemplate}
        onImport={handleProductImport}
      />
    </div>
  );
}
