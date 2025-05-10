
"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Product } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const stockCountItemSchema = z.object({
  productId: z.string(),
  countedQuantity: z.coerce.number().min(0, "Miktar 0 veya daha büyük olmalıdır."),
});

const stockCountFormSchema = z.object({
  items: z.array(stockCountItemSchema),
});

type StockCountFormValues = z.infer<typeof stockCountFormSchema>;

interface StockCountFormProps {
  initialProducts: Product[];
  onSubmit: (counts: Array<{ productId: string; quantity: number }>) => void;
  getProductById: (id: string) => Product | undefined;
}

export function StockCountForm({ initialProducts, onSubmit, getProductById }: StockCountFormProps) {
  const form = useForm<StockCountFormValues>({
    resolver: zodResolver(stockCountFormSchema),
    defaultValues: {
      items: initialProducts.map(p => ({
        productId: p.id,
        countedQuantity: p.stock,
      })),
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  React.useEffect(() => {
    // Update form if initialProducts change (e.g. after store hydration)
    replace(initialProducts.map(p => ({
      productId: p.id,
      countedQuantity: p.stock,
    })));
  }, [initialProducts, replace]);

  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredFields = React.useMemo(() => {
    if (!searchTerm) return fields.map((field, index) => ({ ...field, originalIndex: index }));
    
    return fields
      .map((field, index) => ({ ...field, originalIndex: index }))
      .filter(field => {
        const product = getProductById(field.productId);
        if (!product) return false;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
          product.name.toLowerCase().includes(lowerSearchTerm) ||
          product.productCode.toLowerCase().includes(lowerSearchTerm)
        );
      });
  }, [fields, searchTerm, getProductById]);
  
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = React.useState(1);
  const totalPages = Math.ceil(filteredFields.length / itemsPerPage);
  const paginatedFields = filteredFields.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const handleFormSubmit = (data: StockCountFormValues) => {
    onSubmit(data.items.map(item => ({ productId: item.productId, quantity: item.countedQuantity })));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <Input
          placeholder="Ürün adı veya kodu ile filtrele..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to first page on search
          }}
          className="max-w-sm mb-4"
        />

        <ScrollArea className="h-[500px] border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[150px]">Ürün Kodu</TableHead>
                <TableHead>Ürün Adı</TableHead>
                <TableHead className="w-[100px]">Birim</TableHead>
                <TableHead className="w-[120px] text-right">Mevcut Stok</TableHead>
                <TableHead className="w-[150px] text-right">Sayılan Miktar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFields.map((field) => {
                const product = getProductById(field.productId);
                if (!product) return null;
                return (
                  <TableRow key={field.id}>
                    <TableCell className="font-mono">{product.productCode}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell className="text-right">{product.stock}</TableCell>
                    <TableCell className="text-right">
                      <FormField
                        control={form.control}
                        name={`items.${field.originalIndex}.countedQuantity`}
                        render={({ field: formField }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                {...formField}
                                className="text-right"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredFields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Aramanızla eşleşen ürün bulunamadı veya hiç ürün yok.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Önceki
            </Button>
            <span className="text-sm">
              Sayfa {currentPage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Sonraki
            </Button>
          </div>
        )}


        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Stok Sayımını Kaydet ve Uygula
          </Button>
        </div>
      </form>
    </Form>
  );
}
