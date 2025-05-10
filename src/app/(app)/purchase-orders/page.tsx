
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PurchaseOrderForm } from "./components/PurchaseOrderForm";
import { getPurchaseOrderColumns } from "./components/PurchaseOrderColumns";
import { useStore, getSupplierNameById } from "@/lib/store";
import type { PurchaseOrder, Product } from "@/types";
import { DataTable } from "@/components/DataTable";
import { PlusCircle, UploadCloud, Filter } from "lucide-react";
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
import { downloadExcelTemplate, parseExcelFile, findProductByCode, findProductByName } from "@/lib/excelUtils";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PurchaseOrderStatus } from "@/types";

const statusFilters: { value: PurchaseOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Tüm Durumlar" },
  { value: "open", label: "Açık" },
  { value: "partially_received", label: "Kısmen Teslim Alındı" },
  { value: "closed", label: "Kapalı" },
  { value: "cancelled", label: "İptal Edildi" },
];


export default function PurchaseOrdersPage() {
  const { purchaseOrders, suppliers, products, deletePurchaseOrder, addPurchaseOrder } = useStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<PurchaseOrder | undefined>(undefined);
  const [orderToDelete, setOrderToDelete] = React.useState<string | null>(null);
  const { toast } = useToast();
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<PurchaseOrderStatus | "all">("all");


  React.useEffect(() => {
    setIsMounted(true);
    purchaseOrders.forEach(po => useStore.getState().updatePurchaseOrderStatus(po.id));
  }, []);
  
  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = (orderId: string) => {
    setOrderToDelete(orderId);
  };

  const handleDelete = () => {
    if (orderToDelete) {
      try {
        deletePurchaseOrder(orderToDelete);
        toast({ title: "Satınalma Siparişi Silindi", description: "Sipariş başarıyla silindi." });
      } catch (error: any) {
        toast({ title: "Silme Hatası", description: error.message, variant: "destructive" });
      }
      setOrderToDelete(null);
    }
  };
  
  const filteredOrders = React.useMemo(() => {
    return purchaseOrders
    .filter(order => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const supplierName = getSupplierNameById(order.supplierId)?.toLowerCase() || "";
        const orderReferenceMatch = order.orderReference?.toLowerCase().includes(lowerSearchTerm);

        const matchesSearch = supplierName.includes(lowerSearchTerm) || orderReferenceMatch;
        const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
        return matchesSearch && matchesStatus;
    })
    .sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [purchaseOrders, searchTerm, selectedStatus, suppliers]);


  const generatePurchaseOrderTemplate = () => {
    const headers = ["Sipariş Referansı (Opsiyonel)", "Tedarikçi Adı*", "Sipariş Tarihi (GG.AA.YYYY)*", "Beklenen Teslim Tarihi (GG.AA.YYYY)", "Ürün Kodu*", "Miktar*", "Notlar"];
    const exampleSupplierName = suppliers.length > 0 ? suppliers[0].name : "Örnek Tedarikçi A.Ş.";
    const exampleProduct = products.find(p => p.type === 'hammadde' || p.type === 'yardimci_malzeme');
    const exampleProductCode = exampleProduct ? exampleProduct.productCode : "HAM-001";

    const exampleRows = [
        ["PO-2024-001", exampleSupplierName, "01.06.2024", "15.06.2024", exampleProductCode, 100, "İlk parti"],
        ["PO-2024-001", exampleSupplierName, "01.06.2024", "15.06.2024", "HAM-002", 50, "İlk parti"],
        ["PO-2024-002", exampleSupplierName, "05.06.2024", "", "YDM-001", 20, ""],
    ];
    const notes = [
        ["Notlar:"],
        ["- * ile işaretli alanlar zorunludur."],
        ["- 'Tedarikçi Adı' sistemde kayıtlı bir tedarikçi adı olmalıdır."],
        ["- 'Ürün Kodu' sistemde kayıtlı bir 'hammadde' veya 'yardimci_malzeme' türünde ürün kodu olmalıdır."],
        ["- Aynı 'Sipariş Referansı' (veya yoksa Tedarikçi Adı + Sipariş Tarihi kombinasyonu) ve aynı tedarikçiye ait satırlar tek bir sipariş olarak gruplanır."],
        ["- Tarih formatı GG.AA.YYYY veya Excel tarih formatı olmalıdır."]
    ];
    downloadExcelTemplate([{ sheetName: "SatinAlmaSiparisleri", data: [headers, ...exampleRows, [], ...notes] }], "SatinAlma_Siparisi_Sablonu");
  };

  const handlePurchaseOrderImport = async (file: File) => {
    try {
      const parsedData = await parseExcelFile(file);
      const sheetData = parsedData["SatinAlmaSiparisleri"];

      if (!sheetData) {
        toast({ title: "İçe Aktarma Hatası", description: "Excel dosyasında 'SatinAlmaSiparisleri' sayfası bulunamadı.", variant: "destructive" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];
      
      const poImportSchema = z.object({
        "Sipariş Referansı (Opsiyonel)": z.string().optional().nullable(),
        "Tedarikçi Adı*": z.string().min(1, "Tedarikçi adı zorunludur."),
        "Sipariş Tarihi (GG.AA.YYYY)*": z.date({errorMap: () => ({ message: "Geçerli sipariş tarihi girilmelidir (GG.AA.YYYY)."})}),
        "Beklenen Teslim Tarihi (GG.AA.YYYY)": z.date().optional().nullable(),
        "Ürün Kodu*": z.string().min(1, "Ürün kodu zorunludur."),
        "Miktar*": z.preprocess(val => Number(val), z.number({invalid_type_error: "Miktar sayı olmalıdır."}).positive("Miktar pozitif olmalıdır.")),
        "Notlar": z.string().optional().nullable(),
      });

      const ordersFromFile = new Map<string, Omit<PurchaseOrder, 'id' | 'status' | 'items'> & { items: Omit<PurchaseOrderItem, 'receivedQuantity'>[] }>();

      for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
        const rowIndex = i + 2; 

        const validation = poImportSchema.safeParse(row);
        if (!validation.success) {
          errorMessages.push(`Satır ${rowIndex}: ${validation.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(', ')}`);
          errorCount++;
          continue;
        }
        
        const data = validation.data;
        const supplier = suppliers.find(s => s.name.toLowerCase() === data["Tedarikçi Adı*"].toLowerCase());
        if (!supplier) {
            errorMessages.push(`Satır ${rowIndex}: '${data["Tedarikçi Adı*"]}' adlı tedarikçi bulunamadı.`);
            errorCount++;
            continue;
        }
        const product = findProductByCode(data["Ürün Kodu*"], products);
        if (!product || (product.type !== 'hammadde' && product.type !== 'yardimci_malzeme')) {
            errorMessages.push(`Satır ${rowIndex}: '${data["Ürün Kodu*"]}' kodlu hammadde/yardımcı malzeme ürünü bulunamadı veya türü yanlış.`);
            errorCount++;
            continue;
        }

        const orderKey = data["Sipariş Referansı (Opsiyonel)"] || `${supplier.id}-${data["Sipariş Tarihi (GG.AA.YYYY)*"].toISOString().split('T')[0]}`;
        
        if (!ordersFromFile.has(orderKey)) {
            ordersFromFile.set(orderKey, {
                orderReference: data["Sipariş Referansı (Opsiyonel)"] || undefined,
                supplierId: supplier.id,
                orderDate: data["Sipariş Tarihi (GG.AA.YYYY)*"].toISOString(),
                expectedDeliveryDate: data["Beklenen Teslim Tarihi (GG.AA.YYYY)"]?.toISOString() || undefined,
                items: [],
                notes: data["Notlar"] || undefined,
            });
        }
        const orderEntry = ordersFromFile.get(orderKey)!;
        if (orderEntry.supplierId !== supplier.id) { // Sanity check if key logic changes
             errorMessages.push(`Satır ${rowIndex}: Sipariş anahtarı ('${orderKey}') için tedarikçi uyuşmazlığı.`);
             errorCount++;
             continue;
        }

        if(orderEntry.items.some(item => item.productId === product.id)){
            errorMessages.push(`Satır ${rowIndex}: '${orderKey}' siparişi için '${product.productCode}' ürünü dosyada birden fazla kez tanımlanmış. İlk tanım geçerli olacak.`);
            errorCount++;
            continue;
        }
        orderEntry.items.push({ productId: product.id, orderedQuantity: data["Miktar*"] });
      }

      for (const [key, orderData] of ordersFromFile.entries()) {
        if (orderData.items.length === 0) {
          errorMessages.push(`'${key}' referanslı sipariş için geçerli ürün eklenemedi.`);
          errorCount++;
          continue;
        }
        try {
            const finalItems: PurchaseOrderItem[] = orderData.items.map(item => ({...item, receivedQuantity: 0}));
            addPurchaseOrder({ ...orderData, items: finalItems, status: 'open' } as PurchaseOrder);
            successCount++;
        } catch (e: any) {
            errorMessages.push(`'${key}' siparişi eklenirken hata: ${e.message}`);
            errorCount++;
        }
      }


      let description = `${successCount} satınalma siparişi başarıyla içe aktarıldı.`;
      if (errorCount > 0) {
        description += ` ${errorCount} satır/siparişte hata oluştu veya atlandı.`;
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


  const columns = React.useMemo(() => getPurchaseOrderColumns({ onEdit: handleEdit, onDelete: handleDeleteConfirm }), [suppliers, products, handleEdit, handleDeleteConfirm]);

  if (!isMounted) {
    return <div className="flex items-center justify-center h-full"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <h1 className="text-3xl font-bold">Satınalma Siparişleri</h1>
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
            <DialogContent className="sm:max-w-2xl"> {/* Wider dialog for PO form */}
              <PurchaseOrderForm
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

       <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 py-4 border-y">
        <Input 
            placeholder="Tedarikçi adı veya sipariş referansı ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm w-full sm:w-auto"
        />
        <Select value={selectedStatus} onValueChange={(value: PurchaseOrderStatus | "all") => setSelectedStatus(value)}>
            <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Duruma göre filtrele" />
            </SelectTrigger>
            <SelectContent>
                {statusFilters.map(status => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>


      <DataTable columns={columns} data={filteredOrders} />

       {orderToDelete && (
        <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Satınalma Siparişini Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu işlem geri alınamaz. Bu satınalma siparişi veritabanından kalıcı olarak silinecektir.
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
        entityName="Satınalma Siparişleri"
        templateGenerator={generatePurchaseOrderTemplate}
        onImport={handlePurchaseOrderImport}
        templateFileName="SatinAlma_Siparisi_Sablonu.xlsx"
      />
    </div>
  );
}
