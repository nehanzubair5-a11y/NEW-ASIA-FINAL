import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../../hooks/useData.ts';
import StatCard from '../shared/StatCard.tsx';
import { DollarSignIcon, BoxIcon, BarChart2Icon } from '../icons/Icons.tsx';
import { BookingStatus, Page } from '../../types.ts';

const FinanceDashboard: React.FC<{ setActivePage: (page: Page) => void }> = ({ setActivePage }) => {
    const { bookings, products } = useData();

    const findProductInfo = (variantId: string) => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) return { product, variant };
        }
        return { product: null, variant: null };
    };

    const salesReportData = useMemo(() => {
        const deliveredBookings = bookings.filter(b => b.status === BookingStatus.Delivered);
        
        const totalRevenue = deliveredBookings.reduce((sum, booking) => {
            const { variant } = findProductInfo(booking.variantId);
            return sum + (variant?.price || 0);
        }, 0);

        const unitsSold = deliveredBookings.length;
        
        const revenueOverTime = deliveredBookings.reduce((acc, booking) => {
            const groupKey = new Date(booking.bookingTimestamp).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' });
            const { variant } = findProductInfo(booking.variantId);
            const price = variant?.price || 0;
            if (!acc[groupKey]) acc[groupKey] = 0;
            acc[groupKey] += price;
            return acc;
        }, {} as Record<string, number>);

        const revenueTrendData = Object.entries(revenueOverTime)
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return { totalRevenue, unitsSold, revenueTrendData };
    }, [bookings, products]);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Finance Dashboard</h2>
                 <button onClick={() => setActivePage('Reports')} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
                    <BarChart2Icon />
                    <span>View Full Reports</span>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Total Revenue" value={`Rs. ${salesReportData.totalRevenue.toLocaleString()}`} icon={<DollarSignIcon />} color="bg-green-500" />
                <StatCard title="Total Units Sold" value={salesReportData.unitsSold.toLocaleString()} icon={<BoxIcon />} color="bg-blue-500" />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4">Revenue Trend (All Time)</h3>
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={salesReportData.revenueTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickFormatter={(value) => `Rs ${Number(value / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                        <RechartsTooltip formatter={(value: number) => `Rs. ${value.toLocaleString()}`} />
                        <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Revenue" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default FinanceDashboard;
