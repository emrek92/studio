
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, Controller } from "react-hook-form";
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
import { useStore, getProductUnitById, isProductPurchasable, getSupplierNameById } from "@/lib/store";
import type { PurchaseOrder, PurchaseOrderItem, Product, Supplier, PurchaseOrderStatus } from "@/types";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { ProductCombobox } from "@/components/ProductCombobox";

const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Ürün seçilmelidir."),
  orderedQuantity: z.coerce.number().positive("Miktar pozitif bir sayı olmalıdır."),
});

const purchaseOrderFormSchema = z.object({
  orderReference: z.string().optional(),
  supplierId: z.string().min(1, "Tedarikçi seçilmelidir."),
  orderDate: z.date({ required_error: "Sipariş tarihi seçilmelidir." }),
  expectedDeliveryDate: z.date().optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, "Sipariş en az bir ürün içermelidir."),
  status: z.enum(["open", "partially_received", "closed", "cancelled"]).default("open"),
  notes: z.string().optional(),
});

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;

const statusOptions: { value: PurchaseOrderStatus; label: string }[] = [
  { value: "open", label: "Açık" },
  { value: "partially_received", label: "Kısmen Teslim Alındı" },
  { value: "closed", label: "Kapalı" },
  { value: "cancelled", label: "İptal Edildi" },
];


interface PurchaseOrderFormProps {
  order?: PurchaseOrder; 
  onSuccess: () => void;
}

export function PurchaseOrderForm({ order, onSuccess }: PurchaseOrderFormProps) {
  const { products, suppliers, addPurchaseOrder, updatePurchaseOrder, updatePurchaseOrderStatus } = useStore();
  const { toast } = useToast();

  const purchasableProducts = products.filter(p => isProductPurchasable(p.id));

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: order 
      ? { 
          ...order, 
          orderDate: new Date(order.orderDate),
          expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : null,
          items: order.items.map(item => ({ productId: item.productId, orderedQuantity: item.orderedQuantity })), 
        } 
      : {
          orderReference: "",
          supplierId: "",
          orderDate: new Date(),
          expectedDeliveryDate: null,
          items: [{ productId: "", orderedQuantity: 1 }],
          status: "open",
          notes: "",
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const isEditing = !!order;
  const canChangeStatus = isEditing ? (order.items.every(i => i.receivedQuantity === 0) || form.getValues("status") === 'cancelled') : true;


  function onSubmit(data: PurchaseOrderFormValues) {
    try {
      const orderDataSubmit = {
        ...data,
        orderDate: data.orderDate.toISOString(),
        expectedDeliveryDate: data.expectedDeliveryDate?.toISOString() || undefined,
        notes: data.notes || undefined,
      };
      
      if (order) {
        const updatedItems = orderDataSubmit.items.map(formItem => {
            const existingItem = order.items.find(i => i.productId === formItem.productId);
            return {
                ...formItem,
                receivedQuantity: existingItem ? existingItem.receivedQuantity : 0,
            };
        });
        updatePurchaseOrder({ ...order, ...orderDataSubmit, items: updatedItems });
        updatePurchaseOrderStatus(order.id); 
        toast({ title: "Satınalma Siparişi Güncellendi", description: `Sipariş başarıyla güncellendi.` });
      } else {
        const newOrderItems = orderDataSubmit.items.map(item => ({ ...item, receivedQuantity: 0 }));
        addPurchaseOrder({ ...orderDataSubmit, items: newOrderItems, status: "open" } as PurchaseOrder); 
        toast({ title: "Satınalma Siparişi Eklendi", description: `Yeni sipariş başarıyla eklendi.` });
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
          <DialogTitle>{order ? "Satınalma Siparişini Düzenle" : "Yeni Satınalma Siparişi"}</DialogTitle>
          <DialogDescription>
            {order ? `${getSupplierNameById(order.supplierId)} tedarikçisine ait siparişin bilgilerini değiştirin.` : "Yeni satınalma siparişi için bilgileri girin."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="orderReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sipariş Referansı (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn: PO-2024-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tedarikçi</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing && order.items.some(i => i.receivedQuantity > 0)}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Tedarikçi seçin" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                 {isEditing && order.items.some(i => i.receivedQuantity > 0) && <p className="text-xs text-muted-foreground">Teslim alınmış kalemleri olan siparişin tedarikçisi değiştirilemez.</p>}
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="orderDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Sipariş Tarihi</FormLabel>
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
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="expectedDeliveryDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Beklenen Teslim Tarihi (Opsiyonel)</FormLabel>
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
                        onSelect={(date) => field.onChange(date ?? null)}
                        initialFocus
                        locale={tr}
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        {isEditing && (
             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Sipariş Durumu</FormLabel>
                     <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                        disabled={!canChangeStatus && field.value !== 'cancelled'}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Durum seçin" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {statusOptions.map((option) => (
                            <SelectItem 
                                key={option.value} 
                                value={option.value}
                                disabled={!canChangeStatus && option.value !== 'cancelled' && option.value !== order?.status}
                            >
                            {option.label}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    {!canChangeStatus && field.value !== 'cancelled' && <p className="text-xs text-muted-foreground">Teslim alınmış kalemleri olan siparişin durumu sadece 'İptal Edildi' olarak değiştirilebilir.</p>}
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}
        
        <div>
            <div className="flex justify-between items-center mb-2">
                <FormLabel>Sipariş Kalemleri</FormLabel>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: "", orderedQuantity: 1 })}
                    disabled={isEditing && order?.status === 'closed'}
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Kalem Ekle
                </Button>
            </div>

          {fields.map((field, index) => (
            <div key={field.id} className="mt-2 space-y-2 p-3 border rounded-md relative bg-muted/30 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`items.${index}.productId`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Ürün (Hammadde/Yard. Mlz.)</FormLabel>
                       <ProductCombobox
                        products={purchasableProducts}
                        value={itemField.value}
                        onChange={itemField.onChange}
                        placeholder="Ürün seçin"
                        disabled={isEditing && order?.items[index]?.receivedQuantity > 0}
                      />
                      {isEditing && order?.items[index]?.receivedQuantity > 0 && <p className="text-xs text-muted-foreground">Teslim alınmış ürün değiştirilemez.</p>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.orderedQuantity`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Sipariş Miktarı ({getProductUnitById(form.getValues(`items.${index}.productId`)) || 'Birim'})</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...itemField} disabled={isEditing && order?.status === 'closed'}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {fields.length > 1 && (!isEditing || order?.status !== 'closed') && (
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 text-destructive hover:bg-destructive/10 h-7 w-7"
                    onClick={() => remove(index)}
                    disabled={isEditing && order?.items[index]?.receivedQuantity > 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
              )}
               {isEditing && order?.items[index]?.receivedQuantity > 0 && <p className="text-xs text-muted-foreground mt-1">Bu kalemden {order?.items[index]?.receivedQuantity} {getProductUnitById(form.getValues(`items.${index}.productId`)) || 'Birim'} teslim alınmış.</p>}
            </div>
          ))}
           {form.formState.errors.items && typeof form.formState.errors.items !== 'string' && !Array.isArray(form.formState.errors.items) && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>
          )}
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notlar (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="Sipariş hakkında ek bilgi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Separator />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">İptal Et</Button>
          </DialogClose>
          <Button type="submit" disabled={isEditing && order?.status === 'closed' && form.getValues("status") !== 'cancelled' }>{order ? "Kaydet" : "Oluştur"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

