import React, { useMemo, useCallback, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { useData } from '../../../hooks/useData.ts';
import { useAuth } from '../../../hooks/useAuth.ts';
import StatCard from '../../shared/StatCard.tsx';
import { PackageIcon, BoxIcon, CalendarIcon, DollarSignIcon, PrintIcon, MegaphoneIcon } from '../../icons/Icons.tsx';
import { OrderStatus, StockStatus, BookingStatus, Product, ProductVariant, DealerPage } from '../../../types.ts';
import { printElementById } from '../../../utils/print.ts';

// Fix for Recharts generic type issues in strict TypeScript environments
const PieAny = Pie as any;

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#334155" className="font-bold text-lg dark:fill-slate-200">
        {payload.value}
      </text>
       <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748b" className="text-sm dark:fill-slate-400">
        Units
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <text x={cx} y={cy + outerRadius + 25} textAnchor="middle" fill={fill} className="font-semibold">
        {`${payload.name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    </g>
  );
};

const formatRelativeTime = (date: Date) => {
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};

const DealerDashboard: React.FC<{ setActivePage: (page: DealerPage, state?: any) => void; }> = ({ setActivePage }) => {
    const { user } = useAuth();
    const { stockOrders, stock, products, bookings, announcements, announcementRecipients } = useData();
    const [activeIndex, setActiveIndex] = useState(0);

    const onPieEnter = useCallback((_: any, index: number) => {
        setActiveIndex(index);
    }, []);
    
    const findProductInfo = (variantId: string): { product: Product | null, variant: ProductVariant | null } => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) return { product, variant };
        }
        return { product: null, variant: null };
    };

    const dealerData = useMemo(() => {
        if (!user?.dealerId) return { totalStockValue: 0, pendingStockOrders: 0, availableStock: 0, stockByCategory: [], lastQuarterRevenue: 0, lastQuarterUnitsSold: 0, quarterlySalesTrendData: [], totalBookings: 0 };

        const myOrders = stockOrders.filter(o => o.dealerId === user.dealerId);
        const myStock = stock.filter(s => s.dealerId === user.dealerId);
        const myBookings = bookings.filter(b => b.dealerId === user.dealerId);

        const totalStockValue = myStock.reduce((sum, stockItem) => {
            const { variant } = findProductInfo(stockItem.variantId);
            return sum + (variant?.price || 0);
        }, 0);

        const stockByCategory = myStock.reduce((acc, item) => {
            const { product } = findProductInfo(item.variantId);
            if (product) {
                acc[product.modelName] = (acc[product.modelName] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        // --- Sales Performance Data ---
        const deliveredBookings = myBookings.filter(b => b.status === BookingStatus.Delivered);
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const lastQuarterBookings = deliveredBookings.filter(b => new Date(b.bookingTimestamp) >= ninetyDaysAgo);

        const lastQuarterRevenue = lastQuarterBookings.reduce((sum, booking) => {
            const { variant } = findProductInfo(booking.variantId);
            return sum + (variant?.price || 0);
        }, 0);

        const lastQuarterUnitsSold = lastQuarterBookings.length;
        
        const weeklySales: Record<string, { revenue: number, units: number }> = {};
        const today = new Date();
        today.setDate(today.getDate() - today.getDay());
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 13; i++) {
            const weekStartDate = new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const weekKey = weekStartDate.toISOString().split('T')[0];
            weeklySales[weekKey] = { revenue: 0, units: 0 };
        }

        lastQuarterBookings.forEach(booking => {
            const bookingDate = new Date(booking.bookingTimestamp);
            bookingDate.setDate(bookingDate.getDate() - bookingDate.getDay());
            bookingDate.setHours(0, 0, 0, 0);
            const weekKey = bookingDate.toISOString().split('T')[0];

            if (weeklySales[weekKey]) {
                const { variant } = findProductInfo(booking.variantId);
                weeklySales[weekKey].revenue += variant?.price || 0;
                weeklySales[weekKey].units += 1;
            }
        });

        const quarterlySalesTrendData = Object.keys(weeklySales)
            .sort((a,b) => new Date(a).getTime() - new Date(b).getTime())
            .map(weekKey => ({
                name: new Date(weekKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric'}),
                revenue: weeklySales[weekKey].revenue,
                units: weeklySales[weekKey].units,
            }));

        return {
            totalStockValue,
            pendingStockOrders: myOrders.filter(o => o.status === OrderStatus.Pending).length,
            availableStock: myStock.filter(s => s.status === StockStatus.Available).length,
            stockByCategory: Object.entries(stockByCategory).map(([name, count]) => ({ name, count })),
            lastQuarterRevenue,
            lastQuarterUnitsSold,
            quarterlySalesTrendData,
            totalBookings: myBookings.length,
        };
    }, [user, stockOrders, stock, products, bookings]);

    const recentActivity = useMemo(() => {
        if (!user?.dealerId) return [];
        const activities = [];

        // Orders
        stockOrders
            .filter(o => o.dealerId === user.dealerId)
            .forEach(o => {
                activities.push({
                    id: o._id,
                    type: 'order',
                    date: new Date(o.requestTimestamp),
                    title: 'Stock Order Placed',
                    description: `${o.items.length} items requested`,
                    icon: <PackageIcon className="w-4 h-4 text-blue-500" />
                });
            });

        // Bookings
        bookings
            .filter(b => b.dealerId === user.dealerId)
            .forEach(b => {
                activities.push({
                    id: b._id,
                    type: 'booking',
                    date: new Date(b.bookingTimestamp),
                    title: 'New Customer Booking',
                    description: `For ${b.customerName}`,
                    icon: <CalendarIcon className="w-4 h-4 text-green-500" />
                });
            });

        // Announcements (filtered by recipient)
        const myRecipientRecords = announcementRecipients.filter(r => r.userId === user._id);
        const myAnnouncementIds = new Set(myRecipientRecords.map(r => r.announcementId));
        
        announcements
            .filter(a => myAnnouncementIds.has(a._id))
            .forEach(a => {
                 activities.push({
                    id: a._id,
                    type: 'announcement',
                    date: new Date(a.timestamp),
                    title: 'Announcement',
                    description: a.subject,
                    icon: <MegaphoneIcon className="w-4 h-4 text-yellow-500" />
                });
            });

        return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 7);
    }, [stockOrders, bookings, announcements, announcementRecipients, user]);
    
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

    return (
        <div id="dealer-dashboard-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">My Dashboard</h2>
                <button onClick={() => printElementById('dealer-dashboard-content')} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
                    <PrintIcon />
                    <span>Print Dashboard</span>
                </button>
            </div>
             <div className="hidden print-only">
                <h1 className="text-2xl font-bold mb-1">Dealer Dashboard</h1>
                <p className="text-sm text-slate-600 mb-4">Generated on: {new Date().toLocaleDateString()}</p>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Stock Value" value={`Rs. ${dealerData.totalStockValue.toLocaleString()}`} icon={<DollarSignIcon />} color="bg-green-500" />
                <StatCard title="Pending Orders" value={dealerData.pendingStockOrders.toString()} icon={<PackageIcon />} color="bg-yellow-500" onClick={() => setActivePage('My Orders')} />
                <StatCard title="Available Stock" value={dealerData.availableStock.toString()} icon={<BoxIcon />} color="bg-blue-500" onClick={() => setActivePage('My Stock')} />
                <StatCard title="Total Bookings" value={dealerData.totalBookings.toString()} icon={<CalendarIcon />} color="bg-indigo-500" onClick={() => setActivePage('My Bookings')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Sales Performance (Last 90 Days)</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6 border-b pb-4 border-slate-200 dark:border-slate-700">
                        <div className="text-left">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">Rs. {dealerData.lastQuarterRevenue.toLocaleString()}</p>
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Units Sold</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{dealerData.lastQuarterUnitsSold}</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dealerData.quarterlySalesTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickFormatter={(value) => `Rs ${Number(value / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                            <RechartsTooltip formatter={(value: number) => `Rs. ${value.toLocaleString()}`} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Legend wrapperStyle={{fontSize: "12px", paddingTop: "10px"}} verticalAlign="top" align="right" />
                            <Line type="monotone" dataKey="revenue" name="Weekly Revenue" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Recent Activity</h3>
                        <ul className="space-y-4">
                            {recentActivity.map(item => (
                                <li key={`${item.type}-${item.id}`} className="flex gap-3 items-start">
                                    <div className="mt-1 bg-slate-50 dark:bg-slate-700 p-2 rounded-full border border-slate-100 dark:border-slate-600 flex-shrink-0">
                                        {item.icon}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">{item.title}</p>
                                            <p className="text-xs text-slate-400 flex-shrink-0">{formatRelativeTime(item.date)}</p>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.description}</p>
                                    </div>
                                </li>
                            ))}
                            {recentActivity.length === 0 && (
                                <li className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No recent activity found.</li>
                            )}
                        </ul>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm flex flex-col">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Stock by Category</h3>
                        <div className="flex-grow min-h-[200px]">
                            {dealerData.stockByCategory.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <PieAny 
                                            activeIndex={activeIndex}
                                            activeShape={renderActiveShape}
                                            data={dealerData.stockByCategory} 
                                            dataKey="count" 
                                            nameKey="name" 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={60}
                                            outerRadius={80} 
                                            onMouseEnter={onPieEnter}
                                        >
                                            {dealerData.stockByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </PieAny>
                                        <RechartsTooltip contentStyle={{ display: 'none' }}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                                    No stock data available.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DealerDashboard;