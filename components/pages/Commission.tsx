import React, { useMemo } from 'react';
import { useData } from '../../hooks/useData.ts';
import { BookingStatus } from '../../types.ts';
import StatCard from '../shared/StatCard.tsx';
import { DollarSignIcon, UsersIcon } from '../icons/Icons.tsx';

const COMMISSION_RATE = 0.01; // 1%

const Commission: React.FC = () => {
    const { dealers, bookings, products } = useData();

    const commissionData = useMemo(() => {
        return dealers.map(dealer => {
            const deliveredBookings = bookings.filter(b => 
                b.dealerId === dealer._id && b.status === BookingStatus.Delivered
            );

            const totalRevenue = deliveredBookings.reduce((sum, booking) => {
                const variant = products.flatMap(p => p.variants).find(v => v._id === booking.variantId);
                return sum + (variant?.price || 0);
            }, 0);

            const commissionEarned = totalRevenue * COMMISSION_RATE;

            return {
                dealerId: dealer._id,
                dealerName: dealer.name,
                city: dealer.city,
                totalRevenue,
                commissionEarned,
            };
        }).sort((a, b) => b.commissionEarned - a.commissionEarned);
    }, [dealers, bookings, products]);
    
    const totalCommission = useMemo(() => {
        return commissionData.reduce((sum, data) => sum + data.commissionEarned, 0);
    }, [commissionData]);
    
    const topPerformer = commissionData[0];

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800">Dealer Commission Report</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                    title="Total Commission Payable" 
                    value={`Rs. ${totalCommission.toLocaleString()}`} 
                    icon={<DollarSignIcon />} 
                    color="bg-green-500" 
                />
                 <StatCard 
                    title="Top Performing Dealer" 
                    value={topPerformer?.dealerName || 'N/A'} 
                    icon={<UsersIcon />} 
                    color="bg-blue-500" 
                />
            </div>
            
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100/80">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Dealer</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Total Revenue (Rs)</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Commission Rate</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Commission Earned (Rs)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {commissionData.map(data => (
                                <tr key={data.dealerId} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{data.dealerName}</div>
                                        <div className="text-sm text-slate-500">{data.city}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {data.totalRevenue.toLocaleString()}
                                    </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {(COMMISSION_RATE * 100).toFixed(1)}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                                        {data.commissionEarned.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Commission;