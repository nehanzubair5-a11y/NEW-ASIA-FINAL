import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Sector } from 'recharts';
import { useData } from '../../hooks/useData.ts';
import StatCard from '../shared/StatCard.tsx';
import { DownloadIcon, DollarSignIcon, BoxIcon, UsersIcon, PrintIcon, ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon, XCircleIcon, CalendarIcon, PackageIcon } from '../icons/Icons.tsx';
import { BookingStatus, StockStatus } from '../../types.ts';
import SkeletonLoader from '../shared/SkeletonLoader.tsx';
import { printElementById, exportToCsv } from '../../utils/print.ts';
import CustomReports from './CustomReports.tsx';
import usePagination from '../../hooks/usePagination.ts';
import Pagination from '../shared/Pagination.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import ScheduleReportModal from '../modals/ScheduleReportModal.tsx';

type ReportTab = 'sales' | 'inventory' | 'dealer' | 'custom';
type DateRange = 'all' | '30d' | '90d';
type InventorySortableKey = 'VIN' | 'Product' | 'Holder' | 'Status' | 'Assigned';
type SalesSortableKey = 'Date' | 'Customer' | 'Product' | 'Dealer' | 'Price';
type DealerSortableKey = 'Dealer' | 'City' | 'Reputation' | 'UnitsSold' | 'TotalRevenue' | 'CommissionEarned';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];
const PIE_COLORS = {
    [StockStatus.Available]: '#22C55E', // green-500
    [StockStatus.Reserved]: '#F59E0B', // amber-500
    [StockStatus.Sold]: '#EF4444', // red-500
};

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
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
      <text x={cx} y={cy + outerRadius + 25} textAnchor="middle" fill={fill} className="font-semibold">
        {`${payload.name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    </g>
  );
};

// FIX: Cast Pie to a component type that accepts activeIndex to resolve recharts typing issue.
const PieWithActiveIndex = Pie as React.ComponentType<React.ComponentProps<typeof Pie> & { activeIndex: number }>;

const SortIndicator = ({ active, direction }: { active: boolean; direction: 'ascending' | 'descending' }) => {
    if (!active) return <ChevronsUpDownIcon className="w-4 h-4 text-slate-400" />;
    if (direction === 'ascending') return <ChevronUpIcon className="w-4 h-4" />;
    return <ChevronDownIcon className="w-4 h-4" />;
};

const Reports: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { bookings, stock, products, dealers, isLoading } = useData();
    const [activeTab, setActiveTab] = useState<ReportTab>('sales');
    const [dateRange, setDateRange] = useState<DateRange>('all');
    const [isChartLoading, setIsChartLoading] = useState(true);
    const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
    
    // Inventory State
    const [inventoryPieIndex, setInventoryPieIndex] = useState(-1);
    const [inventoryStatusFilter, setInventoryStatusFilter] = useState<StockStatus | 'all'>('all');
    const [inventorySearch, setInventorySearch] = useState('');
    const [inventorySortConfig, setInventorySortConfig] = useState<{ key: InventorySortableKey; direction: 'ascending' | 'descending' } | null>(null);
    
    // Sales State
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [salesSortConfig, setSalesSortConfig] = useState<{ key: SalesSortableKey; direction: 'ascending' | 'descending' } | null>(null);

    // Dealer State
    const [dealerSortConfig, setDealerSortConfig] = useState<{ key: DealerSortableKey; direction: 'ascending' | 'descending' } | null>(null);

    useEffect(() => {
        setIsChartLoading(true);
        // Simulate chart data loading
        const timer = setTimeout(() => setIsChartLoading(false), 500);
        return () => clearTimeout(timer);
    }, [dateRange, activeTab]);

    const dateFilteredBookings = useMemo(() => {
        if (dateRange === 'all') return bookings;
        const now = Date.now();
        const days = dateRange === '30d' ? 30 : 90;
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        return bookings.filter(b => new Date(b.bookingTimestamp).getTime() >= cutoff);
    }, [bookings, dateRange]);
    
    const findProductInfo = (variantId: string) => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) return { product, variant };
        }
        return { product: null, variant: null };
    };

    const salesReportData = useMemo(() => {
        const deliveredBookings = dateFilteredBookings.filter(b => b.status === BookingStatus.Delivered);
        
        const totalRevenue = deliveredBookings.reduce((sum, booking) => {
            const { variant } = findProductInfo(booking.variantId);
            return sum + (variant?.price || 0);
        }, 0);

        const unitsSold = deliveredBookings.length;
        
        const salesByCategory = deliveredBookings.reduce((acc, booking) => {
            const { product } = findProductInfo(booking.variantId);
            if (product) {
                acc[product.modelName] = (acc[product.modelName] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        let groupingFormat: 'day' | 'week' | 'month' = 'month';
        if (dateRange === '30d') groupingFormat = 'day';
        if (dateRange === '90d') groupingFormat = 'week';

        const getGroupKey = (date: Date) => {
            if (groupingFormat === 'day') return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
            if (groupingFormat === 'week') {
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - date.getDay());
                return startOfWeek.toLocaleDateString('en-CA');
            }
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        };

        const revenueOverTime = deliveredBookings.reduce((acc, booking) => {
            const groupKey = getGroupKey(new Date(booking.bookingTimestamp));
            const { variant } = findProductInfo(booking.variantId);
            const price = variant?.price || 0;
            if (!acc[groupKey]) {
                acc[groupKey] = 0;
            }
            acc[groupKey] += price;
            return acc;
        }, {} as Record<string, number>);

        const revenueTrendData = Object.entries(revenueOverTime)
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


        const tableData = deliveredBookings.map(b => {
            const { product, variant } = findProductInfo(b.variantId);
            const dealer = dealers.find(d => d._id === b.dealerId);
            return {
                Date: new Date(b.bookingTimestamp).toLocaleDateString(),
                Customer: b.customerName,
                Product: `${product?.modelName} (${variant?.name})`,
                Dealer: dealer?.name,
                Price: variant?.price || 0,
                // Hidden raw fields for sorting
                _rawDate: new Date(b.bookingTimestamp).getTime(),
                _rawPrice: variant?.price || 0
            };
        });

        const averageRevenuePerUnit = unitsSold > 0 ? totalRevenue / unitsSold : 0;
        
        const now = Date.now();
        const allDeliveredBookings = bookings.filter(b => b.status === BookingStatus.Delivered);

        // 30-day stats
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        const last30DaysBookings = allDeliveredBookings.filter(b => new Date(b.bookingTimestamp).getTime() >= thirtyDaysAgo);
        const last30DaysRevenue = last30DaysBookings.reduce((sum, b) => sum + (findProductInfo(b.variantId).variant?.price || 0), 0);
        const last30DaysUnitsSold = last30DaysBookings.length;

        // 90-day stats
        const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
        const last90DaysBookings = allDeliveredBookings.filter(b => new Date(b.bookingTimestamp).getTime() >= ninetyDaysAgo);
        const last90DaysRevenue = last90DaysBookings.reduce((sum, b) => sum + (findProductInfo(b.variantId).variant?.price || 0), 0);
        const last90DaysUnitsSold = last90DaysBookings.length;

        const newBookingsLast30d = bookings.filter(b => new Date(b.bookingTimestamp).getTime() >= thirtyDaysAgo).length;

        return {
            totalRevenue,
            unitsSold,
            salesByCategory: Object.entries(salesByCategory).map(([name, units]) => ({ name, units })),
            tableData,
            revenueTrendData,
            averageRevenuePerUnit,
            newBookingsLast30d,
            last30DaysRevenue,
            last30DaysUnitsSold,
            last90DaysRevenue,
            last90DaysUnitsSold,
        };
    }, [dateFilteredBookings, products, dealers, dateRange, bookings]);
    
    const displayedSalesTableData = useMemo(() => {
        let data = [...salesReportData.tableData];

        if (categoryFilter) {
            data = data.filter(row => {
                const productModelName = row.Product.split(' (')[0];
                return productModelName.includes(categoryFilter);
            });
        }

        if (salesSortConfig !== null) {
            data.sort((a, b) => {
                // Use raw values if available, otherwise use key directly
                const key = salesSortConfig.key as keyof typeof a;
                // FIX: Ensure key is converted to string to avoid symbol conversion error
                const rawKey = `_raw${String(key)}` as keyof typeof a;
                const aValue = a[rawKey] !== undefined ? a[rawKey] : a[key];
                const bValue = b[rawKey] !== undefined ? b[rawKey] : b[key];

                if (aValue < bValue) return salesSortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return salesSortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [categoryFilter, salesReportData.tableData, salesSortConfig]);

    const requestSalesSort = (key: SalesSortableKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (salesSortConfig && salesSortConfig.key === key && salesSortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSalesSortConfig({ key, direction });
    };

    const handleSalesExport = () => {
        // Strip _raw keys before export
        const cleanData = displayedSalesTableData.map(({ _rawDate, _rawPrice, ...rest }) => rest);
        exportToCsv('sales_report.csv', cleanData);
    };

    const inventoryReportData = useMemo(() => {
        const totalStockValue = stock.reduce((sum, item) => {
            const { variant } = findProductInfo(item.variantId);
            return sum + (variant?.price || 0);
        }, 0);
        
        const stockByStatus = stock.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        }, {} as Record<StockStatus, number>);

        const tableData = stock.map(item => {
            const { product, variant } = findProductInfo(item.variantId);
            const holder = dealers.find(d => d._id === item.dealerId)?.name || 'Central Stock';
            return {
                VIN: item.vin,
                Product: `${product?.modelName} (${variant?.name})`,
                Holder: holder,
                Status: item.status,
                Assigned: new Date(item.assignedAt).toLocaleDateString(),
            };
        });

        const now = Date.now();
        const inventoryAgeBuckets = {
            '0-30 Days': 0,
            '31-60 Days': 0,
            '61-90 Days': 0,
            '91+ Days': 0,
        };
        stock.forEach(item => {
            if (item.status === StockStatus.Available || item.status === StockStatus.Reserved) {
                const ageInDays = (now - new Date(item.assignedAt).getTime()) / (1000 * 60 * 60 * 24);
                if (ageInDays <= 30) inventoryAgeBuckets['0-30 Days']++;
                else if (ageInDays <= 60) inventoryAgeBuckets['31-60 Days']++;
                else if (ageInDays <= 90) inventoryAgeBuckets['61-90 Days']++;
                else inventoryAgeBuckets['91+ Days']++;
            }
        });
        const inventoryAgeData = Object.entries(inventoryAgeBuckets).map(([name, value]) => ({ name, value }));

        return {
            totalUnits: stock.length,
            totalStockValue,
            stockByStatus: Object.entries(stockByStatus).map(([name, value]) => ({ name, value })),
            tableData,
            inventoryAgeData,
        };
    }, [stock, products, dealers]);
    
    const processedInventoryTableData = useMemo(() => {
        let filtered = inventoryReportData.tableData;

        if (inventoryStatusFilter !== 'all') {
            filtered = filtered.filter(item => item.Status === inventoryStatusFilter);
        }

        if (inventorySearch) {
            const lowercasedQuery = inventorySearch.toLowerCase();
            filtered = filtered.filter(item => 
                item.VIN.toLowerCase().includes(lowercasedQuery) ||
                item.Product.toLowerCase().includes(lowercasedQuery) ||
                item.Holder.toLowerCase().includes(lowercasedQuery)
            );
        }

        if (inventorySortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = a[inventorySortConfig.key as keyof typeof a];
                const bValue = b[inventorySortConfig.key as keyof typeof b];
                if (aValue < bValue) {
                    return inventorySortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return inventorySortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filtered;
    }, [inventoryReportData.tableData, inventoryStatusFilter, inventorySearch, inventorySortConfig]);
    
    const { paginatedData: paginatedInventory, currentPage: inventoryCurrentPage, totalPages: inventoryTotalPages, nextPage: inventoryNextPage, prevPage: inventoryPrevPage, setCurrentPage: setInventoryCurrentPage } = usePagination(processedInventoryTableData, 10);
    
    const requestInventorySort = (key: InventorySortableKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (inventorySortConfig && inventorySortConfig.key === key && inventorySortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setInventorySortConfig({ key, direction });
    };

    const handlePieClick = useCallback((data: any, index: number) => {
        const clickedStatus = data.name as StockStatus;
        // If clicking the active slice, reset the filter
        if (index === inventoryPieIndex) {
            setInventoryPieIndex(-1);
            setInventoryStatusFilter('all');
        } else {
            setInventoryPieIndex(index);
            setInventoryStatusFilter(clickedStatus);
        }
        setInventoryCurrentPage(1);
    }, [inventoryPieIndex, setInventoryCurrentPage]);

    const handleCategoryClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const clickedCategory = data.activePayload[0].payload.name;
            setCategoryFilter(prev => (prev === clickedCategory ? null : clickedCategory));
        }
    };

    const dealerReportData = useMemo(() => {
        const deliveredBookings = dateFilteredBookings.filter(b => b.status === BookingStatus.Delivered);
        
        const salesByDealer = deliveredBookings.reduce((acc, booking) => {
            const dealerId = booking.dealerId;
            const { variant } = findProductInfo(booking.variantId);
            const price = variant?.price || 0;
            
            if (!acc[dealerId]) {
                acc[dealerId] = { revenue: 0, units: 0 };
            }
            acc[dealerId].revenue += price;
            acc[dealerId].units += 1;
            return acc;
        }, {} as Record<string, { revenue: number, units: number }>);

        const COMMISSION_RATE = 0.01;

        const tableData = dealers.map(dealer => ({
            Dealer: dealer.name,
            City: dealer.city,
            Reputation: dealer.reputationScore, // Keep as number for sorting
            UnitsSold: salesByDealer[dealer._id]?.units || 0,
            TotalRevenue: salesByDealer[dealer._id]?.revenue || 0,
            CommissionEarned: (salesByDealer[dealer._id]?.revenue || 0) * COMMISSION_RATE,
        }));
        
        const chartData = tableData.filter(d => d.TotalRevenue > 0)
            .sort((a, b) => b.TotalRevenue - a.TotalRevenue)
            .slice(0, 10);

        return { tableData, chartData };
    }, [dateFilteredBookings, dealers, products]);

    const processedDealerTableData = useMemo(() => {
        let data = [...dealerReportData.tableData];
        if (dealerSortConfig !== null) {
            data.sort((a, b) => {
                const aValue = a[dealerSortConfig.key];
                const bValue = b[dealerSortConfig.key];
                
                // Enhanced string sorting
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return dealerSortConfig.direction === 'ascending' 
                        ? aValue.localeCompare(bValue) 
                        : bValue.localeCompare(aValue);
                }

                if (aValue < bValue) return dealerSortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return dealerSortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [dealerReportData.tableData, dealerSortConfig]);

    const requestDealerSort = (key: DealerSortableKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (dealerSortConfig && dealerSortConfig.key === key && dealerSortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setDealerSortConfig({ key, direction });
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-6">
                    <SkeletonLoader type="cards" cols={2} />
                    <SkeletonLoader type="table" rows={4} />
                    <SkeletonLoader type="table" rows={4} />
                </div>
            );
        }
        switch (activeTab) {
            case 'sales':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="Total Revenue" value={`Rs. ${salesReportData.totalRevenue.toLocaleString()}`} icon={<DollarSignIcon />} color="bg-green-500" />
                            <StatCard title="Total Units Sold" value={salesReportData.unitsSold.toLocaleString()} icon={<PackageIcon />} color="bg-blue-500" />
                            <StatCard title="Avg. Revenue / Unit" value={`Rs. ${salesReportData.averageRevenuePerUnit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<DollarSignIcon />} color="bg-teal-500" />
                            <StatCard title="New Bookings (Last 30d)" value={salesReportData.newBookingsLast30d.toLocaleString()} icon={<CalendarIcon />} color="bg-violet-500" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 text-lg">Summary (Last 30 Days)</h3>
                                <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Total Revenue:</span>
                                        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">Rs. {salesReportData.last30DaysRevenue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Units Sold:</span>
                                        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{salesReportData.last30DaysUnitsSold.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 text-lg">Summary (Last 90 Days)</h3>
                                <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Total Revenue:</span>
                                        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">Rs. {salesReportData.last90DaysRevenue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Units Sold:</span>
                                        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{salesReportData.last90DaysUnitsSold.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Revenue Trend</h3>
                                {isChartLoading ? (
                                    <div className="h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                                ) : salesReportData.revenueTrendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={salesReportData.revenueTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis 
                                                dataKey="date" 
                                                fontSize={12} 
                                                tickFormatter={(tick) => {
                                                    const date = new Date(tick);
                                                    date.setDate(date.getDate() + 1);
                                                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis 
                                                fontSize={12} 
                                                tickFormatter={(value) => `Rs ${Number(value / 1000).toFixed(0)}k`}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <RechartsTooltip formatter={(value: number) => `Rs. ${value.toLocaleString()}`} />
                                            <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Total Revenue" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[300px] flex items-center justify-center">
                                        <p className="text-slate-500">No sales data for this period.</p>
                                    </div>
                                )}
                            </div>
                            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Sales by Category</h3>
                                {isChartLoading ? (
                                    <div className="h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                                ) : salesReportData.salesByCategory.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={salesReportData.salesByCategory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} onClick={handleCategoryClick} className="cursor-pointer">
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                            <RechartsTooltip formatter={(value: number) => `${value.toLocaleString()} units`} />
                                            <Bar dataKey="units" name="Units Sold" radius={[4, 4, 0, 0]}>
                                                {salesReportData.salesByCategory.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={!categoryFilter || categoryFilter === entry.name ? 1 : 0.4} className="transition-opacity" />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[300px] flex items-center justify-center">
                                        <p className="text-slate-500">No sales data for this period.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                             <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Sales Transactions</h3>
                                    {categoryFilter && (
                                        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700 pl-3 pr-2 py-1 rounded-full text-sm no-print">
                                            <span>Filtering by: <span className="font-semibold">{categoryFilter}</span></span>
                                            <button onClick={() => setCategoryFilter(null)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                                                <XCircleIcon className="w-4 h-4 text-slate-500" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button onClick={handleSalesExport} className="flex items-center space-x-2 text-sm text-primary font-semibold hover:underline no-print">
                                    <DownloadIcon className="w-4 h-4" /> <span>Export CSV</span>
                                </button>
                             </div>
                             <div className="overflow-x-auto max-h-96">
                                {displayedSalesTableData.length > 0 ? (
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-100/80 dark:bg-slate-700/50 sticky top-0">
                                            <tr>
                                                {(['Date', 'Customer', 'Product', 'Dealer', 'Price'] as SalesSortableKey[]).map(key => (
                                                    <th key={key} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                        <button onClick={() => requestSalesSort(key)} className="flex items-center space-x-1 group">
                                                            <span>{key}</span>
                                                            <SortIndicator active={salesSortConfig?.key === key} direction={salesSortConfig?.direction || 'ascending'} />
                                                        </button>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                            {displayedSalesTableData.map((row, i) => (
                                                <tr key={i}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{row.Date}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{row.Customer}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{row.Product}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{row.Dealer}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{row.Price.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-slate-500">No transactions match the category "{categoryFilter}".</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>
                );
            case 'inventory':
                 return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Stock by Status</h3>
                                 <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <PieWithActiveIndex 
                                            activeIndex={inventoryPieIndex}
                                            activeShape={renderActiveShape}
                                            data={inventoryReportData.stockByStatus} 
                                            dataKey="value" 
                                            nameKey="name" 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={80} 
                                            outerRadius={100}
                                            onClick={handlePieClick}
                                            onMouseEnter={(_, index) => setInventoryPieIndex(index)}
                                            className="cursor-pointer"
                                        >
                                            {inventoryReportData.stockByStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name as StockStatus] || COLORS[index % COLORS.length]} />)}
                                        </PieWithActiveIndex>
                                        <RechartsTooltip contentStyle={{ display: 'none' }}/>
                                        <Legend onClick={(data) => handlePieClick(data, inventoryReportData.stockByStatus.findIndex(e => e.name === data.value))} wrapperStyle={{cursor: 'pointer'}} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Inventory Aging</h3>
                                 <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={inventoryReportData.inventoryAgeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <RechartsTooltip formatter={(value: number) => `${value.toLocaleString()} units`} />
                                        <Bar dataKey="value" name="Units" radius={[4, 4, 0, 0]} fill="#8B5CF6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-6">
                                <StatCard title="Total Inventory Units" value={inventoryReportData.totalUnits.toString()} icon={<BoxIcon />} color="bg-yellow-500" />
                                <StatCard title="Total Inventory Value" value={`Rs. ${inventoryReportData.totalStockValue.toLocaleString()}`} icon={<DollarSignIcon />} color="bg-indigo-500" />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                             <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Inventory Details</h3>
                                <div className="flex items-center space-x-2">
                                    {inventoryStatusFilter !== 'all' && (
                                        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700 pl-3 pr-2 py-1 rounded-full text-sm">
                                            <span>Filtering by: <span className="font-semibold">{inventoryStatusFilter}</span></span>
                                            <button onClick={() => { setInventoryStatusFilter('all'); setInventoryPieIndex(-1); }} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                                                <XCircleIcon className="w-4 h-4 text-slate-500" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="relative">
                                        <input type="text" placeholder="Search VIN, product..." value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} className="pl-8 pr-4 py-2 w-64 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-700" />
                                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg></div>
                                    </div>
                                    <button onClick={() => exportToCsv('inventory_report.csv', processedInventoryTableData)} className="flex items-center space-x-2 text-sm text-primary font-semibold hover:underline no-print">
                                        <DownloadIcon className="w-4 h-4" /> <span>Export CSV</span>
                                    </button>
                                </div>
                             </div>
                             <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-100/80 dark:bg-slate-700/50">
                                        <tr>
                                            {(['VIN', 'Product', 'Holder', 'Status', 'Assigned'] as InventorySortableKey[]).map(key => (
                                                <th key={key} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    <button onClick={() => requestInventorySort(key)} className="flex items-center space-x-1 group">
                                                        <span>{key}</span>
                                                        <SortIndicator active={inventorySortConfig?.key === key} direction={inventorySortConfig?.direction || 'ascending'} />
                                                    </button>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {paginatedInventory.length > 0 ? paginatedInventory.map(item => (
                                            <tr key={item.VIN} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600 dark:text-slate-400">{item.VIN}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{item.Product}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{item.Holder}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                                                        item.Status === StockStatus.Available ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                                                        item.Status === StockStatus.Reserved ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                                                        'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                                    }`}>
                                                        {item.Status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{item.Assigned}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5}>
                                                    <EmptyState 
                                                        icon={<BoxIcon className="w-10 h-10" />}
                                                        title="No Inventory Found"
                                                        message={inventorySearch ? "Your search did not match any inventory items." : "There are no items matching the current filter."}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                             </div>
                             <Pagination currentPage={inventoryCurrentPage} totalPages={inventoryTotalPages} onNext={inventoryNextPage} onPrev={inventoryPrevPage} />
                        </div>
                    </div>
                );
            case 'dealer':
                 return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Top 10 Dealer Performance (by Revenue)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={dealerReportData.chartData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" fontSize={12} tickFormatter={(value) => `Rs ${Number(value / 1000).toFixed(0)}k`}/>
                                        <YAxis type="category" dataKey="Dealer" width={100} fontSize={12} tickLine={false} axisLine={false} />
                                        <RechartsTooltip formatter={(value: number) => `Rs. ${value.toLocaleString()}`} />
                                        <Bar dataKey="TotalRevenue" fill="#6366F1" name="Total Revenue" radius={[0, 4, 4, 0]}/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                             <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Top 10 Dealer Performance (by Units)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={[...dealerReportData.tableData].sort((a,b) => b.UnitsSold - a.UnitsSold).slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" fontSize={12} />
                                        <YAxis type="category" dataKey="Dealer" width={100} fontSize={12} tickLine={false} axisLine={false} />
                                        <RechartsTooltip />
                                        <Bar dataKey="UnitsSold" fill="#3B82F6" name="Units Sold" radius={[0, 4, 4, 0]}/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100">All Dealer Stats</h3>
                                <button onClick={() => exportToCsv('dealer_report.csv', processedDealerTableData)} className="flex items-center space-x-2 text-sm text-primary font-semibold hover:underline no-print">
                                    <DownloadIcon className="w-4 h-4" /> <span>Export CSV</span>
                                </button>
                             </div>
                             <div className="overflow-x-auto max-h-96">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-100/80 dark:bg-slate-700/50 sticky top-0">
                                        <tr>
                                            {(['Dealer', 'City', 'Reputation', 'UnitsSold', 'TotalRevenue', 'CommissionEarned'] as DealerSortableKey[]).map(key => (
                                                <th key={key} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    <button onClick={() => requestDealerSort(key)} className="flex items-center space-x-1 group">
                                                        <span>{key}</span>
                                                        <SortIndicator active={dealerSortConfig?.key === key} direction={dealerSortConfig?.direction || 'ascending'} />
                                                    </button>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                        {processedDealerTableData.map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{row.Dealer}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{row.City}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{row.Reputation.toFixed(1)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{row.UnitsSold}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{row.TotalRevenue.toLocaleString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{row.CommissionEarned.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    </div>
                );
            case 'custom':
                return <CustomReports />;
        }
    };

    const tabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
        { id: 'sales', label: 'Sales', icon: <DollarSignIcon /> },
        { id: 'inventory', label: 'Inventory', icon: <BoxIcon /> },
        { id: 'dealer', label: 'Dealer Performance', icon: <UsersIcon /> },
        { id: 'custom', label: 'Custom', icon: <PrintIcon /> },
    ];
    
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 no-print">Reports</h2>
            
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 no-print">
                 <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold capitalize transition-colors shrink-0 ${activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-slate-200'}`}>
                            {React.cloneElement(tab.icon as React.ReactElement<any>, { className: "w-4 h-4" })}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
                 <div className="flex items-center space-x-2">
                    {(activeTab === 'sales' || activeTab === 'dealer') && (
                        <div className="flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <button onClick={() => setDateRange('30d')} className={`px-3 py-1 text-sm font-semibold rounded-md ${dateRange === '30d' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}>Last 30 Days</button>
                            <button onClick={() => setDateRange('90d')} className={`px-3 py-1 text-sm font-semibold rounded-md ${dateRange === '90d' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}>Last 90 Days</button>
                            <button onClick={() => setDateRange('all')} className={`px-3 py-1 text-sm font-semibold rounded-md ${dateRange === 'all' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}>All Time</button>
                        </div>
                    )}
                    <button onClick={() => setScheduleModalOpen(true)} className="py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                        Schedule Report
                    </button>
                 </div>
            </div>

            <div className="mt-6">
                {renderContent()}
            </div>
            <ScheduleReportModal isOpen={isScheduleModalOpen} onClose={() => setScheduleModalOpen(false)} showToast={showToast} />
        </div>
    );
};

export default Reports;