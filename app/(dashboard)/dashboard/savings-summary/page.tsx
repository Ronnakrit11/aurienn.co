'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, PiggyBank, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUser } from '@/lib/auth';
import { useTheme } from '@/lib/theme-provider';
import { pusherClient } from '@/lib/pusher';

interface GoldHolding {
  goldType: string;
  totalAmount: string;
  totalValue: string;
  averagePrice: string;
}

interface UserSummary {
  userId: number;
  userName: string | null;
  userEmail: string;
  userRole: string;
  goldType: string;
  totalAmount: string;
  totalValue: string;
}

interface AdminStock {
  goldType: string;
  totalAmount: string;
}

interface SummaryData {
  goldHoldings: GoldHolding[];
  userSummaries: UserSummary[];
  adminStocks: AdminStock[];
}

const BAHT_TO_GRAM = {
  'ทองสมาคม 96.5%': 15.2,
  'ทอง 99.99%': 15.244
};

const calculateGrams = (bathAmount: number, goldType: string) => {
  const conversionRate = BAHT_TO_GRAM[goldType as keyof typeof BAHT_TO_GRAM] || BAHT_TO_GRAM['ทองสมาคม 96.5%'];
  return (bathAmount * conversionRate).toFixed(2);
};

const SavingsSummaryPage = () => {
  const { user } = useUser();
  const { theme } = useTheme();
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const isDark = theme === 'dark';

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/savings-summary');
      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();

      // Subscribe to real-time updates
      const channel = pusherClient.subscribe('gold-transactions');
      
      // Listen for buy/sell transactions
      channel.bind('transaction', () => {
        fetchData();
      });

      return () => {
        channel.unbind_all();
        pusherClient.unsubscribe('gold-transactions');
      };
    }
  }, [user]);

  if (!user || user.role !== 'admin') {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <Card className={isDark ? 'bg-[#151515] border-[#2A2A2A]' : ''}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-12 w-12 text-orange-500 mb-4" />
            <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Access Denied</h2>
            <p className={`text-center max-w-md ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Only administrators have access to the savings summary.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Loading summary...
        </div>
      </section>
    );
  }

  if (!summaryData) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          No data available
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className={`text-lg lg:text-2xl font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        สรุปการออมทอง
      </h1>

      <Card className={`mb-8 ${isDark ? 'bg-[#151515] border-[#2A2A2A]' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PiggyBank className="h-6 w-6 text-orange-500" />
            <span className={isDark ? 'text-white' : ''}>สรุปรวมทั้งหมด</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {['ทองสมาคม 96.5%', 'ทอง 99.99%'].map(goldType => {
              const adminStock = summaryData.adminStocks.find(s => s.goldType === goldType);
              const userHoldings = summaryData.goldHoldings.find(h => h.goldType === goldType);
              
              const adminAmount = Number(adminStock?.totalAmount || 0);
              const userAmount = Number(userHoldings?.totalAmount || 0);
              const availableAmount = adminAmount - userAmount;

              return (
                <div key={goldType} className={`p-4 rounded-lg ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                  <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : ''}`}>
                    {goldType}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#252525]' : 'bg-white'}`}>
                      <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        จำนวนรวม (Stock)
                      </h4>
                      <div className={`space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <p>{adminAmount.toFixed(4)} บาท</p>
                        <p>({calculateGrams(adminAmount, goldType)} กรัม)</p>
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#252525]' : 'bg-white'}`}>
                      <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        ลูกค้าถือครองทั้งหมด
                      </h4>
                      <div className={`space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <p>{userAmount.toFixed(4)} บาท</p>
                        <p>({calculateGrams(userAmount, goldType)} กรัม)</p>
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${isDark ? 'bg-[#252525]' : 'bg-white'}`}>
                      <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        คงเหลือ
                      </h4>
                      <div className={`space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <p>{availableAmount.toFixed(4)} บาท</p>
                        <p>({calculateGrams(availableAmount, goldType)} กรัม)</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* User-specific Summaries */}
      <Card className={isDark ? 'bg-[#151515] border-[#2A2A2A]' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-orange-500" />
            <span className={isDark ? 'text-white' : ''}>สรุปรายบุคคล</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {summaryData.userSummaries.map((summary) => (
              <div
                key={`${summary.userId}-${summary.goldType}`}
                className={`p-4 border rounded-lg ${
                  isDark ? 'border-[#2A2A2A] bg-[#1a1a1a]' : 'border-gray-200'
                }`}
              >
                <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : ''}`}>
                  {summary.userName || summary.userEmail}
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className={`p-3 rounded-lg ${isDark ? 'bg-[#252525]' : 'bg-gray-50'}`}>
                    <p className={`font-medium mb-2 ${isDark ? 'text-white' : ''}`}>
                      {summary.goldType}
                    </p>
                    <div className={`space-y-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <p>จำนวน: {Number(summary.totalAmount).toFixed(4)} บาท</p>
                      <p>({calculateGrams(Number(summary.totalAmount), summary.goldType)} กรัม)</p>
                      <p>มูลค่า: ฿{Number(summary.totalValue).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default SavingsSummaryPage;