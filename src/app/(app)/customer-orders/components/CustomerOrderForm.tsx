
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
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
import { useStore, getProductUnitById } from "@/lib/store";
import type { CustomerOrder, OrderItem, OrderStatus, Product } from "@/types";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const orderItemSchema = z.object({
  productId: z.string().min(1, "Ürün seçilmelidir."),
  quantity: z.coerce.number().positive("Miktar pozitif bir sayı olmalıdır."),
  unitPrice: z.coerce.number().nonnegative("Birim fiyat negatif olamaz."),
});

const customerOrderFormSchema = z.object({
  orderReference: z.string().min(1, "Sipariş referansı zorunludur."),
  customerName: z.string().min(2, "Müşteri adı en az 2 karakter olmalıdır."),
  orderDate: z.date({ required_error: "Sipariş tarihi seçilmelidir." }),
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"], {
    required_error: "Sipariş durumu seçilmelidir.",
  }),
  items: z.array(orderItemSchema).min(1, "Sipariş en az bir ürün içermelidir."),
  notes: z.string().optional(),
});

type CustomerOrderFormValues = z.infer<typeof customerOrderFormSchema>;

const orderStatusOptions: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Beklemede" },
  { value: "processing", label: "İşleniyor" },
  { value: "shipped", label: "Gönderildi" },
  { value: "delivered", label: "Teslim Edildi" },
  { value: "cancelled", label: "İptal Edildi" },
];

interface CustomerOrderFormProps {
  order?: CustomerOrder; 
  onSuccess: () => void;
}

export function CustomerOrderForm({ order, onSuccess }: CustomerOrderFormProps) {
  const { products, addCustomerOrder, updateCustomerOrder, customerOrders } = useStore();
  const { toast } = useToast();

  const finishedProducts = products.filter(p => p.type === 'mamul');

  const form = useForm<CustomerOrderFormValues>({
    resolver: zodResolver(customerOrderFormSchema),
    defaultValues: order 
      ? { ...order, orderDate: new Date(order.orderDate), notes: order.notes || "" }
      : {
          orderReference: "",
          customerName: "",
          orderDate: new Date(),
          status: "pending",
          items: [{ productId: "", quantity: 1, unitPrice: 0 }],
          notes: "",
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const totalAmount = React.useMemo(() => {
    return watchedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [watchedItems]);

  function onSubmit(data: CustomerOrderFormValues) {
    try {
      const orderDataWithDetails = {
        ...data,
        orderDate: data.date.toISOString(),
        notes: data.notes || undefined,
        totalAmount: totalAmount,
      };
      
      if (order) {
         // Check if orderReference is being changed to one that already exists (excluding current order)
        if (data.orderReference !== order.orderReference) {
            const existingOrderWithNewRef = customerOrders.find(co => co.id !== order.id && co.orderReference.toLowerCase() === data.orderReference.toLowerCase());
            if (existingOrderWithNewRef) {
                form.setError("orderReference", { type: "manual", message: "Bu sipariş referansı zaten başka bir sipariş için kullanılıyor." });
                return;
            }
        }
        updateCustomerOrder({ ...order, ...orderDataWithDetails });
        toast({ title: "Müşteri Siparişi Güncellendi", description: `Sipariş başarıyla güncellendi.` });
      } else {
        const existingOrder = customerOrders.find(co => co.orderReference.toLowerCase() === data.orderReference.toLowerCase());
        if (existingOrder) {
            form.setError("orderReference", { type: "manual", message: "Bu sipariş referansı zaten kullanılıyor." });
            return;
        }
        const newOrder: CustomerOrder = {
          id: crypto.randomUUID(),
          ...orderDataWithDetails,
        };
        addCustomerOrder(newOrder); 
        toast({ title: "Müşteri Siparişi Eklendi", description: `Yeni sipariş başarıyla eklendi.` });
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
          <DialogTitle>{order ? "Müşteri Siparişini Düzenle" : "Yeni Müşteri Siparişi"}</DialogTitle>
          <DialogDescription>
            {order ? `${order.orderReference} referanslı siparişin bilgilerini değiştirin.` : "Yeni müşteri siparişi için bilgileri girin."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="orderReference"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Sipariş Referansı</FormLabel>
                <FormControl>
                    <Input placeholder="Örn: SIP-2024-001" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Müşteri Adı</FormLabel>
                <FormControl>
                    <Input placeholder="Müşteri adı ve soyadı" {...field} />
                </FormControl>
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
            name="status"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Sipariş Durumu</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {orderStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                        {option.label}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <div>
            <div className="flex justify-between items-center mb-2">
                <FormLabel>Sipariş Kalemleri</FormLabel>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Kalem Ekle
                </Button>
            </div>

          {fields.map((field, index) => (
            <div key={field.id} className="mt-2 space-y-2 p-3 border rounded-md relative bg-muted/30 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`items.${index}.productId`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Ürün (Mamul)</FormLabel>
                      <Select onValueChange={itemField.onChange} defaultValue={itemField.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Mamul seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {finishedProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{p.name}</span>
                                {p.productCode && <span className="text-xs text-muted-foreground font-mono">{p.productCode}</span>}
                              </div>
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
                  name={`items.${index}.quantity`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Miktar ({getProductUnitById(form.getValues(`items.${index}.productId`)) || 'Birim'})</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...itemField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Birim Fiyat (₺)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" step="0.01" {...itemField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {fields.length > 1 && (
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 text-destructive hover:bg-destructive/10 h-7 w-7"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
              )}
            </div>
          ))}
           {form.formState.errors.items && typeof form.formState.errors.items !== 'string' && !form.formState.errors.items.length && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>
          )}
        </div>
        
        <Separator />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sipariş Notları (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="Sipariş hakkında ek bilgi veya notlar" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="text-right font-semibold text-lg">
            Toplam Tutar: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalAmount)}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">İptal Et</Button>
          </DialogClose>
          <Button type="submit">{order ? "Kaydet" : "Oluştur"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
