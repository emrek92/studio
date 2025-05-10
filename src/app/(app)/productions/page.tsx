
"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductionLogForm } from "./components/ProductionLogForm";
import { getProductionLogColumns } from "./components/ProductionLogColumns";
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


export default function ProductionLogsPage() {
  const { productionLogs, products, boms, addProductionLog, updateProductionLog, deleteProductionLog } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingLog, setEditingLog] = React.useState<ProductionLog | undefined>(undefined);
  const [logToDelete, setLogToDelete] = React.useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [showAll, setShowAll] = React.useState(true); // State to show all data initially

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEdit = (log: ProductionLog) => {
    setEditingLog(log);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = (logId: string) => {
    setLogToDelete(logId);
  };

  const handleDelete = () => {
    if (logToDelete) {
      try {
        deleteProductionLog(logToDelete);
        toast({ title: "Üretim Kaydı Silindi", description: "Üretim kaydı başarıyla silindi." });
      } catch (error: any) {
        toast({ title: "Silme Hatası", description: error.message || "Kayıt silinirken bir hata oluştu.", variant: "destructive" });
      }
      setLogToDelete(null);
    }
  };

  const columns = React.useMemo(() => getProductionLogColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [products, boms, handleEdit, handleDeleteConfirm]);


  const logsToDisplay = React.useMemo(() => {
    if (showAll) {
      return [...productionLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    let filtered = [...productionLogs]; 

    if (dateRange?.from) {
      const rangeStart = new Date(dateRange.from);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
      rangeEnd.setHours(23, 59, 59, 999);

      filtered = filtered.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= rangeStart && logDate <= rangeEnd;
      });
    } else {
        // If no date range is selected and not showing all, show no data.
        return [];
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [productionLogs, dateRange, showAll]);


  const generateProductionLogTemplate = () => {
    const headers = ["Üretilen Ürün Kodu (Mamul/Yarı Mamul)*", "Kullanılan Reçetenin Ana Ürün Kodu*", "Üretim Miktarı*", "Tarih (GG.AA.YYYY)*", "Notlar"];
    const exampleRow = ["MAM-001", "MAM-001", 50, "02.01.2024", "Günlük üretim"];
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Üretilen Ürün Kodu' sistemde kayıtlı bir 'mamul' veya 'yari_mamul' türünde ürünün kodu olmalıdır."],
        ["- 'Kullanılan Reçetenin Ana Ürün Kodu', üretilen ürünün kendisine ait ve sistemde kayıtlı bir ürün reçetesinin ana ürün kodu olmalıdır (Genellikle üretilen ürün kodu ile aynıdır)."],
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
        "Üretilen Ürün Kodu (Mamul/Yarı Mamul)*": z.preprocess(
          val => (typeof val === 'number' ? String(val) : val),
          z.string().min(1, "Üretilen ürün kodu zorunludur.")
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
            const parsedDateAlt = parse(val, "d.M.yyyy", new Date());
            if (isValid(parsedDateAlt)) return parsedDateAlt;
          }
          if (typeof val === 'number') { 
             const excelEpochDiff = val > 60 ? 25567 : 25569;
             const date = new Date((val - excelEpochDiff) * 24 * 60 * 60 * 1000);
             if (isValid(date)) return date;
          }
          return undefined; 
        }, z.date({ errorMap: (issue, ctx) => ({ message: "Geçerli bir tarih girilmelidir (örn: 01.12.2023 veya Excel tarih formatı)."}) })),
        "Notlar": z.string().optional().nullable(),
      });
      
      for (const row of sheet) {
        const nonEmptyCellCount = Object.values(row).filter(v => v !== null && v !== undefined && String(v).trim() !== '').length;
        if (nonEmptyCellCount < 3 && sheet.indexOf(row) > 0) { 
            continue;
        }

        const validationResult = importSchema.safeParse(row);
        if (validationResult.success) {
          const data = validationResult.data;
          
          const producedProductCode = data["Üretilen Ürün Kodu (Mamul/Yarı Mamul)*"];
          const producedProduct = findProductByCode(producedProductCode, allProducts);
          if (!producedProduct || (producedProduct.type !== 'mamul' && producedProduct.type !== 'yari_mamul')) {
            errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${producedProductCode}' kodlu mamul/yarı mamul ürün bulunamadı veya türü yanlış.`);
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
          
          try {
            const newLog: ProductionLog = {
              id: crypto.randomUUID(),
              productId: producedProduct.id,
              bomId: bom.id,
              quantity: data["Üretim Miktarı*"],
              date: data["Tarih (GG.AA.YYYY)*"].toISOString(),
              notes: data["Notlar"] || undefined,
            };
            addProductionLog(newLog);
            successCount++;
          } catch (e: any) {
            errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: '${producedProductCode}' (${producedProduct.name}) üretimi sırasında hata: ${e.message}`);
            errorCount++;
          }

        } else {
          errorCount++;
          const errors = validationResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
          errorMessages.push(`Satır ${sheet.indexOf(row) + 2}: ${row["Üretilen Ürün Kodu (Mamul/Yarı Mamul)*"] || 'Bilinmeyen Kayıt'} - ${errors}`);
        }
      }

      let toastDescription = `${successCount} üretim kaydı başarıyla içe aktarıldı.`;
      if (errorCount > 0) {
        toastDescription += ` ${errorCount} kayıtta hata oluştu.`;
        console.error("İçe aktarma hataları:", errorMessages.join("\n"));
        toast({
            title: errorCount > 0 && successCount > 0 ? "Kısmi İçe Aktarma Tamamlandı" : "İçe Aktarma Başarısız",
            description: `${toastDescription}\nDetaylar için konsolu kontrol edin.`,
            variant: errorCount > 0 && successCount === 0 ? "destructive" : "default",
            duration: 10000,
         });
      } else {
        toast({ title: "İçe Aktarma Tamamlandı", description: toastDescription });
      }
      if(successCount > 0) {
        setIsImportModalOpen(false);
        setShowAll(true); // Show all data after successful import
      }

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
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
              setIsFormOpen(isOpen);
              if (!isOpen) setEditingLog(undefined);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingLog(undefined)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Üretim Kaydı
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <ProductionLogForm
                log={editingLog}
                onSuccess={() => {
                  setIsFormOpen(false);
                  setEditingLog(undefined);
                  setShowAll(true); // Show all after successful add/edit
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 py-4 border-y">
        <Label htmlFor="date-range-filter" className="text-sm font-medium">Tarih Aralığına Göre Filtrele:</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date-range-filter"
              variant={"outline"}
              className={cn(
                "w-[280px] justify-start text-left font-normal", 
                !dateRange?.from && "text-muted-foreground",
                showAll && "border-dashed" 
              )}
              disabled={showAll}
              onClick={() => { if (showAll) setShowAll(false);}} // Auto-disable showAll when opening picker
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {showAll ? "Tüm kayıtlar gösteriliyor" :
                dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd MMM, yyyy", { locale: tr })} -{" "}
                    {format(dateRange.to, "dd MMM, yyyy", { locale: tr })}
                  </>
                ) : (
                  format(dateRange.from, "dd MMM, yyyy", { locale: tr })
                )
              ) : (
                <span>Tarih Aralığı Seçin</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => {
                  setDateRange(range);
                  if (range?.from) setShowAll(false); // if a date is selected, turn off showAll
              }}
              numberOfMonths={1} 
              locale={tr}
              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
            />
          </PopoverContent>
        </Popover>
        {(!showAll && dateRange?.from) && (
          <Button variant="ghost" size="sm" onClick={() => {setDateRange(undefined); setShowAll(true);}} className="text-muted-foreground hover:text-destructive">
            <XCircle className="mr-1 h-4 w-4" />
            Filtreyi Temizle
          </Button>
        )}
         <Button 
            variant={showAll ? "secondary" : "outline"} 
            size="sm" 
            onClick={() => {
                setShowAll(true);
                setDateRange(undefined);
            }}
            className="ml-auto"
        >
            Tümünü Göster
        </Button>
      </div>

      <DataTable columns={columns} data={logsToDisplay} />
      
      {logToDelete && (
        <AlertDialog open={!!logToDelete} onOpenChange={() => setLogToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Üretim Kaydını Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu işlem geri alınamaz. Bu üretim kaydı ve ilişkili stok hareketleri geri alınacaktır.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setLogToDelete(null)}>İptal Et</AlertDialogCancel>
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
        entityName="Üretim Kayıtları"
        templateGenerator={generateProductionLogTemplate}
        onImport={handleProductionLogImport}
        templateFileName="Uretim_Kayit_Sablonu.xlsx"
      />
    </div>
  );
}
