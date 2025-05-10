
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
import { useStore, getCustomerOrderDisplayInfoById, getProductUnitById } from "@/lib/store";
import type { ShipmentLog, Product, CustomerOrder } from "@/types";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ProductCombobox } from "@/components/ProductCombobox";

const NO_CUSTOMER_ORDER_SELECTED_VALUE = "__no_customer_order__";

const shipmentLogFormSchema = z.object({
  productId: z.string().min(1, "Ürün seçilmelidir."),
  quantity: z.coerce.number().positive("Miktar pozitif bir sayı olmalıdır."),
  date: z.date({ required_error: "Tarih seçilmelidir." }),
  customerOrderId: z.string().optional(), 
  notes: z.string().optional(),
});

type ShipmentLogFormValues = z.infer<typeof shipmentLogFormSchema>;

interface ShipmentLogFormProps {
  log?: ShipmentLog; 
  onSuccess: () => void;
}

export function ShipmentLogForm({ log, onSuccess }: ShipmentLogFormProps) {
  const { products, customerOrders, addShipmentLog, updateShipmentLog } = useStore();
  const { toast } = useToast();

  const shippableProducts = products.filter(p => p.type === 'mamul'); 

  const form = useForm<ShipmentLogFormValues>({
    resolver: zodResolver(shipmentLogFormSchema),
    defaultValues: log
      ? { 
          ...log, 
          date: new Date(log.date), 
          notes: log.notes || "", 
          customerOrderId: log.customerOrderId || NO_CUSTOMER_ORDER_SELECTED_VALUE 
        }
      : {
          productId: "",
          quantity: 1, 
          date: new Date(),
          customerOrderId: NO_CUSTOMER_ORDER_SELECTED_VALUE,
          notes: "",
        },
  });

  function onSubmit(data: ShipmentLogFormValues) {
    try {
      const logDataSubmit = {
        ...data,
        date: data.date.toISOString(),
        notes: data.notes || undefined,
        customerOrderId: data.customerOrderId === NO_CUSTOMER_ORDER_SELECTED_VALUE ? undefined : data.customerOrderId,
      };

      if (log) {
        updateShipmentLog({ ...log, ...logDataSubmit });
        toast({ title: "Sevkiyat Kaydı Güncellendi", description: `Sevkiyat kaydı başarıyla güncellendi.` });
      } else {
        addShipmentLog(logDataSubmit); 
        toast({ title: "Sevkiyat Kaydı Eklendi", description: `Yeni sevkiyat kaydı başarıyla eklendi.` });
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
          <DialogTitle>{log ? "Sevkiyat Kaydını Düzenle" : "Yeni Sevkiyat Kaydı"}</DialogTitle>
          <DialogDescription>
            {log ? `Sevkiyat bilgilerini değiştirin.` : "Yeni sevkiyat için bilgileri girin."}
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sevk Edilen Ürün (Mamul)</FormLabel>
              <ProductCombobox
                products={shippableProducts}
                value={field.value}
                onChange={field.onChange}
                placeholder="Mamul seçin"
                disabled={!!log} 
                searchPlaceholder="Mamul kodu veya adı ara..."
              />
              {!!log && <p className="text-xs text-muted-foreground">Ürün, sevkiyat düzenlenirken değiştirilemez.</p>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sevk Miktarı ({getProductUnitById(form.getValues("productId")) || 'Birim'})</FormLabel>
              <FormControl>
                <Input type="number" placeholder="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="customerOrderId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Müşteri Siparişi (Opsiyonel)</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || NO_CUSTOMER_ORDER_SELECTED_VALUE} 
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Müşteri siparişi seçin (opsiyonel)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_CUSTOMER_ORDER_SELECTED_VALUE}>Sipariş Yok</SelectItem>
                  {customerOrders.sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {getCustomerOrderDisplayInfoById(order.id)}
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
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Sevkiyat Tarihi</FormLabel>
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
                <Textarea placeholder="Sevkiyat hakkında ek bilgi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">İptal Et</Button>
          </DialogClose>
          <Button type="submit">{log ? "Kaydet" : "Ekle"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
