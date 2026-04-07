import React, { useState, useMemo } from 'react';
import { useData } from '../../../hooks/useData.ts';
import { useAuth } from '../../../hooks/useAuth.ts';
import { useAppContext } from '../../../hooks/useAppContext.ts';
import { MegaphoneIcon } from '../../icons/Icons.tsx';
import EmptyState from '../../shared/EmptyState.tsx';
import ViewAnnouncementModal from '../../modals/ViewAnnouncementModal.tsx';
import { Announcement } from '../../../types.ts';

const DealerAnnouncements: React.FC = () => {
    const { user } = useAuth();
    const { announcements, announcementRecipients } = useData();
    const { users } = useAppContext();
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

    const myAnnouncements = useMemo(() => {
        if (!user) return [];
        const recipientMap = new Map(announcementRecipients
            .filter(r => r.userId === user._id)
            .map(r => [r.announcementId, r.isRead])
        );

        return announcements
            .filter(anno => recipientMap.has(anno._id))
            .map(anno => ({
                ...anno,
                isRead: recipientMap.get(anno._id) || false,
                senderName: users.find(u => u._id === anno.sentByUserId)?.name || 'Head Office',
            }))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [announcements, announcementRecipients, user, users]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800">Announcements</h2>
            
            <div className="bg-white rounded-lg shadow-sm">
                <ul className="divide-y divide-slate-200">
                    {myAnnouncements.length > 0 ? myAnnouncements.map(anno => (
                        <li 
                            key={anno._id} 
                            onClick={() => setSelectedAnnouncement(anno)}
                            className={`p-4 hover:bg-slate-50 cursor-pointer flex items-start space-x-4 transition-colors ${!anno.isRead ? 'bg-blue-50' : ''}`}
                        >
                            <div className="flex-shrink-0">
                                {!anno.isRead && (
                                    <span className="flex h-2.5 w-2.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
                                    </span>
                                )}
                            </div>
                            <div className="flex-grow">
                                <div className="flex justify-between items-baseline">
                                    <p className={`text-sm font-semibold ${!anno.isRead ? 'text-primary' : 'text-slate-800'}`}>{anno.subject}</p>
                                    <p className="text-xs text-slate-400">{new Date(anno.timestamp).toLocaleDateString()}</p>
                                </div>
                                <p className="text-sm text-slate-500 mt-1 truncate">{anno.message}</p>
                            </div>
                        </li>
                    )) : (
                         <li>
                            <EmptyState
                                icon={<MegaphoneIcon className="w-12 h-12" />}
                                title="No Announcements"
                                message="There are no announcements from the head office at this time."
                            />
                        </li>
                    )}
                </ul>
            </div>
            
            <ViewAnnouncementModal
                isOpen={!!selectedAnnouncement}
                onClose={() => setSelectedAnnouncement(null)}
                announcement={selectedAnnouncement}
            />
        </div>
    );
};

export default DealerAnnouncements;
