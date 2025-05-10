"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RawMaterialEntryForm } from "./components/RawMaterialEntryForm";
import { rawMaterialEntryColumns } from "./components/RawMaterialEntryColumns";
import { useStore } from "@/lib/store";
import type { RawMaterialEntry, Product } from "@/types";
import { DataTable } from "@/components/DataTable";
import { PlusCircle, UploadCloud } from "lucide-react";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { downloadExcelTemplate, parseExcelFile, findProductIdByName } from "@/lib/excelUtils";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import { format } from "date-fns"; // For date formatting if needed, or rely on cellDates: true

export default function RawMaterialEntriesPage() {
  const { rawMaterialEntries, products, addRawMaterialEntry } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const columns = rawMaterialEntryColumns;

  const generateRawMaterialEntryTemplate = () => {
    const headers = ["Hammadde/Yardımcı Malzeme Adı*", "Miktar*", "Tarih (GG.AA.YYYY)*", "Tedarikçi", "Notlar"];
    const exampleRow = ["Örnek Hammadde X", 150, "01.01.2024", "ABC Tedarikçi", "İlk parti alımı"];
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Hammadde/Yardımcı Malzeme Adı' sistemde kayıtlı bir 'hammadde' veya 'yardimci_malzeme' türünde ürün olmalıdır."],
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
        "Hammadde/Yardımcı Malzeme Adı*": z.string().min(1, "Hammadde adı zorunludur."),
        "Miktar*": z.preprocess(val => Number(val), z.number().positive("Miktar pozitif olmalıdır.")),
        "Tarih (GG.AA.YYYY)*": z.date({ errorMap: () => ({ message: "Geçerli bir tarih girilmelidir."}) }),
        "Tedarikçi": z.string().optional().nullable(),
        "Notlar": z.string().optional().nullable(),
      });

      for (const row of sheet) {
        const validationResult = importSchema.safeParse(row);
        if (validationResult.success) {
          const data = validationResult.data;
          const productName = data["Hammadde/Yardımcı Malzeme Adı*"];
          const product = allProducts.find(p => p.name.toLowerCase().trim() === productName.toLowerCase().trim() && (p.type === 'hammadde' || p.type === 'yardimci_malzeme'));

          if (!product) {
            errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${productName}' adlı hammadde/yardımcı malzeme bulunamadı veya türü yanlış.`);
            errorCount++;
            continue;
          }

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
        } else {
          errorCount++;
          const errors = validationResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
           errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: ${row["Hammadde/Yardımcı Malzeme Adı*"] || 'Bilinmeyen Kayıt'} - ${errors}`);
        }
      }

      let description = `${successCount} hammadde girişi başarıyla içe aktarıldı.`;
      if (errorCount > 0) {
        description += ` ${errorCount} girişte hata oluştu.`;
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
        <h1 className="text-3xl font-bold">Hammadde Girişleri</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" /> Excel'den İçe Aktar
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Giriş Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <RawMaterialEntryForm
                onSuccess={() => {
                  setIsFormOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <DataTable columns={columns} data={rawMaterialEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())} />
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
