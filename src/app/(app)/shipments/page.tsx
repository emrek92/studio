
"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShipmentLogForm } from "./components/ShipmentLogForm";
import { getShipmentLogColumns } from "./components/ShipmentLogColumns";
import { useStore, getCustomerOrderDisplayInfoById } from "@/lib/store";
import { findProductByCode, downloadExcelTemplate, parseExcelFile as parseExcelFileUtil } from "@/lib/excelUtils"; // Corrected import
import type { ShipmentLog } from "@/types";
import { DataTable } from "@/components/DataTable";
import { PlusCircle, UploadCloud, CalendarIcon, XCircle } from "lucide-react";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
// import { downloadExcelTemplate, parseExcelFile as parseExcelFileUtil } from "@/lib/excelUtils"; // Renamed to avoid conflict - ALREADY CORRECTED ABOVE
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


export default function ShipmentsPage() {
  const { shipmentLogs, products, customerOrders, addShipmentLog, deleteShipmentLog } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingLog, setEditingLog] = React.useState<ShipmentLog | undefined>(undefined);
  const [logToDelete, setLogToDelete] = React.useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEdit = (log: ShipmentLog) => {
    setEditingLog(log);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = (logId: string) => {
    setLogToDelete(logId);
  };

  const handleDelete = () => {
    if (logToDelete) {
      try {
        deleteShipmentLog(logToDelete);
        toast({ title: "Sevkiyat Kaydı Silindi", description: "Sevkiyat kaydı başarıyla silindi." });
      } catch (error: any) {
        toast({ title: "Silme Hatası", description: error.message || "Kayıt silinirken bir hata oluştu.", variant: "destructive" });
      }
      setLogToDelete(null);
    }
  };

  const columns = React.useMemo(() => getShipmentLogColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [handleEdit, handleDeleteConfirm]);


  const logsToDisplay = React.useMemo(() => {
    let filtered = [...shipmentLogs]; 

    if (dateRange?.from) {
      const rangeStart = new Date(dateRange.from);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
      rangeEnd.setHours(23, 59, 59, 999);

      filtered = filtered.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= rangeStart && logDate <= rangeEnd;
      });
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [shipmentLogs, dateRange]);


  const generateShipmentLogTemplate = () => {
    const headers = ["Sevk Edilen Mamul Kodu*", "Miktar*", "Tarih (GG.AA.YYYY)*", "Müşteri Sipariş ID (Opsiyonel)", "Notlar"];
    const exampleRow = ["MAM-001", 25, "03.01.2024", "CO-123", "Acil sevkiyat"];
     const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Sevk Edilen Mamul Kodu' sistemde kayıtlı bir 'mamul' türünde ürünün kodu olmalıdır."],
        ["- 'Miktar' pozitif bir sayı olmalıdır ve stok miktarından fazla olamaz."],
        ["- 'Tarih' GG.AA.YYYY formatında veya Excel'in tarih formatında olmalıdır."],
        ["- 'Müşteri Sipariş ID' sistemde kayıtlı bir müşteri siparişinin ID'si olmalıdır (eğer girilirse)."],
    ];
    downloadExcelTemplate([{ sheetName: "SevkiyatKayitlari", data: [headers, exampleRow, [], ...notes] }], "Sevkiyat_Kayit_Sablonu");
  };

  const handleShipmentLogImport = async (file: File) => {
    try {
      const parsedData = await parseExcelFileUtil(file);
      const sheet = parsedData["SevkiyatKayitlari"];

      if (!sheet) {
        toast({ title: "İçe Aktarma Hatası", description: "Excel dosyasında 'SevkiyatKayitlari' sayfası bulunamadı.", variant: "destructive" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];
      const allProducts = useStore.getState().products;
      const allCustomerOrders = useStore.getState().customerOrders;

      const importSchema = z.object({
        "Sevk Edilen Mamul Kodu*": z.preprocess(
          val => (typeof val === 'number' ? String(val) : val),
          z.string().min(1, "Mamul ürün kodu zorunludur.")
        ),
        "Miktar*": z.preprocess(val => {
            const num = Number(val);
            return isNaN(num) ? undefined : num;
        }, z.number({invalid_type_error: "Miktar sayı olmalıdır."}).positive("Miktar pozitif olmalıdır.")),
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
        "Müşteri Sipariş ID (Opsiyonel)": z.string().optional().nullable(),
        "Notlar": z.string().optional().nullable(),
      });
      
      for (const row of sheet) {
        const rowIndex = sheet.indexOf(row) + 2;
        const validationResult = importSchema.safeParse(row);

        if (validationResult.success) {
          const data = validationResult.data;
          
          const productCode = data["Sevk Edilen Mamul Kodu*"];
          const product = findProductByCode(productCode, allProducts);
          if (!product || product.type !== 'mamul') {
            errorMessages.push(`Satır ${rowIndex}: '${productCode}' kodlu mamul ürün bulunamadı veya türü yanlış.`);
            errorCount++;
            continue;
          }

          const customerOrderId = data["Müşteri Sipariş ID (Opsiyonel)"]?.trim();
          if (customerOrderId && !allCustomerOrders.find(co => co.id === customerOrderId)) {
             errorMessages.push(`Satır ${rowIndex}: '${customerOrderId}' ID'li müşteri siparişi bulunamadı.`);
             errorCount++;
             continue;
          }
          
          try {
            const newLog: ShipmentLog = {
              id: crypto.randomUUID(),
              productId: product.id,
              quantity: data["Miktar*"],
              date: data["Tarih (GG.AA.YYYY)*"].toISOString(),
              customerOrderId: customerOrderId || undefined,
              notes: data["Notlar"] || undefined,
            };
            addShipmentLog(newLog);
            successCount++;
          } catch (e: any) {
            errorMessages.push(`Satır ${rowIndex}: '${productCode}' sevkiyatı sırasında hata: ${e.message}`);
            errorCount++;
          }

        } else {
          errorCount++;
          const errors = validationResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
          errorMessages.push(`Satır ${rowIndex}: ${row["Sevk Edilen Mamul Kodu*"] || 'Bilinmeyen Kayıt'} - ${errors}`);
        }
      }

      let toastDescription = `${successCount} sevkiyat kaydı başarıyla içe aktarıldı.`;
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
        <h1 className="text-3xl font-bold">Sevkiyat Kayıtları</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" /> Excel'den İçe Aktar
          </Button>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
              setIsFormOpen(isOpen);
              if (!isOpen) setEditingLog(undefined);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Sevkiyat Kaydı
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <ShipmentLogForm
                log={editingLog}
                onSuccess={() => {
                  setIsFormOpen(false);
                  setEditingLog(undefined);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 py-4 border-y">
        <Label htmlFor="date-range-filter" className="text-sm font-medium">Tarih Aralığına Göre Filtrele:</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date-range-filter"
              variant={"outline"}
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !dateRange?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
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
              onSelect={setDateRange}
              numberOfMonths={1} 
              locale={tr}
              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
            />
          </PopoverContent>
        </Popover>
        {(dateRange?.from) && (
          <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} className="text-muted-foreground hover:text-destructive">
            <XCircle className="mr-1 h-4 w-4" />
            Filtreyi Temizle
          </Button>
        )}
      </div>

      <DataTable columns={columns} data={logsToDisplay} />
      
      {logToDelete && (
        <AlertDialog open={!!logToDelete} onOpenChange={() => setLogToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sevkiyat Kaydını Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu işlem geri alınamaz. Bu sevkiyat kaydı silinecek ve ilişkili stok hareketleri geri alınacaktır.
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
        entityName="Sevkiyat Kayıtları"
        templateGenerator={generateShipmentLogTemplate}
        onImport={handleShipmentLogImport}
        templateFileName="Sevkiyat_Kayit_Sablonu.xlsx"
      />
    </div>
  );
}

