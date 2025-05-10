
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as React from "react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useStore, getSupplierNameById, getPurchaseOrderReferenceById } from "@/lib/store";
import type { RawMaterialEntry, PurchaseOrder, PurchaseOrderItem } from "@/types";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { tr } from "date-fns/locale";
import { ProductCombobox } from "@/components/ProductCombobox";

const NO_SUPPLIER_SELECTED_VALUE = "__no_supplier__";
const NO_PURCHASE_ORDER_SELECTED_VALUE = "__no_purchase_order__";


const rawMaterialEntryFormSchema = z.object({
  productId: z.string().min(1, "Hammadde/Yardımcı Malzeme seçilmelidir."),
  quantity: z.coerce.number().positive("Miktar pozitif olmalıdır."),
  date: z.date({ required_error: "Tarih seçilmelidir." }),
  supplierId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => {
    if (data.purchaseOrderId && data.purchaseOrderId !== NO_PURCHASE_ORDER_SELECTED_VALUE && (!data.supplierId || data.supplierId === NO_SUPPLIER_SELECTED_VALUE)) {
        return false; // purchaseOrderId requires supplierId
    }
    return true;
}, {
    message: "Satınalma siparişi seçmek için önce tedarikçi seçmelisiniz.",
    path: ["purchaseOrderId"],
});


type RawMaterialEntryFormValues = z.infer<typeof rawMaterialEntryFormSchema>;

interface RawMaterialEntryFormProps {
  entry?: RawMaterialEntry; 
  onSuccess: () => void;
}

export function RawMaterialEntryForm({ entry, onSuccess }: RawMaterialEntryFormProps) {
  const { products, suppliers, purchaseOrders, addRawMaterialEntry, updateRawMaterialEntry } = useStore();
  const { toast } = useToast();

  const rawMaterials = products.filter(p => p.type === 'hammadde' || p.type === 'yardimci_malzeme');

  const form = useForm<RawMaterialEntryFormValues>({
    resolver: zodResolver(rawMaterialEntryFormSchema),
    defaultValues: entry
      ? { 
          ...entry, 
          date: new Date(entry.date), 
          supplierId: entry.supplierId || NO_SUPPLIER_SELECTED_VALUE, 
          purchaseOrderId: entry.purchaseOrderId || NO_PURCHASE_ORDER_SELECTED_VALUE,
          notes: entry.notes || "" 
        }
      : {
          productId: "",
          quantity: 1,
          date: new Date(),
          supplierId: NO_SUPPLIER_SELECTED_VALUE,
          purchaseOrderId: NO_PURCHASE_ORDER_SELECTED_VALUE,
          notes: "",
        },
  });

  const selectedSupplierId = form.watch("supplierId");
  const selectedProductId = form.watch("productId");
  const selectedPurchaseOrderId = form.watch("purchaseOrderId");

  const availablePurchaseOrders = React.useMemo(() => {
    if (!selectedSupplierId || selectedSupplierId === NO_SUPPLIER_SELECTED_VALUE) return [];
    return purchaseOrders.filter(po => 
        po.supplierId === selectedSupplierId &&
        (po.status === 'open' || po.status === 'partially_received') &&
        po.items.some(item => item.productId === selectedProductId && item.orderedQuantity > item.receivedQuantity)
    );
  }, [selectedSupplierId, selectedProductId, purchaseOrders]);

  React.useEffect(() => {
    // Reset purchaseOrderId if supplier changes or product changes and no valid PO exists
    if (!availablePurchaseOrders.find(po => po.id === form.getValues("purchaseOrderId"))) {
        form.setValue("purchaseOrderId", NO_PURCHASE_ORDER_SELECTED_VALUE);
    }
  }, [selectedSupplierId, selectedProductId, availablePurchaseOrders, form]);

  // Get remaining quantity for a product in a selected PO
  const getPoRemainingQuantity = () => {
    if (selectedPurchaseOrderId && selectedPurchaseOrderId !== NO_PURCHASE_ORDER_SELECTED_VALUE && selectedProductId) {
        const po = purchaseOrders.find(p => p.id === selectedPurchaseOrderId);
        const item = po?.items.find(i => i.productId === selectedProductId);
        if (item) {
            return item.orderedQuantity - item.receivedQuantity;
        }
    }
    return null;
  }
  const remainingPoQuantity = getPoRemainingQuantity();


  function onSubmit(data: RawMaterialEntryFormValues) {
    try {
      if (data.purchaseOrderId && data.purchaseOrderId !== NO_PURCHASE_ORDER_SELECTED_VALUE && selectedProductId) {
        const po = purchaseOrders.find(p => p.id === data.purchaseOrderId);
        const item = po?.items.find(i => i.productId === selectedProductId);
        if (item && data.quantity > (item.orderedQuantity - item.receivedQuantity)) {
            toast({
                title: "Miktar Hatası",
                description: `Girilen miktar (${data.quantity}), siparişteki kalan miktarı (${item.orderedQuantity - item.receivedQuantity}) aşıyor.`,
                variant: "destructive",
            });
            return;
        }
      }

      const entryDataSubmit = {
        ...data,
        date: data.date.toISOString(),
        notes: data.notes || undefined, 
        supplierId: data.supplierId === NO_SUPPLIER_SELECTED_VALUE ? undefined : data.supplierId,
        purchaseOrderId: data.purchaseOrderId === NO_PURCHASE_ORDER_SELECTED_VALUE ? undefined : data.purchaseOrderId,
      };

      if (entry) {
        updateRawMaterialEntry({ ...entry, ...entryDataSubmit });
        toast({ title: "Hammadde Girişi Güncellendi", description: `Giriş başarıyla güncellendi.` });
      } else {
        addRawMaterialEntry(entryDataSubmit);
        toast({ title: "Hammadde Girişi Eklendi", description: `Yeni hammadde girişi başarıyla eklendi.` });
      }
      onSuccess();
    } catch (error: any) {
       toast({ title: "Hata", description: error.message || "İşlem sırasında bir hata oluştu.", variant: "destructive" });
      console.error(error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle>{entry ? "Hammadde Girişini Düzenle" : "Yeni Hammadde Girişi"}</DialogTitle>
          <DialogDescription>
            {entry ? `Giriş bilgilerini değiştirin.` : "Yeni hammadde girişi için bilgileri girin."}
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hammadde/Yardımcı Malzeme</FormLabel>
                <ProductCombobox
                    products={rawMaterials}
                    value={field.value}
                    onChange={(productId) => {
                        field.onChange(productId);
                        form.setValue("purchaseOrderId", NO_PURCHASE_ORDER_SELECTED_VALUE);
                    }}
                    placeholder="Hammadde/Yardımcı Malzeme seçin"
                    disabled={!!entry}
                />
              {!!entry && <p className="text-xs text-muted-foreground">Ürün tipi giriş düzenlenirken değiştirilemez.</p>}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="supplierId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tedarikçi (Opsiyonel)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || NO_SUPPLIER_SELECTED_VALUE}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Tedarikçi seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_SUPPLIER_SELECTED_VALUE}>Tedarikçi Yok</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="purchaseOrderId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Satınalma Siparişi (Opsiyonel)</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || NO_PURCHASE_ORDER_SELECTED_VALUE}
                disabled={!selectedSupplierId || selectedSupplierId === NO_SUPPLIER_SELECTED_VALUE || !selectedProductId || availablePurchaseOrders.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={
                        !selectedSupplierId || selectedSupplierId === NO_SUPPLIER_SELECTED_VALUE ? "Önce tedarikçi seçin" :
                        !selectedProductId ? "Önce ürün seçin" :
                        availablePurchaseOrders.length === 0 ? "Uygun satınalma siparişi yok" :
                        "Satınalma siparişi seçin"
                    } />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_PURCHASE_ORDER_SELECTED_VALUE}>Satınalma Siparişi Yok</SelectItem>
                  {availablePurchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.orderReference || `Sipariş ID: ${po.id.substring(0,8)}`} (Kalan: {po.items.find(i=>i.productId === selectedProductId)?.orderedQuantity - po.items.find(i=>i.productId === selectedProductId)?.receivedQuantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />


        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Miktar</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
               {remainingPoQuantity !== null && <p className="text-xs text-muted-foreground">Seçili siparişte bu üründen kalan miktar: {remainingPoQuantity}</p>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tarih</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: tr })
                      ) : (
                        <span>Tarih seçin</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    locale={tr}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notlar (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="Giriş hakkında ek bilgi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">İptal Et</Button>
          </DialogClose>
          <Button type="submit">{entry ? "Kaydet" : "Ekle"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
