import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { ActionType, User } from '../../types.ts';
import usePagination from '../../hooks/usePagination.ts';
import Pagination from '../shared/Pagination.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import { FileSearchIcon, PrintIcon } from '../icons/Icons.tsx';
import Tooltip from '../shared/Tooltip.tsx';
import { printElementById } from '../../utils/print.ts';

const AuditLogs: React.FC = () => {
    const { auditLogs, users } = useAppContext();
    const [userFilter, setUserFilter] = useState<string>('all');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredLogs = useMemo(() => {
        return auditLogs.filter(log => {
            const userMatch = userFilter === 'all' || log.userId === userFilter;
            const actionMatch = actionFilter === 'all' || log.action === actionFilter;
            
            const logDate = new Date(log.timestamp);
            const startDateMatch = !startDate || logDate >= new Date(startDate);
            const endDateMatch = !endDate || logDate <= new Date(endDate);

            return userMatch && actionMatch && startDateMatch && endDateMatch;
        });
    }, [auditLogs, userFilter, actionFilter, startDate, endDate]);
    
    const { paginatedData, currentPage, totalPages, nextPage, prevPage, setCurrentPage } = usePagination(filteredLogs, 15);

    const usersById = useMemo(() => {
        return users.reduce((acc, user) => {
            acc[user._id] = user;
            return acc;
        }, {} as Record<string, User>);
    }, [users]);

    const getActionColor = (action: ActionType) => {
        switch (action) {
            case ActionType.Create: return 'text-green-600';
            case ActionType.Update: return 'text-blue-600';
            case ActionType.Delete: return 'text-red-600';
            case ActionType.Login: return 'text-yellow-600';
            case ActionType.Approve: return 'text-purple-600';
            default: return 'text-gray-600';
        }
    };
    
     const getRoleColor = (role: string) => {
        switch (role) {
            case 'Super Admin': return 'bg-red-100 text-red-800';
            case 'Admin': return 'bg-blue-100 text-blue-800';
            case 'Dealer': return 'bg-green-100 text-green-800';
            case 'Finance / Auditor': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleClearFilters = () => {
        setUserFilter('all');
        setActionFilter('all');
        setStartDate('');
        setEndDate('');
        setCurrentPage(1);
    };

    return (
        <div id="audit-logs-page-content" className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Audit Logs</h2>
            <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
                 <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-wrap w-full xl:w-auto">
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="flex items-center w-full sm:w-auto">
                            <label className="text-sm font-medium text-slate-600 mr-2 shrink-0">User:</label>
                            <select value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setCurrentPage(1); }} className="w-full sm:w-40 p-2 border border-slate-300 rounded-md shadow-sm text-sm">
                                <option value="all">All</option>
                                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center w-full sm:w-auto">
                            <label className="text-sm font-medium text-slate-600 mr-2 shrink-0">Action:</label>
                            <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }} className="w-full sm:w-32 p-2 border border-slate-300 rounded-md shadow-sm text-sm">
                                <option value="all">All</option>
                                {Object.values(ActionType).map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                         <div className="flex items-center w-full sm:w-auto">
                            <label className="text-sm font-medium text-slate-600 mr-2 shrink-0">From:</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full sm:w-auto p-2 border border-slate-300 rounded-md shadow-sm text-sm" />
                        </div>
                         <div className="flex items-center w-full sm:w-auto">
                            <label className="text-sm font-medium text-slate-600 mr-2 shrink-0">To:</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full sm:w-auto p-2 border border-slate-300 rounded-md shadow-sm text-sm" />
                        </div>
                    </div>
                 </div>
                <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
                    <button onClick={handleClearFilters} className="py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                        Clear Filters
                    </button>
                    <Tooltip content="Print Current View">
                        <button onClick={() => printElementById('audit-logs-page-content')} className="flex items-center justify-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                            <PrintIcon />
                        </button>
                    </Tooltip>
                </div>
            </div>

             <div className="hidden print-only">
                <h1 className="text-2xl font-bold mb-1">Audit Log Report</h1>
                <p className="text-sm text-slate-600 mb-4">
                    Filters: User ({userFilter === 'all' ? 'All' : users.find(u => u._id === userFilter)?.name}), Action ({actionFilter})
                    | Generated on: {new Date().toLocaleDateString()}
                </p>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedData.length > 0 ? paginatedData.map(log => (
                                <tr key={log._id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{usersById[log.userId]?.name || log.userId}</div>
                                        <div className="text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getRoleColor(log.userRole)}`}>
                                                {log.userRole}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`text-sm font-semibold capitalize ${getActionColor(log.action)}`}>{log.action}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-600 max-w-md">
                                        {log.changes || `Performed action on ${log.targetCollection || 'system'}${log.targetId ? ` (${log.targetId})` : ''}`}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4}>
                                        <EmptyState
                                            icon={<FileSearchIcon className="w-10 h-10" />}
                                            title="No Logs Found"
                                            message="There are no audit logs matching your current filter criteria."
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
            </div>
        </div>
    );
};

export default AuditLogs;