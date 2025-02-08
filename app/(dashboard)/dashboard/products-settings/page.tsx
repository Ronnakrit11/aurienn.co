'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ShieldAlert, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { toast } from 'sonner';
import { useTheme } from '@/lib/theme-provider';

interface ProductSettings {
  id: number;
  name: string;
  isActive: boolean;
}

const GOLD_PRODUCTS = [
  { id: 1, name: 'ทองสมาคม 96.5%' },
  { id: 2, name: 'ทอง 99.99%' },
];

export default function ProductsSettingsPage() {
  const { user } = useUser();
  const { theme } = useTheme();
  const [products, setProducts] = useState<ProductSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved settings or initialize with defaults
    const loadSettings = async () => {
      try {
        const savedSettings = localStorage.getItem('goldProductSettings');
        if (savedSettings) {
          setProducts(JSON.parse(savedSettings));
        } else {
          // Initialize with default settings - all products active
          const defaultSettings = GOLD_PRODUCTS.map(product => ({
            ...product,
            isActive: true
          }));
          setProducts(defaultSettings);
          localStorage.setItem('goldProductSettings', JSON.stringify(defaultSettings));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load product settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  if (!user || user.role !== 'admin') {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <Card className={theme === 'dark' ? 'bg-[#151515] border-[#2A2A2A]' : ''}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-12 w-12 text-orange-500 mb-4" />
            <h2 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Access Denied</h2>
            <p className={`text-center max-w-md ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Only administrators have access to product settings.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const handleToggleProduct = async (productId: number) => {
    try {
      const updatedProducts = products.map(product => 
        product.id === productId 
          ? { ...product, isActive: !product.isActive }
          : product
      );
      setProducts(updatedProducts);
      localStorage.setItem('goldProductSettings', JSON.stringify(updatedProducts));
      
      // Force reload prices after toggling
      window.location.reload();
      
      toast.success('Product status updated successfully');
    } catch (error) {
      console.error('Error updating product status:', error);
      toast.error('Failed to update product status');
    }
  };

  if (loading) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="text-center">Loading...</div>
      </section>
    );
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className={`text-lg lg:text-2xl font-medium mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        กำหนดสินค้า
      </h1>

      <Card className={theme === 'dark' ? 'bg-[#151515] border-[#2A2A2A]' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-orange-500" />
            <span className={theme === 'dark' ? 'text-white' : ''}>Gold Products</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {products.map((product) => (
              <div
                key={product.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-[#1a1a1a] border-[#2A2A2A] hover:bg-[#202020]' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div>
                  <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : ''}`}>
                    {product.name}
                  </h3>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <Switch
                    id={`product-${product.id}`}
                    checked={product.isActive}
                    onChange={() => handleToggleProduct(product.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}