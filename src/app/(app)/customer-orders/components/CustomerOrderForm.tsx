
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useStore, getProductUnitById, getProductCodeById, getProductNameById } from "@/lib/store";
import type { CustomerOrder, OrderItem, Product } from "@/types";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { ProductCombobox } from "@/components/ProductCombobox";

const orderItemSchema = z.object({
  productId: z.string().min(1, "Ürün seçilmelidir."),
  quantity: z.coerce.number().positive("Miktar pozitif bir sayı olmalıdır."),
});

const customerOrderFormSchema = z.object({
  customerName: z.string().min(2, "Müşteri adı en az 2 karakter olmalıdır."),
  orderDate: z.date({ required_error: "Sipariş tarihi seçilmelidir." }),
  items: z.array(orderItemSchema).min(1, "Sipariş en az bir ürün içermelidir."),
});

type CustomerOrderFormValues = z.infer<typeof customerOrderFormSchema>;

interface CustomerOrderFormProps {
  order?: CustomerOrder; 
  onSuccess: () => void;
}

export function CustomerOrderForm({ order, onSuccess }: CustomerOrderFormProps) {
  const { products, addCustomerOrder, updateCustomerOrder } = useStore(); 
  const { toast } = useToast();

  const finishedProducts = products.filter(p => p.type === 'mamul');

  const form = useForm<CustomerOrderFormValues>({
    resolver: zodResolver(customerOrderFormSchema),
    defaultValues: order 
      ? { ...order, orderDate: new Date(order.orderDate) } 
      : {
          customerName: "",
          orderDate: new Date(),
          items: [{ productId: "", quantity: 1 }], 
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  function onSubmit(data: CustomerOrderFormValues) {
    try {
      const orderDataSubmit = {
        ...data,
        orderDate: data.orderDate.toISOString(),
      };
      
      if (order) {
        updateCustomerOrder({ ...order, ...orderDataSubmit });
        toast({ title: "Müşteri Siparişi Güncellendi", description: `Sipariş başarıyla güncellendi.` });
      } else {
        const newOrder: CustomerOrder = {
          id: crypto.randomUUID(),
          ...orderDataSubmit,
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
            {order ? `${order.customerName} adına olan siparişin bilgilerini değiştirin.` : "Yeni müşteri siparişi için bilgileri girin."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
        
        <div>
            <div className="flex justify-between items-center mb-2">
                <FormLabel>Sipariş Kalemleri</FormLabel>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: "", quantity: 1 })} 
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
                      <FormLabel>Ürün (Mamul)</FormLabel>
                       <ProductCombobox
                        products={finishedProducts}
                        value={itemField.value}
                        onChange={itemField.onChange}
                        placeholder="Mamul seçin"
                      />
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
           {form.formState.errors.items && typeof form.formState.errors.items !== 'string' && !Array.isArray(form.formState.errors.items) && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>
          )}
        </div>
        
        <Separator />

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

