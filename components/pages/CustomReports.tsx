import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Sector } from 'recharts';
import { useData } from '../../hooks/useData.ts';
import StatCard from '../shared/StatCard.tsx';
import { DownloadIcon, BoxIcon, UsersIcon, PrintIcon, ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon, XCircleIcon, FileSearchIcon, PieChartIcon, BarChart2Icon, DollarSignIcon } from '../icons/Icons.tsx';
import { BookingStatus, OrderStatus, StockStatus } from '../../types.ts';
import EmptyState from '../shared/EmptyState.tsx';
import Pagination from '../shared/Pagination.tsx';
import usePagination from '../../hooks/usePagination.ts';
import { printElementById, exportToCsv } from '../../utils/print.ts';

type DataSource = 'bookings' | 'stock' | 'stock_orders' | 'dealer_performance';
type GroupByOption = 'none' | 'dealerId' | 'status' | 'brand' | 'city' | 'holderName';
type ChartType = 'pie' | 'bar' | 'none';

interface ReportData {
    isGrouped: boolean;
    data: any[] | Record<string, any[]>;
    columns: { key: string; header: string }[];
    summary?: Record<string, { count: number; total: number; avg: number }>;
    globalSummary: {
        totalRecords: number;
        totalValue: number;
        avgValue: number;
    };
    chartData: { name: string; value: number }[];
}

const DATA_SOURCES_CONFIG: Record<DataSource, {
    name: string;
    columns: { key: string; header: string }[];
    filters: string[];
    groupBy: GroupByOption[];
    valueField: string;
}> = {
    bookings: {
        name: 'Customer Bookings',
        columns: [
            { key: 'bookingTimestamp', header: 'Date' },
            { key: 'customerName', header: 'Customer' },
            { key: 'productName', header: 'Product' },
            { key: 'dealerName', header: 'Dealer' },
            { key: 'status', header: 'Status' },
            { key: 'price', header: 'Price (Rs)' },
        ],
        filters: ['dateRange', 'status', 'dealer'],
        groupBy: ['none', 'dealerId', 'status'],
        valueField: 'price',
    },
    stock: {
        name: 'Stock Inventory',
        columns: [
            { key: 'vin', header: 'VIN' },
            { key: 'productName', header: 'Product' },
            { key: 'brand', header: 'Brand' },
            { key: 'holderName', header: 'Holder' },
            { key: 'status', header: 'Status' },
            { key: 'price', header: 'Price (Rs)' },
            { key: 'assignedAt', header: 'Assigned Date' },
        ],
        filters: ['status', 'dealer', 'dateRange'],
        groupBy: ['none', 'holderName', 'status', 'brand'],
        valueField: 'price',
    },
    stock_orders: {
        name: 'Stock Orders',
        columns: [
            { key: 'requestTimestamp', header: 'Date' },
            { key: 'dealerName', header: 'Dealer' },
            { key: 'status', header: 'Status' },
            { key: 'requestedQty', header: 'Requested Qty' },
            { key: 'approvedQty', header: 'Approved Qty' },
            { key: 'orderValue', header: 'Approved Value (Rs)' },
        ],
        filters: ['dateRange', 'status', 'dealer'],
        groupBy: ['none', 'dealerId', 'status'],
        valueField: 'orderValue',
    },
    dealer_performance: {
        name: 'Dealer Performance',
        columns: [
            { key: 'name', header: 'Dealer' },
            { key: 'city', header: 'City' },
            { key: 'reputationScore', header: 'Reputation' },
            { key: 'unitsSold', header: 'Units Sold' },
            { key: 'totalRevenue', header: 'Total Revenue (Rs)' },
        ],
        filters: ['city'],
        groupBy: ['none', 'city'],
        valueField: 'totalRevenue',
    },
};

const CustomReports: React.FC = () => {
    const { bookings, dealers, products, stock, stockOrders } = useData();
    const [dataSource, setDataSource] = useState<DataSource>('bookings');
    const [filters, setFilters] = useState({ startDate: '', endDate: '', status: 'all', dealerId: 'all', city: 'all' });
    const [groupBy, setGroupBy] = useState<GroupByOption>('none');
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [chartType, setChartType] = useState<ChartType>('pie');
    
    const currentConfig = DATA_SOURCES_CONFIG[dataSource];

    useEffect(() => {
        setSelectedColumns(currentConfig.columns.map(c => c.key));
        setGroupBy('none');
        setReportData(null);
    }, [dataSource]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleColumnChange = (key: string) => {
        setSelectedColumns(prev => 
            prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
        );
    };
    
    const handleGenerateReport = () => {
        let processedData: any[] = [];

        if (dataSource === 'bookings') {
            processedData = bookings.map(b => ({
                ...b,
                dealerName: dealers.find(d => d._id === b.dealerId)?.name || 'N/A',
                productName: products.flatMap(p => p.variants).find(v => v._id === b.variantId)?.name || 'N/A',
                price: products.flatMap(p => p.variants).find(v => v._id === b.variantId)?.price || 0,
            }));
        } else if (dataSource === 'stock') {
            processedData = stock.map(s => {
                const variant = products.flatMap(p => p.variants).find(v => v._id === s.variantId);
                const product = products.find(p => p.variants.some(v => v._id === s.variantId));
                return {
                    ...s,
                    holderName: dealers.find(d => d._id === s.dealerId)?.name || 'Central Stock',
                    productName: `${product?.modelName} (${variant?.name})` || 'N/A',
                    brand: product?.brand || 'N/A',
                    price: variant?.price || 0,
                }
            });
        } else if (dataSource === 'stock_orders') {
            processedData = stockOrders.map(o => {
                const approvedQty = o.approvedItems?.reduce((sum, i) => sum + i.approvedQuantity, 0) ?? 0;
                const orderValue = o.approvedItems?.reduce((sum, i) => {
                    const variant = products.flatMap(p => p.variants).find(v => v._id === i.variantId);
                    return sum + (i.approvedQuantity * (variant?.price || 0));
                }, 0) ?? 0;
                return {
                    ...o,
                    dealerName: dealers.find(d => d._id === o.dealerId)?.name || 'N/A',
                    requestedQty: o.items.reduce((sum, i) => sum + i.quantity, 0),
                    approvedQty,
                    orderValue,
                }
            });
        } else if (dataSource === 'dealer_performance') {
            processedData = dealers.map(d => {
                const deliveredBookings = bookings.filter(b => b.dealerId === d._id && b.status === BookingStatus.Delivered);
                const totalRevenue = deliveredBookings.reduce((sum, booking) => {
                    const variant = products.flatMap(p => p.variants).find(v => v._id === booking.variantId);
                    return sum + (variant?.price || 0);
                }, 0);
                return {
                    ...d,
                    unitsSold: deliveredBookings.length,
                    totalRevenue,
                }
            });
        }

        // Apply filters
        const filteredData = processedData.filter(item => {
            if (currentConfig.filters.includes('dateRange')) {
                const dateKey = dataSource === 'stock_orders' ? 'requestTimestamp' : (dataSource === 'stock' ? 'assignedAt' : 'bookingTimestamp');
                const date = new Date(item[dateKey]);
                if (filters.startDate && date < new Date(filters.startDate)) return false;
                if (filters.endDate && date > new Date(filters.endDate)) return false;
            }
            if (currentConfig.filters.includes('status') && filters.status !== 'all' && item.status !== filters.status) return false;
            if (currentConfig.filters.includes('dealer') && filters.dealerId !== 'all' && item.dealerId !== filters.dealerId) return false;
            if (currentConfig.filters.includes('city') && filters.city !== 'all' && item.city !== filters.city) return false;
            return true;
        });
        
        const valueField = currentConfig.valueField;
        const totalValue = filteredData.reduce((sum, item) => sum + (item[valueField] || 0), 0);

        const finalReportData: Partial<ReportData> = {
            columns: currentConfig.columns.filter(c => selectedColumns.includes(c.key)),
            globalSummary: {
                totalRecords: filteredData.length,
                totalValue,
                avgValue: filteredData.length > 0 ? totalValue / filteredData.length : 0,
            }
        };
        
        if (groupBy === 'none') {
            finalReportData.isGrouped = false;
            finalReportData.data = filteredData;
            finalReportData.chartData = [];
        } else {
            finalReportData.isGrouped = true;
            const groupedData = filteredData.reduce((acc, item) => {
                const key = item[groupBy] || 'N/A';
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
            }, {} as Record<string, any[]>);
            finalReportData.data = groupedData;
            
            finalReportData.summary = Object.keys(groupedData).reduce((acc, groupKey) => {
                const groupItems = groupedData[groupKey];
                const groupTotal = groupItems.reduce((sum, item) => sum + (item[valueField] || 0), 0);
                acc[groupKey] = {
                    count: groupItems.length,
                    total: groupTotal,
                    avg: groupItems.length > 0 ? groupTotal / groupItems.length : 0,
                };
                return acc;
            }, {} as Record<string, any>);

            finalReportData.chartData = Object.entries(finalReportData.summary).map(([groupKey, summary]) => ({
                name: getGroupName(groupKey),
                value: summary.total,
            })).sort((a,b) => b.value - a.value);
        }

        setReportData(finalReportData as ReportData);
    };

    const handleExport = () => {
        if (!reportData) return;
        const dataToExport = reportData.isGrouped 
            ? Object.entries(reportData.data as Record<string, any[]>).flatMap(([group, items]) => items.map(item => ({ Group: getGroupName(group), ...item })))
            : reportData.data as any[];

        if (dataToExport.length === 0) return;

        const simplifiedData = dataToExport.map(row => {
            const newRow: Record<string, any> = {};
            if (row.Group) newRow['Group'] = row.Group;
            reportData.columns.forEach(col => {
                const value = row[col.key];
                if (['bookingTimestamp', 'requestTimestamp', 'assignedAt'].includes(col.key)) {
                    newRow[col.header] = new Date(value).toLocaleDateString();
                } else {
                    newRow[col.header] = value;
                }
            });
            return newRow;
        });

        exportToCsv('custom_report.csv', simplifiedData);
    };
    
    const getGroupName = (groupKey: string) => {
        if (groupBy === 'dealerId') return dealers.find(d => d._id === groupKey)?.name || groupKey;
        return groupKey;
    };
    
    const renderFilters = () => {
        return (
            <>
                {currentConfig.filters.includes('dateRange') && (<>
                    <div><label className="text-sm font-medium">Start Date</label><input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md" /></div>
                    <div><label className="text-sm font-medium">End Date</label><input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md" /></div>
                </>)}
                {currentConfig.filters.includes('status') && (
                     <div>
                        <label className="text-sm font-medium">Status</label>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md">
                            <option value="all">All</option>
                            {dataSource === 'bookings' && Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            {dataSource === 'stock' && Object.values(StockStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            {dataSource === 'stock_orders' && Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}
                 {currentConfig.filters.includes('dealer') && (
                     <div>
                        <label className="text-sm font-medium">Dealer</label>
                        <select name="dealerId" value={filters.dealerId} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md">
                            <option value="all">All</option>
                            {dealers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                    </div>
                 )}
                 {currentConfig.filters.includes('city') && (
                     <div>
                        <label className="text-sm font-medium">City</label>
                        <select name="city" value={filters.city} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md">
                            <option value="all">All</option>
                            {[...new Set(dealers.map(d => d.city))].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                 )}
            </>
        );
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800">Custom Report Builder</h2>

            <div className="bg-white p-6 rounded-lg shadow-sm space-y-4 no-print">
                <h3 className="font-bold text-lg border-b pb-2">Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    {/* --- REPORT TYPE --- */}
                    <div><label className="text-sm font-medium">Data Source</label><select value={dataSource} onChange={e => setDataSource(e.target.value as DataSource)} className="mt-1 w-full p-2 border rounded-md">{Object.entries(DATA_SOURCES_CONFIG).map(([key, config]) => <option key={key} value={key}>{config.name}</option>)}</select></div>
                    {/* --- DYNAMIC FILTERS --- */}
                    {renderFilters()}
                    {/* --- DISPLAY OPTIONS --- */}
                    <div className="relative">
                        <label className="text-sm font-medium">Columns</label>
                         <div className="dropdown mt-1">
                            <button type="button" className="w-full p-2 border rounded-md text-left bg-white">{selectedColumns.length} columns selected</button>
                            <div className="dropdown-content absolute bg-white p-2 border rounded shadow-lg z-10 hidden w-full">
                                {currentConfig.columns.map(col => <label key={col.key} className="flex items-center space-x-2 p-1"><input type="checkbox" checked={selectedColumns.includes(col.key)} onChange={() => handleColumnChange(col.key)} /><span>{col.header}</span></label>)}
                            </div>
                        </div>
                         <style>{`.dropdown:hover .dropdown-content { display: block; }`}</style>
                    </div>
                    <div><label className="text-sm font-medium">Group By</label><select value={groupBy} onChange={e => setGroupBy(e.target.value as GroupByOption)} className="mt-1 w-full p-2 border rounded-md"><option value="none">None</option>{currentConfig.groupBy.map(g => g !== 'none' && <option key={g} value={g}>{DATA_SOURCES_CONFIG[dataSource].columns.find(c => c.key === g)?.header || g}</option>)}</select></div>
                    <div><label className="text-sm font-medium">Chart Type</label><select value={chartType} onChange={e => setChartType(e.target.value as ChartType)} className="mt-1 w-full p-2 border rounded-md" disabled={groupBy === 'none'}><option value="none">None</option><option value="pie">Pie Chart</option><option value="bar">Bar Chart</option></select></div>
                    
                    <div className="lg:col-span-4"><button onClick={handleGenerateReport} className="w-full py-2.5 px-4 font-medium rounded-md text-white bg-primary hover:bg-secondary">Generate Report</button></div>
                </div>
            </div>
            
            <ReportResults data={reportData} onExport={handleExport} getGroupName={getGroupName} chartType={chartType} />
        </div>
    );
};

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6'];

const ReportResults: React.FC<{ data: ReportData | null, onExport: () => void, getGroupName: (key: string) => string, chartType: ChartType }> = ({ data, onExport, getGroupName, chartType }) => {
    if (!data) return <div className="bg-white p-6 rounded-lg shadow-sm"><EmptyState icon={<FileSearchIcon className="w-12 h-12" />} title="Generate a Report" message="Select options and click 'Generate' to see data." /></div>;
    
    const { totalRecords, totalValue, avgValue } = data.globalSummary;
    if (totalRecords === 0) return <div className="bg-white p-6 rounded-lg shadow-sm"><EmptyState icon={<FileSearchIcon className="w-12 h-12" />} title="No Results" message="Your criteria did not match any records." /></div>;
    
    return (
        <div id="report-results" className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                <p className="font-semibold text-slate-700">Generated {totalRecords} records.</p>
                <div className="flex items-center space-x-4 no-print">
                    <button onClick={() => printElementById('report-results')} className="flex items-center gap-2 text-slate-600 hover:text-primary"><PrintIcon/> Print</button>
                    <button onClick={onExport} className="flex items-center gap-2 text-slate-600 hover:text-primary"><DownloadIcon/> Export</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Records" value={totalRecords.toLocaleString()} icon={<BarChart2Icon/>} color="bg-blue-500" />
                <StatCard title="Total Value" value={`Rs. ${totalValue.toLocaleString()}`} icon={<DollarSignIcon/>} color="bg-green-500" />
                <StatCard title="Average Value" value={`Rs. ${avgValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`} icon={<BarChart2Icon/>} color="bg-indigo-500" />
            </div>

            {data.isGrouped && chartType !== 'none' && data.chartData.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="font-bold mb-4">{chartType === 'pie' ? 'Value Distribution' : 'Value by Group'}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        {chartType === 'pie' ? (
                            <PieChart>
                                {/* FIX: Cast `percent` to Number to avoid potential TypeScript errors. */}
                                <Pie data={data.chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} (${(Number(percent) * 100).toFixed(0)}%)`}>
                                    {data.chartData.map((_entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                </Pie>
                                <RechartsTooltip formatter={(value: number) => `Rs. ${value.toLocaleString()}`}/>
                                <Legend />
                            </PieChart>
                        ) : (
                            <BarChart data={data.chartData} layout="vertical" margin={{left: 100}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                <XAxis type="number" tickFormatter={(v) => `Rs ${v/1000}k`} />
                                <YAxis type="category" dataKey="name" width={100} />
                                <RechartsTooltip formatter={(value: number) => `Rs. ${value.toLocaleString()}`}/>
                                <Bar dataKey="value" name="Total Value" fill={PIE_COLORS[0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            )}
            
            {data.isGrouped 
                ? Object.entries(data.data as Record<string, any[]>).map(([key, items]) => <GroupedTable key={key} groupName={getGroupName(key)} items={items} columns={data.columns} summary={data.summary?.[key]} />)
                : <UngroupedTable items={data.data as any[]} columns={data.columns} />
            }
        </div>
    );
};


const UngroupedTable: React.FC<{ items: any[], columns: { key: string; header: string }[] }> = ({ items, columns }) => {
    const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(items, 15);
    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-100/80"><tr>{columns.map(c => <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{c.header}</th>)}</tr></thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {paginatedData.map((item, index) => (<tr key={item._id || index} className="hover:bg-slate-50">{columns.map(col => <td key={col.key} className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{formatCell(item, col.key)}</td>)}</tr>))}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
        </div>
    );
};

const GroupedTable: React.FC<{ groupName: string, items: any[], columns: { key: string; header: string }[], summary?: { count: number; total: number; } }> = ({ groupName, items, columns, summary }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
             <div className="px-4 py-3 bg-slate-100 border-b flex justify-between items-center">
                <h3 className="font-bold text-slate-800">{groupName} ({items.length} records)</h3>
                {summary && <p className="text-sm font-semibold text-slate-600">Group Total: Rs. {summary.total.toLocaleString()}</p>}
            </div>
            <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50"><tr>{columns.map(c => <th key={c.key} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{c.header}</th>)}</tr></thead>
                <tbody className="bg-white divide-y divide-slate-200">{items.map((item, index) => (<tr key={item._id || index} className="hover:bg-slate-50">{columns.map(col => <td key={col.key} className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{formatCell(item, col.key)}</td>)}</tr>))}</tbody>
            </table></div>
        </div>
    );
};

const formatCell = (item: any, key: string) => {
    const value = item[key];
    if (value === null || value === undefined) return '';
    
    // Check if it looks like a date string/number
    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('timestamp')) {
        const date = new Date(value);
        // Check if the date is valid before formatting
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString();
        }
    }

    if (typeof value === 'number') {
        return value.toLocaleString();
    }
    
    // If it's an object, it can't be rendered. Return a placeholder.
    if (typeof value === 'object') {
        return '[Object]';
    }

    // Default to string conversion for everything else (booleans, etc.)
    return String(value);
};

export default CustomReports;