
"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomerOrderForm } from "./components/CustomerOrderForm";
import { getCustomerOrderColumns } from "./components/CustomerOrderColumns";
import { useStore, getProductDisplayInfoById } from "@/lib/store";
import type { CustomerOrder, OrderItem, Product } from "@/types";
import { DataTable } from "@/components/DataTable";
import { PlusCircle, UploadCloud, CalendarIcon, XCircle } from "lucide-react";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { downloadExcelTemplate, parseExcelFile, findProductByCode } from "@/lib/excelUtils";
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


export default function CustomerOrdersPage() {
  const { customerOrders, addCustomerOrder, updateCustomerOrder, deleteCustomerOrder, products } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<CustomerOrder | undefined>(undefined);
  const [orderToDelete, setOrderToDelete] = React.useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEdit = (order: CustomerOrder) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = (orderId: string) => {
    setOrderToDelete(orderId);
  };

  const handleDelete = () => {
    if (orderToDelete) {
      try {
        deleteCustomerOrder(orderToDelete);
        toast({ title: "Müşteri Siparişi Silindi", description: "Sipariş başarıyla silindi." });
      } catch (error: any) {
        toast({ title: "Silme Hatası", description: error.message || "Sipariş silinirken bir hata oluştu.", variant: "destructive" });
      }
      setOrderToDelete(null);
    }
  };

  const columns = React.useMemo(() => getCustomerOrderColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [handleEdit, handleDeleteConfirm]);

  const ordersToDisplay = React.useMemo(() => {
    let filtered = [...customerOrders]; 

    if (dateRange?.from) {
      const rangeStart = new Date(dateRange.from);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
      rangeEnd.setHours(23, 59, 59, 999);

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= rangeStart && orderDate <= rangeEnd;
      });
    }
    return filtered.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [customerOrders, dateRange]);

  const generateCustomerOrderTemplate = () => {
    const headers = ["Sipariş Referansı*", "Müşteri Adı*", "Sipariş Tarihi (GG.AA.YYYY)*", "Ürün Kodu*", "Miktar*", "Birim Fiyat*", "Durum (pending, processing, shipped, delivered, cancelled)*", "Notlar"];
    const exampleRows = [
        ["SIP-001", "Ahmet Yılmaz", "01.05.2024", "MAM-001", 10, 25.50, "pending", "Acil sevkiyat"],
        ["SIP-001", "Ahmet Yılmaz", "01.05.2024", "MAM-002", 5, 100.00, "pending", "Acil sevkiyat"],
        ["SIP-002", "Ayşe Kaya", "02.05.2024", "MAM-003", 20, 15.00, "processing", ""],
    ];
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Sipariş Referansı' aynı siparişe ait farklı ürünleri gruplamak için kullanılır. Sistemde benzersiz olmalıdır."],
        ["- 'Ürün Kodu' sistemde kayıtlı bir 'mamul' türünde ürünün kodu olmalıdır."],
        ["- 'Miktar' ve 'Birim Fiyat' pozitif sayılar olmalıdır."],
        ["- 'Sipariş Tarihi' GG.AA.YYYY formatında veya Excel'in tarih formatında olmalıdır."],
        ["- 'Durum' şu değerlerden biri olmalıdır: pending, processing, shipped, delivered, cancelled."],
        ["- Aynı 'Sipariş Referansı'na sahip satırlar tek bir sipariş olarak içe aktarılacaktır."]
    ];
    downloadExcelTemplate([{ sheetName: "MusteriSiparisleri", data: [headers, ...exampleRows, [], ...notes] }], "Musteri_Siparisi_Sablonu");
  };

  const handleCustomerOrderImport = async (file: File) => {
    try {
      const parsedData = await parseExcelFile(file);
      const sheet = parsedData["MusteriSiparisleri"];

      if (!sheet) {
        toast({ title: "İçe Aktarma Hatası", description: "Excel dosyasında 'MusteriSiparisleri' sayfası bulunamadı.", variant: "destructive" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];
      const allProducts = useStore.getState().products;
      const existingOrders = useStore.getState().customerOrders;

      const orderItemSchema = z.object({
        "Ürün Kodu*": z.string().min(1, "Ürün kodu zorunludur."),
        "Miktar*": z.preprocess(val => Number(val), z.number({invalid_type_error: "Miktar sayı olmalıdır."}).positive("Miktar pozitif olmalıdır.")),
        "Birim Fiyat*": z.preprocess(val => Number(val), z.number({invalid_type_error: "Birim fiyat sayı olmalıdır."}).positive("Birim fiyat pozitif olmalıdır.")),
      });
      
      const orderRowSchema = z.object({
        "Sipariş Referansı*": z.string().min(1, "Sipariş referansı zorunludur."),
        "Müşteri Adı*": z.string().min(1, "Müşteri adı zorunludur."),
        "Sipariş Tarihi (GG.AA.YYYY)*": z.date({ errorMap: () => ({ message: "Geçerli bir sipariş tarihi girilmelidir (GG.AA.YYYY)."}) }),
        "Durum (pending, processing, shipped, delivered, cancelled)*": z.enum(["pending", "processing", "shipped", "delivered", "cancelled"], {errorMap: () => ({message: "Geçersiz sipariş durumu."})}),
        "Notlar": z.string().optional().nullable(),
      }).merge(orderItemSchema);


      const ordersFromFile = new Map<string, Partial<CustomerOrder> & { items: OrderItem[] }>();

      for (let i = 0; i < sheet.length; i++) {
        const row = sheet[i];
        const rowIndex = i + 2; 

        const validation = orderRowSchema.safeParse(row);
        if (!validation.success) {
          errorMessages.push(`Satır ${rowIndex}: ${validation.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(', ')}`);
          errorCount++;
          continue;
        }
        
        const data = validation.data;
        const orderRef = data["Sipariş Referansı*"];

        const product = findProductByCode(data["Ürün Kodu*"], allProducts);
        if (!product || product.type !== 'mamul') {
          errorMessages.push(`Satır ${rowIndex}: '${data["Ürün Kodu*"]}' kodlu mamul ürün bulunamadı veya türü yanlış.`);
          errorCount++;
          continue;
        }

        if (!ordersFromFile.has(orderRef)) {
          if (existingOrders.some(eo => eo.orderReference.toLowerCase() === orderRef.toLowerCase())) {
            errorMessages.push(`Satır ${rowIndex}: '${orderRef}' referanslı sipariş sistemde zaten mevcut. Bu referans için içe aktarma atlanacak.`);
            errorCount++; 
            // To skip all subsequent items for this orderRef if it already exists.
            // A bit tricky here, as we'd need to know all orderRefs that cause this to skip them fully.
            // For now, this error will appear for the first row of an existing orderRef encountered.
            // A better way is to mark orderRef as "to_be_skipped" and check this mark for subsequent rows.
            // Let's assume for now the file should contain only new orders.
            continue;
          }
          ordersFromFile.set(orderRef, {
            orderReference: orderRef,
            customerName: data["Müşteri Adı*"],
            orderDate: data["Sipariş Tarihi (GG.AA.YYYY)*"].toISOString(),
            status: data["Durum (pending, processing, shipped, delivered, cancelled)*"],
            notes: data["Notlar"] || undefined,
            items: [],
            totalAmount: 0,
          });
        }
        
        const orderEntry = ordersFromFile.get(orderRef)!;
        // If orderRef was marked to be skipped earlier, skip adding items.
        if (errorMessages.some(msg => msg.includes(`'${orderRef}' referanslı sipariş sistemde zaten mevcut`))) {
            continue;
        }

        orderEntry.items.push({
          productId: product.id,
          quantity: data["Miktar*"],
          unitPrice: data["Birim Fiyat*"],
        });
      }
      
      for (const [orderRef, orderData] of ordersFromFile.entries()) {
        if (existingOrders.some(eo => eo.orderReference.toLowerCase() === orderRef.toLowerCase())) {
            // This check is somewhat redundant if the above check during row processing worked correctly
            // by skipping all items for an existing orderRef.
            if (!errorMessages.some(msg => msg.includes(`'${orderRef}' referanslı sipariş sistemde zaten mevcut`))) {
                 errorMessages.push(`'${orderRef}' referanslı sipariş sistemde zaten mevcut olduğundan içe aktarılmadı.`);
            }
            errorCount++;
            continue;
        }

        if (orderData.items!.length === 0) {
          errorMessages.push(`'${orderRef}' referanslı sipariş için geçerli ürün eklenemedi.`);
          errorCount++;
          continue;
        }

        orderData.totalAmount = orderData.items!.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        
        try {
          addCustomerOrder({
            id: crypto.randomUUID(),
            ...orderData
          } as CustomerOrder);
          successCount++;
        } catch (e: any) {
          errorMessages.push(`'${orderRef}' siparişi eklenirken hata: ${e.message}`);
          errorCount++;
        }
      }

      let toastDescription = `${successCount} sipariş başarıyla içe aktarıldı.`;
      if (errorCount > 0) {
        toastDescription += ` ${errorCount} satır/siparişte hata oluştu veya atlandı.`;
        console.error("İçe aktarma hataları:", errorMessages.join("\n"));
        toast({
            title: successCount > 0 && errorCount > 0 ? "Kısmi İçe Aktarma Tamamlandı" : "İçe Aktarma Tamamlanamadı",
            description: `${toastDescription}\nDetaylar için konsolu kontrol edin.`,
            variant: successCount === 0 && errorCount > 0 ? "destructive" : "default",
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
        <h1 className="text-3xl font-bold">Müşteri Siparişleri</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" /> Excel'den İçe Aktar
          </Button>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
              setIsFormOpen(isOpen);
              if (!isOpen) setEditingOrder(undefined);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Sipariş Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl"> {/* Increased width for order form */}
              <CustomerOrderForm
                order={editingOrder}
                onSuccess={() => {
                  setIsFormOpen(false);
                  setEditingOrder(undefined);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 py-4 border-y">
        <Label htmlFor="date-range-filter" className="text-sm font-medium">Sipariş Tarihine Göre Filtrele:</Label>
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

      <DataTable columns={columns} data={ordersToDisplay} />
      
      {orderToDelete && (
        <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Müşteri Siparişini Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu işlem geri alınamaz. Bu sipariş veritabanından kalıcı olarak silinecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOrderToDelete(null)}>İptal Et</AlertDialogCancel>
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
        entityName="Müşteri Siparişleri"
        templateGenerator={generateCustomerOrderTemplate}
        onImport={handleCustomerOrderImport}
        templateFileName="Musteri_Siparisi_Sablonu.xlsx"
      />
    </div>
  );
}
