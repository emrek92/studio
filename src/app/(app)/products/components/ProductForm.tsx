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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import type { Product, ProductType } from "@/types";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const productTypes: { value: ProductType; label: string }[] = [
  { value: "hammadde", label: "Xammal" },
  { value: "yari_mamul", label: "Yarım Məhsul" },
  { value: "mamul", label: "Məhsul" },
  { value: "yardimci_malzeme", label: "Köməkçi Material" },
];

const productFormSchema = z.object({
  name: z.string().min(2, { message: "Məhsul adı ən azı 2 simvol olmalıdır." }),
  type: z.enum(["hammadde", "yari_mamul", "mamul", "yardimci_malzeme"], {
    required_error: "Məhsul növü seçilməlidir.",
  }),
  unit: z.string().min(1, { message: "Ölçü vahidi daxil edilməlidir (məsələn, kq, ədəd, lt)." }),
  stock: z.coerce.number().min(0, { message: "Stok miqdarı mənfi ola bilməz." }).default(0),
  description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const addProduct = useStore((state) => state.addProduct);
  const updateProduct = useStore((state) => state.updateProduct);
  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? { ...product, stock: product.stock || 0 }
      : {
          name: "",
          type: undefined,
          unit: "",
          stock: 0,
          description: "",
        },
  });

  function onSubmit(data: ProductFormValues) {
    try {
      if (product) {
        updateProduct({ ...product, ...data });
        toast({ title: "Məhsul Yeniləndi", description: `${data.name} məhsulu uğurla yeniləndi.` });
      } else {
        const newProduct: Product = {
          id: crypto.randomUUID(),
          ...data,
        };
        addProduct(newProduct);
        toast({ title: "Məhsul Əlavə Edildi", description: `${data.name} məhsulu uğurla əlavə edildi.` });
      }
      onSuccess();
    } catch (error) {
      toast({ title: "Xəta", description: "Əməliyyat zamanı xəta baş verdi.", variant: "destructive" });
      console.error(error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle>{product ? "Məhsulu Redaktə Et" : "Yeni Məhsul Əlavə Et"}</DialogTitle>
          <DialogDescription>
            {product ? `${product.name} məhsulunun məlumatlarını dəyişdirin.` : "Yeni məhsul üçün məlumatları daxil edin."}
          </DialogDescription>
        </DialogHeader>
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Məhsul Adı</FormLabel>
              <FormControl>
                <Input placeholder="Məs: Qırmızı Boya" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Məhsul Növü</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Növ seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {productTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ölçü Vahidi</FormLabel>
              <FormControl>
                <Input placeholder="kq, ədəd, lt, mt..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Başlanğıc Stok Miqdarı</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} disabled={!!product} />
              </FormControl>
              {!!product && <p className="text-xs text-muted-foreground">Stok miqdarı xammal girişi və istehsal ilə idarə olunur.</p>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıqlama (İstəyə Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="Məhsul haqqında əlavə məlumat" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Ləğv Et</Button>
          </DialogClose>
          <Button type="submit">{product ? "Yadda Saxla" : "Əlavə Et"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
