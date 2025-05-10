
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
import type { ProductionLog } from "@/types";
import { DataTable } from "@/components/DataTable";
import { PlusCircle, UploadCloud, CalendarIcon, XCircle } from "lucide-react";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { downloadExcelTemplate, parseExcelFile, findProductByCode, findBomIdByMainProductCode } from "@/lib/excelUtils";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isValid, parse } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";


export default function ProductionLogsPage() {
  const { productionLogs, products, boms, addProductionLog } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const columns = productionLogColumns;

  const logsToDisplay = React.useMemo(() => {
    if (!selectedDate) {
      return []; 
    }
    return productionLogs
      .filter(log => {
        const logDate = new Date(log.date);
        // Compare year, month, and day
        return logDate.getFullYear() === selectedDate.getFullYear() &&
               logDate.getMonth() === selectedDate.getMonth() &&
               logDate.getDate() === selectedDate.getDate();
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [productionLogs, selectedDate]);


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
        "Üretim Miktarı*": z.preprocess(val => {
            const num = Number(val);
            return isNaN(num) ? undefined : num;
        }, z.number({invalid_type_error: "Üretim miktarı sayı olmalıdır."}).positive("Miktar pozitif olmalıdır.")),
        "Tarih (GG.AA.YYYY)*": z.preprocess(val => {
          if (val instanceof Date && isValid(val)) return val;
          if (typeof val === 'string') {
            const parsedDate = parse(val, "dd.MM.yyyy", new Date());
            if (isValid(parsedDate)) return parsedDate;
          }
          if (typeof val === 'number') { // Excel date serial number
            const excelEpoch = new Date(1899, 11, 30); // Excel epoch starts Dec 30, 1899 for Windows
            const jsDate = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000);
            if (isValid(jsDate)) return jsDate;
          }
          return undefined; // Let Zod handle the error
        }, z.date({ errorMap: () => ({ message: "Geçerli bir tarih girilmelidir (GG.AA.YYYY)."}) })),
        "Notlar": z.string().optional().nullable(),
      });
      
      for (const row of sheet) {
        // Skip empty rows or rows that are likely headers/notes based on fewer expected values
        const nonEmptyCellCount = Object.values(row).filter(v => v !== null && v !== undefined && String(v).trim() !== '').length;
        if (nonEmptyCellCount === 0) continue; // Skip completely empty rows
        if (nonEmptyCellCount < 3 && sheet.indexOf(row) > 0) { // Heuristic for notes/instruction rows, skip if not the first potential header
            // Potentially a note row, we might log it or ignore it. For now, ignore.
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
            // This case should ideally be caught by the canProduce check or the store's internal logic
            const mainProductName = findProductByCode(producedProductCode, allProducts)?.name || producedProductCode;
            errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${mainProductName}' üretimi yapılamadı (muhtemelen stok yetersiz veya başka bir sorun).`);
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
            title: errorCount > 0 && successCount > 0 ? "Kısmi İçe Aktarma Tamamlandı" : "İçe Aktarma Başarısız",
            description: `${description}\nDetaylar için konsolu kontrol edin.`,
            variant: errorCount > 0 && successCount === 0 ? "destructive" : "default",
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

      <div className="flex items-center gap-2 mb-4 py-4 border-y">
        <Label htmlFor="date-filter" className="text-sm font-medium">Tarihe Göre Filtrele:</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date-filter"
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP", { locale: tr }) : <span>Tarih Seçin</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
              locale={tr}
            />
          </PopoverContent>
        </Popover>
        {selectedDate && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)} className="text-muted-foreground hover:text-destructive">
            <XCircle className="mr-1 h-4 w-4" />
            Filtreyi Temizle
          </Button>
        )}
      </div>

      <DataTable columns={columns} data={logsToDisplay} />
      
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

