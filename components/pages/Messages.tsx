import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../hooks/useData.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { MessageSquareIcon, XCircleIcon, PlusIcon, WhatsAppIcon, ArrowLeftIcon } from '../icons/Icons.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import Spinner from '../shared/Spinner.tsx';
import { User } from '../../types.ts';
import NewMessageModal from '../modals/NewMessageModal.tsx';
import { createWhatsAppLink } from '../../utils/print.ts';
import Tooltip from '../shared/Tooltip.tsx';

const Avatar: React.FC<{ user?: User | null }> = ({ user }) => {
    const initial = user?.name.charAt(0).toUpperCase() || '?';
    // Simple hashing for a consistent color
    const colorIndex = (user?._id.charCodeAt(2) || 0) % 5;
    const colors = [
        'bg-blue-500 text-white',
        'bg-green-500 text-white',
        'bg-yellow-500 text-white',
        'bg-purple-500 text-white',
        'bg-pink-500 text-white',
    ];

    return (
        <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xl ${colors[colorIndex]}`}>
            {initial}
        </div>
    );
};

const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    if (date >= startOfToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (date >= startOfYesterday) {
        return 'Yesterday';
    }
    return date.toLocaleDateString();
};

const Messages: React.FC<{
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    initialState?: any;
    onInitialStateConsumed: () => void;
}> = ({ showToast, initialState, onInitialStateConsumed }) => {
    const { user } = useAuth();
    const { conversations, messages, sendMessage, markConversationAsRead } = useData();
    const { users } = useAppContext();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
    const [stagingRecipient, setStagingRecipient] = useState<User | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const myConversations = useMemo(() => {
        if (!user) return [];
        return conversations
            .filter(c => c.participantIds.includes(user._id))
            .map(c => {
                const otherParticipantId = c.participantIds.find(id => id !== user._id);
                const otherParticipant = users.find(u => u._id === otherParticipantId) || { _id: 'unknown', name: 'Unknown User', role: 'System' } as User;
                const lastMessage = messages
                    .filter(m => m.conversationId === c._id)
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                const unreadCount = messages.filter(m => m.conversationId === c._id && m.senderId !== user._id && !m.isRead).length;

                return {
                    ...c,
                    otherParticipant,
                    lastMessage,
                    unreadCount
                };
            })
            .sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime());
    }, [conversations, messages, user, users]);
    
    useEffect(() => {
        if (initialState?.recipientId) {
            const recipient = users.find(u => u._id === initialState.recipientId);
            if (recipient) {
                handleStartConversation(recipient);
            }
            onInitialStateConsumed();
        }
    }, [initialState, onInitialStateConsumed, users]);

    const filteredConversations = useMemo(() => {
        if (!searchQuery) {
            return myConversations;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return myConversations.filter(c =>
            c.otherParticipant.name.toLowerCase().includes(lowercasedQuery)
        );
    }, [myConversations, searchQuery]);


    useEffect(() => {
        // Only auto-select on desktop
        const isDesktop = window.innerWidth >= 768;
        if (isDesktop && filteredConversations.length > 0 && !stagingRecipient && (!selectedConversationId || !filteredConversations.some(c => c._id === selectedConversationId))) {
            setSelectedConversationId(filteredConversations[0]._id);
        } else if (filteredConversations.length === 0 && !stagingRecipient) {
            setSelectedConversationId(null);
        }
    }, [filteredConversations, selectedConversationId, stagingRecipient]);

    useEffect(() => {
        if (selectedConversationId) {
            markConversationAsRead(selectedConversationId);
        }
    }, [selectedConversationId, markConversationAsRead]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, selectedConversationId]);

    useEffect(() => {
        // If we were staging a new conversation and it now exists in our list, select it
        if (stagingRecipient) {
            const newConvo = myConversations.find(c => c.otherParticipant._id === stagingRecipient._id);
            if (newConvo) {
                setSelectedConversationId(newConvo._id);
                setStagingRecipient(null); // Clear the staging recipient
            }
        }
    }, [myConversations, stagingRecipient]);

    const selectedConversation = myConversations.find(c => c._id === selectedConversationId);
    const currentRecipient = selectedConversation?.otherParticipant || stagingRecipient;

    const selectedConversationMessages = useMemo(() => {
        if (!selectedConversationId) return [];
        return messages.filter(m => m.conversationId === selectedConversationId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, selectedConversationId]);
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const recipientId = currentRecipient?._id;
        if (!newMessage.trim() || !recipientId) return;
        
        setIsSending(true);
        try {
            await sendMessage(recipientId, newMessage);
            setNewMessage('');
        } catch (error) {
            showToast('Failed to send message.', 'error');
        } finally {
            setIsSending(false);
        }
    };
    
    const handleStartConversation = (recipient: User) => {
        setIsNewMessageModalOpen(false);
        const existingConvo = myConversations.find(c => c.otherParticipant._id === recipient._id);
        if (existingConvo) {
            setSelectedConversationId(existingConvo._id);
            setStagingRecipient(null);
        } else {
            setSelectedConversationId(null);
            setStagingRecipient(recipient);
        }
    };

    return (
        <>
            <div className="flex h-[calc(100vh-7rem-3rem)] bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Left Panel: Conversation List - Hidden on mobile if conversation selected */}
                <div className={`w-full md:w-1/3 border-r border-slate-200 dark:border-slate-700 flex-col ${selectedConversationId || stagingRecipient ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                         <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Inbox</h2>
                            <button
                                onClick={() => setIsNewMessageModalOpen(true)}
                                className="flex items-center space-x-2 py-1.5 px-3 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                aria-label="Start new message"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>New</span>
                            </button>
                        </div>
                        <div className="relative mt-2">
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-2 pl-8 pr-8 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-700"
                            />
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
                            </div>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                                    aria-label="Clear search"
                                >
                                    <XCircleIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {filteredConversations.map(convo => (
                            <button
                                key={convo._id}
                                onClick={() => { setSelectedConversationId(convo._id); setStagingRecipient(null); }}
                                className={`w-full text-left p-4 flex items-center space-x-4 hover:bg-slate-100 dark:hover:bg-slate-700/50 border-l-4 transition-colors duration-150 ${selectedConversationId === convo._id ? 'border-primary bg-slate-50 dark:bg-slate-700' : 'border-transparent'}`}
                            >
                                <Avatar user={convo.otherParticipant} />
                                <div className="flex-grow overflow-hidden">
                                    <div className="flex justify-between items-baseline">
                                        <span className={`font-semibold truncate ${convo.unreadCount > 0 ? 'text-primary' : 'text-slate-800 dark:text-slate-100'}`}>{convo.otherParticipant?.name}</span>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{convo.lastMessage ? formatTimestamp(convo.lastMessage.timestamp) : ''}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{convo.lastMessage?.content || 'No messages yet'}</p>
                                        {convo.unreadCount > 0 && (
                                            <span className="bg-primary text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">{convo.unreadCount}</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Message View - Visible on mobile if conversation selected */}
                <div className={`w-full md:w-2/3 flex-col ${selectedConversationId || stagingRecipient ? 'flex' : 'hidden md:flex'}`}>
                    {currentRecipient ? (
                        <>
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                                <div className="flex items-center space-x-3">
                                    <button 
                                        className="md:hidden p-1 mr-1 text-slate-500 hover:bg-slate-100 rounded-full"
                                        onClick={() => { setSelectedConversationId(null); setStagingRecipient(null); }}
                                    >
                                        <ArrowLeftIcon className="w-6 h-6" />
                                    </button>
                                    <Avatar user={currentRecipient} />
                                    <div>
                                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm md:text-base">{currentRecipient.name}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{currentRecipient.role}</p>
                                    </div>
                                </div>
                                <Tooltip content="Continue on WhatsApp">
                                    <a
                                        href={createWhatsAppLink(currentRecipient.whatsapp || currentRecipient.phone || '')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-green-600 hover:text-green-700"
                                        aria-label="Continue on WhatsApp"
                                    >
                                        <WhatsAppIcon />
                                    </a>
                                </Tooltip>
                            </div>
                            <div className="flex-grow p-4 md:p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                                {selectedConversationMessages.map(msg => (
                                    <div key={msg._id} className={`flex items-end gap-2 md:gap-3 ${msg.senderId === user?._id ? 'justify-end' : 'justify-start'}`}>
                                        {msg.senderId !== user?._id && <div className="hidden md:block"><Avatar user={currentRecipient} /></div>}
                                        <div className={`max-w-[85%] md:max-w-xl p-3 rounded-2xl text-sm md:text-base ${msg.senderId === user?._id ? 'bg-primary text-white rounded-br-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-lg'}`}>
                                            <p>{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-3 md:p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                <form onSubmit={handleSendMessage} className="flex items-center space-x-2 md:space-x-3">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        placeholder={`Message ${currentRecipient.name}`}
                                        className="flex-grow p-3 border border-slate-300 dark:border-slate-600 rounded-full shadow-sm text-sm bg-white dark:bg-slate-700 focus:ring-primary focus:border-primary"
                                        autoFocus
                                    />
                                    <button type="submit" disabled={isSending || !newMessage.trim()} className="w-20 md:w-24 flex justify-center py-2 px-4 rounded-full text-white bg-primary hover:bg-secondary disabled:bg-slate-400 font-semibold transition-colors text-sm md:text-base">
                                        {isSending ? <Spinner className="w-5 h-5" /> : 'Send'}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-grow flex items-center justify-center bg-slate-50 dark:bg-slate-900/20">
                            <EmptyState icon={<MessageSquareIcon className="w-12 h-12" />} title="Select a conversation" message="Choose a conversation from the list or start a new one." />
                        </div>
                    )}
                </div>
            </div>
            <NewMessageModal
                isOpen={isNewMessageModalOpen}
                onClose={() => setIsNewMessageModalOpen(false)}
                onSelectRecipient={handleStartConversation}
            />
        </>
    );
};

export default Messages;