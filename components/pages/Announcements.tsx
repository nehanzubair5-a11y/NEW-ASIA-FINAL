import React, { useState, useMemo } from 'react';
import { useData } from '../../hooks/useData.ts';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { PlusIcon, MegaphoneIcon } from '../icons/Icons.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import AnnouncementModal from '../modals/AnnouncementModal.tsx';
import usePagination from '../../hooks/usePagination.ts';
import Pagination from '../shared/Pagination.tsx';

const Announcements: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { announcements } = useData();
    const { users } = useAppContext();
    const [isModalOpen, setModalOpen] = useState(false);

    const announcementsWithSender = useMemo(() => {
        return announcements
            .map(anno => ({
                ...anno,
                senderName: users.find(u => u._id === anno.sentByUserId)?.name || 'System',
            }))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [announcements, users]);

    const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(announcementsWithSender, 10);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Manage Announcements</h2>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary"
                >
                    <PlusIcon />
                    <span>Create Announcement</span>
                </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100/80">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Subject</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Sent By</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {paginatedData.length > 0 ? paginatedData.map(anno => (
                                <tr key={anno._id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-slate-900">{anno.subject}</p>
                                        <p className="text-sm text-slate-500 truncate max-w-lg">{anno.message}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{anno.senderName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(anno.timestamp).toLocaleString()}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3}>
                                        <EmptyState
                                            icon={<MegaphoneIcon className="w-12 h-12" />}
                                            title="No Announcements Sent"
                                            message="Use this feature to broadcast important information to all dealers."
                                            action={
                                                <button
                                                    onClick={() => setModalOpen(true)}
                                                    className="flex items-center space-x-2 mx-auto py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary"
                                                >
                                                    <PlusIcon />
                                                    <span>Send First Announcement</span>
                                                </button>
                                            }
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
            </div>

            <AnnouncementModal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                showToast={showToast}
            />
        </div>
    );
};

export default Announcements;
