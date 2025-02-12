'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ImagePlus, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import Image from 'next/image';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Product {
  id: number;
  categoryId: number;
  code: string;
  name: string;
  description: string | null;
  weight: string;
  weightUnit: string;
  purity: string;
  sellingPrice: string;
  workmanshipFee: string;
  imageUrl: string | null;
  status: string;
  quantity: number;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
}

export default function GoldJewelryPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [productsResponse, balanceResponse, categoriesResponse] = await Promise.all([
        fetch('/api/management/products', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        fetch('/api/user/balance'),
        fetch('/api/management/catalog')
      ]);

      if (!productsResponse.ok || !balanceResponse.ok || !categoriesResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [productsData, balanceData, categoriesData] = await Promise.all([
        productsResponse.json(),
        balanceResponse.json(),
        categoriesResponse.json()
      ]);

      // Filter for active jewelry products (categoryId 1)
      const activeProducts = productsData.filter((product: Product) => 
        product.status === 'active'
      );

      setProducts(activeProducts);
      setBalance(Number(balanceData.balance));
      setCategories(categoriesData);
      
      // Set initial active tab if categories exist
      if (categoriesData.length > 0) {
        setActiveTab('all');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }

  const calculateTotalPrice = (product: Product) => {
    return Number(product.sellingPrice) + Number(product.workmanshipFee);
  };

  const handleBuyClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handlePurchase = async () => {
    if (!selectedProduct) return;

    const totalPrice = calculateTotalPrice(selectedProduct);

    if (totalPrice > balance) {
      toast.error('ยอดเงินในบัญชีไม่เพียงพอ');
      return;
    }

    if (selectedProduct.quantity < 1) {
      toast.error('สินค้าหมด');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/management/jewelry/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          name: selectedProduct.name,
          amount: Number(selectedProduct.weight),
          totalPrice: totalPrice
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process purchase');
      }

      const data = await response.json();
      
      // Update balance
      setBalance(Number(data.balance));
      
      // Update product quantity locally
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === selectedProduct.id 
            ? { ...product, quantity: product.quantity - 1 }
            : product
        )
      );
      
      toast.success('ซื้อสินค้าสำเร็จ');
      setIsDialogOpen(false);
      setSelectedProduct(null);
      
      // Refresh the products list
      fetchData();
    } catch (error) {
      console.error('Error processing purchase:', error);
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการซื้อสินค้า');
    } finally {
      setIsProcessing(false);
    }
  };

  const getFilteredProducts = (categoryId: string) => {
    if (categoryId === 'all') {
      return products;
    }
    return products.filter(product => product.categoryId === Number(categoryId));
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className={`text-lg lg:text-2xl font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        ทองรูปพรรณ
      </h1>

      <div className={`mb-6 p-4 rounded-lg ${isDark ? 'bg-[#151515] border-[#2A2A2A]' : 'bg-white border border-gray-200'}`}>
        <div className="flex justify-between items-center">
          <div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ยอดเงินในบัญชี</p>
            <p className="text-2xl font-bold text-orange-500">฿{balance.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <Card className={isDark ? 'bg-[#151515] border-[#2A2A2A]' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingBag className="h-6 w-6 text-orange-500" />
            <span className={isDark ? 'text-white' : ''}>สินค้าทองรูปพรรณ</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : products.length > 0 ? (
            <div className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto">
                  <TabsList className="mb-4 inline-flex min-w-full sm:min-w-0">
                    <TabsTrigger value="all" className="px-4 py-2">ทั้งหมด</TabsTrigger>
                    {categories.map((category) => (
                      <TabsTrigger 
                        key={category.id} 
                        value={category.id.toString()}
                        className="px-4 py-2"
                      >
                        {category.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <TabsContent value="all">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {getFilteredProducts('all').map((product) => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        isDark={isDark}
                        onBuyClick={handleBuyClick}
                        calculateTotalPrice={calculateTotalPrice}
                      />
                    ))}
                  </div>
                </TabsContent>

                {categories.map((category) => (
                  <TabsContent key={category.id} value={category.id.toString()}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                      {getFilteredProducts(category.id.toString()).map((product) => (
                        <ProductCard 
                          key={product.id} 
                          product={product} 
                          isDark={isDark}
                          onBuyClick={handleBuyClick}
                          calculateTotalPrice={calculateTotalPrice}
                        />
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          ) : (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              ไม่พบสินค้าทองรูปพรรณในขณะนี้
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`max-w-md w-full mx-auto ${isDark ? 'bg-[#151515] border-[#2A2A2A]' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              ยืนยันการซื้อสินค้า
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <div className="aspect-square relative mb-4 rounded-lg overflow-hidden">
                  {selectedProduct.imageUrl ? (
                    <Image
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <ImagePlus className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <h3 className={`font-medium ${isDark ? 'text-white' : ''}`}>
                  {selectedProduct.name}
                </h3>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  รหัสสินค้า: {selectedProduct.code}
                </p>
                <div className={`mt-4 space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="flex justify-between">
                    <span>น้ำหนัก:</span>
                    <span>{selectedProduct.weight} {selectedProduct.weightUnit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ความบริสุทธิ์:</span>
                    <span>{selectedProduct.purity}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ราคาสินค้า:</span>
                    <span>฿{Number(selectedProduct.sellingPrice).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่ากำเหน็จ:</span>
                    <span>฿{Number(selectedProduct.workmanshipFee).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="font-medium">ราคารวมทั้งสิ้น:</span>
                    <span className="font-bold text-orange-500">
                      ฿{calculateTotalPrice(selectedProduct).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {calculateTotalPrice(selectedProduct) > balance && (
                <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20 border border-red-900' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center">
                    <AlertCircle className={`h-5 w-5 mr-2 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                    <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                      ยอดเงินในบัญชีไม่เพียงพอ กรุณาเติมเงินก่อนทำรายการ
                    </p>
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handlePurchase}
                disabled={isProcessing || calculateTotalPrice(selectedProduct) > balance}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังดำเนินการ...
                  </>
                ) : (
                  'ยืนยันการซื้อ'
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ProductCard({ 
  product, 
  isDark, 
  onBuyClick,
  calculateTotalPrice 
}: { 
  product: Product; 
  isDark: boolean;
  onBuyClick: (product: Product) => void;
  calculateTotalPrice: (product: Product) => number;
}) {
  return (
    <div
      className={`flex flex-col h-full border rounded-lg overflow-hidden transform transition-transform hover:scale-[1.02] ${
        isDark 
          ? 'bg-[#1a1a1a] border-[#2A2A2A]' 
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="aspect-square relative">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <ImagePlus className="h-12 w-12 text-gray-400" />
          </div>
        )}
        {product.quantity <= 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-bold text-lg">สินค้าหมด</span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className={`font-medium ${isDark ? 'text-white' : ''}`}>
          {product.name}
        </h3>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          รหัสสินค้า: {product.code}
        </p>
        {product.description && (
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {product.description}
          </p>
        )}
        <div className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>น้ำหนัก: {product.weight} {product.weightUnit}</p>
          <p>ความบริสุทธิ์: {product.purity}%</p>
          <p>จำนวนคงเหลือ: {product.quantity} ชิ้น</p>
        </div>
        <div className="mt-auto pt-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ราคาสินค้า:</span>
              <span className="font-medium">฿{Number(product.sellingPrice).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ค่ากำเหน็จ:</span>
              <span className="font-medium">฿{Number(product.workmanshipFee).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className={`text-sm font-medium ${isDark ? 'text-white' : ''}`}>ราคารวม:</span>
              <span className="text-lg font-bold text-orange-500">
                ฿{calculateTotalPrice(product).toLocaleString()}
              </span>
            </div>
          </div>
          <Button 
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => onBuyClick(product)}
            disabled={product.quantity < 1}
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            {product.quantity < 1 ? 'สินค้าหมด' : 'ซื้อ'}
          </Button>
        </div>
      </div>
    </div>
  );
}