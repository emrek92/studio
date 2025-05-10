
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import type { Supplier } from "@/types";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const supplierFormSchema = z.object({
  name: z.string().min(2, "Tedarikçi adı en az 2 karakter olmalıdır."),
  contactPerson: z.string().optional(),
  email: z.string().email("Geçersiz e-posta adresi.").optional().or(z.literal("")), // Allow empty string
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
  supplier?: Supplier;
  onSuccess: () => void;
}

export function SupplierForm({ supplier, onSuccess }: SupplierFormProps) {
  const { addSupplier, updateSupplier } = useStore();
  const { toast } = useToast();

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: supplier 
      ? { 
          name: supplier.name,
          contactPerson: supplier.contactPerson || "",
          email: supplier.email || "",
          phone: supplier.phone || "",
          address: supplier.address || "",
          notes: supplier.notes || "",
        } 
      : {
          name: "",
          contactPerson: "",
          email: "",
          phone: "",
          address: "",
          notes: "",
        },
  });

  function onSubmit(data: SupplierFormValues) {
    try {
      const submissionData = {
        ...data,
        email: data.email === "" ? undefined : data.email, // Convert empty string to undefined
      };

      if (supplier) {
        updateSupplier({ ...supplier, ...submissionData });
        toast({ title: "Tedarikçi Güncellendi", description: `${submissionData.name} adlı tedarikçi başarıyla güncellendi.` });
      } else {
        addSupplier(submissionData as Supplier); // ID will be added in store
        toast({ title: "Tedarikçi Eklendi", description: `${submissionData.name} adlı tedarikçi başarıyla eklendi.` });
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
          <DialogTitle>{supplier ? "Tedarikçiyi Düzenle" : "Yeni Tedarikçi Ekle"}</DialogTitle>
          <DialogDescription>
            {supplier ? `${supplier.name} adlı tedarikçinin bilgilerini değiştirin.` : "Yeni tedarikçi için bilgileri girin."}
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tedarikçi Adı</FormLabel>
              <FormControl>
                <Input placeholder="Tedarikçi firma adı" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Yetkili Kişi (İsteğe Bağlı)</FormLabel>
                <FormControl>
                    <Input placeholder="Ad Soyad" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>E-posta (İsteğe Bağlı)</FormLabel>
                <FormControl>
                    <Input type="email" placeholder="ornek@tedarikci.com" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
         <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Input placeholder="05xxxxxxxxx" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adres (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="Firma adresi" {...field} />
              </FormControl>
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
                <Textarea placeholder="Tedarikçi hakkında ek bilgiler" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">İptal Et</Button>
          </DialogClose>
          <Button type="submit">{supplier ? "Kaydet" : "Oluştur"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
