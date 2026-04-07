import React, { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { useData } from '../../hooks/useData.ts';
import StatCard from '../shared/StatCard.tsx';
import { UsersIcon, PackageIcon, BoxIcon, CheckSquareIcon, PlusIcon, DollarSignIcon, CalendarIcon } from '../icons/Icons.tsx';
import { StockStatus, OrderStatus, Page, BookingStatus } from '../../types.ts';

// The Pie component from recharts has incorrect typings for some props, so we cast it to include them.
const PieWithActiveIndex = Pie as React.ComponentType<React.ComponentProps<typeof Pie> & { activeIndex: number }>;

const COLORS = {
    [StockStatus.Available]: '#22C55E', // green-500
    [StockStatus.Reserved]: '#F59E0B', // amber-500
    [StockStatus.Sold]: '#EF4444', // red-500
};

// Custom shape for the active pie segment
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#334155" className="font-bold text-lg">
        {payload.value}
      </text>
       <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748b" className="text-sm">
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

// Custom tooltip for Bar Chart
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-800 mb-1">{label}</p>
        {payload.map((pld: any) => (
            <p key={pld.dataKey} style={{ color: pld.fill }} className="text-sm">{`${pld.name}: ${pld.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
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
    return Math.floor(seconds) + " seconds ago";
};

const AdminDashboard: React.FC<{ setActivePage: (page: Page, state?: any) => void; }> = ({ setActivePage }) => {
    const { dealers, products, stock, stockOrders, bookings } = useData();
    const [activeIndex, setActiveIndex] = useState(0);

    const onPieEnter = useCallback((_: any, index: number) => {
        setActiveIndex(index);
    }, []);
    
    const onPieClick = useCallback((data: any) => {
        if (data && data.name) {
            setActivePage('CompanyStock', { status: data.name as StockStatus });
        }
    }, [setActivePage]);

    const stats = useMemo(() => {
        const findProductInfo = (variantId: string) => {
            for (const product of products) {
                const variant = product.variants.find(v => v._id === variantId);
                if (variant) return { product, variant };
            }
            return { product: null, variant: null };
        };
        const deliveredBookings = bookings.filter(b => b.status === BookingStatus.Delivered);
        const totalRevenue = deliveredBookings.reduce((sum, booking) => {
            const { variant } = findProductInfo(booking.variantId);
            return sum + (variant?.price || 0);
        }, 0);
        
        const centralStock = stock.filter(s => s.dealerId === null);

        return {
            totalDealers: dealers.length,
            pendingRegistrations: dealers.filter(d => !d.registrationApproved).length,
            totalProducts: products.length,
            totalStock: centralStock.length,
            pendingOrders: stockOrders.filter(o => o.status === OrderStatus.Pending).length,
            totalRevenue,
            unitsSold: deliveredBookings.length,
        };
    }, [dealers, products, stock, stockOrders, bookings]);

    
    const stockByStatusData = useMemo(() => {
        const centralStock = stock.filter(s => s.dealerId === null);
        const counts = centralStock.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        }, {} as Record<StockStatus, number>);

        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [stock]);

    const monthlyActivityData = useMemo(() => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData: { [key: string]: { orders: number, bookings: number } } = {};

        stockOrders.forEach(order => {
            const date = new Date(order.requestTimestamp);
            const monthKey = `${monthNames[date.getMonth()]} '${String(date.getFullYear()).slice(2)}`;
            if (!monthlyData[monthKey]) monthlyData[monthKey] = { orders: 0, bookings: 0 };
            monthlyData[monthKey].orders += 1;
        });

        bookings.forEach(booking => {
            const date = new Date(booking.bookingTimestamp);
            const monthKey = `${monthNames[date.getMonth()]} '${String(date.getFullYear()).slice(2)}`;
            if (!monthlyData[monthKey]) monthlyData[monthKey] = { orders: 0, bookings: 0 };
            monthlyData[monthKey].bookings += 1;
        });

        const last6Months: {name: string, orders: number, bookings: number}[] = [];
        const d = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(d.getFullYear(), d.getMonth() - i, 1);
            const monthKey = `${monthNames[date.getMonth()]} '${String(date.getFullYear()).slice(2)}`;
            last6Months.push({ name: monthKey, ...monthlyData[monthKey] || { orders: 0, bookings: 0 } });
        }
        
        return last6Months;
    }, [stockOrders, bookings]);

    const activityFeedData = useMemo(() => {
        const dealerActivities = dealers.map(d => ({
            type: 'dealer',
            id: d._id,
            text: `New dealer registered: ${d.name}`,
            date: new Date(d.createdAt),
            icon: <UsersIcon className="w-5 h-5 text-blue-500" />
        }));
        const orderActivities = stockOrders.map(o => ({
            type: 'order',
            id: o._id,
            text: `New stock order from ${dealers.find(d => d._id === o.dealerId)?.name || 'a dealer'}`,
            date: new Date(o.requestTimestamp),
            icon: <CheckSquareIcon className="w-5 h-5 text-yellow-500" />
        }));
        const bookingActivities = bookings.map(b => ({
            type: 'booking',
            id: b._id,
            text: `New customer booking by ${dealers.find(d => d._id === b.dealerId)?.name || 'a dealer'}`,
            date: new Date(b.bookingTimestamp),
            icon: <CalendarIcon className="w-5 h-5 text-green-500" />
        }));

        return [...dealerActivities, ...orderActivities, ...bookingActivities]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 5);
    }, [dealers, stockOrders, bookings]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-3xl font-bold text-slate-800">Dashboard Overview</h2>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setActivePage('Dealers')} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
                        <PlusIcon /> <span>Add Dealer</span>
                    </button>
                    <button onClick={() => setActivePage('Products')} className="flex items-center space-x-2 py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                        <PlusIcon /> <span>Add Product</span>
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                <StatCard title="Total Dealers" value={stats.totalDealers.toString()} icon={<UsersIcon />} color="bg-blue-500" onClick={() => setActivePage('Dealers')} />
                <StatCard title="Pending Registrations" value={stats.pendingRegistrations.toString()} icon={<UsersIcon />} color="bg-cyan-500" onClick={() => setActivePage('Dealers', { status: 'pending' })} />
                <StatCard title="Total Revenue" value={`Rs. ${stats.totalRevenue.toLocaleString()}`} icon={<DollarSignIcon />} color="bg-green-500" />
                <StatCard title="Units Sold" value={stats.unitsSold.toString()} icon={<PackageIcon />} color="bg-teal-500" />
                <StatCard title="Product Lines" value={stats.totalProducts.toString()} icon={<PackageIcon />} color="bg-violet-500" onClick={() => setActivePage('Products')} />
                <StatCard title="Units in Central Stock" value={stats.totalStock.toString()} icon={<BoxIcon />} color="bg-amber-500" onClick={() => setActivePage('CompanyStock')} />
                <StatCard title="Pending Orders" value={stats.pendingOrders.toString()} icon={<CheckSquareIcon />} color="bg-red-500" onClick={() => setActivePage('Approvals')} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-4">Monthly Orders vs. Bookings</h3>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <BarChart data={monthlyActivityData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <RechartsTooltip cursor={{ fill: 'rgba(241, 245, 249, 0.8)' }} content={<CustomBarTooltip />} />
                                <Legend wrapperStyle={{fontSize: "14px", paddingTop: '10px'}}/>
                                <Bar dataKey="orders" fill="#3B82F6" name="New Dealer Orders" barSize={20} radius={[4, 4, 0, 0]}/>
                                <Bar dataKey="bookings" fill="#10B981" name="New Customer Bookings" barSize={20} radius={[4, 4, 0, 0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <h3 className="font-semibold text-slate-800 mb-4">Recent Activity</h3>
                        <ul className="space-y-4">
                            {activityFeedData.map(item => (
                                <li key={item.id} className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">{item.icon}</div>
                                    <div>
                                        <p className="text-sm text-slate-700">{item.text}</p>
                                        <p className="text-xs text-slate-400">{formatRelativeTime(item.date.toISOString())}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                     <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center">
                        <h3 className="font-semibold text-slate-800 mb-4 self-start">Central Stock by Status</h3>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <PieWithActiveIndex
                                        activeIndex={activeIndex}
                                        activeShape={renderActiveShape}
                                        data={stockByStatusData}
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                                        fill="#8884d8" dataKey="value" nameKey="name"
                                        onMouseEnter={onPieEnter} onClick={onPieClick} className="cursor-pointer"
                                    >
                                        {stockByStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as StockStatus]} />
                                        ))}
                                    </PieWithActiveIndex>
                                    <RechartsTooltip wrapperStyle={{ visibility: 'hidden' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
