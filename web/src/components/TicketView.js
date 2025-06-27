import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Send, CheckCircle, Lock, Unlock, Tag, Plus, X, User, ShieldAlert, ChevronDown, Undo2, AtSign } from 'lucide-react';

export default function TicketView({ ticket, onBack, user, staffMembers }) {
    const [messages, setMessages] = useState([]);
    const [replyContent, setReplyContent] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(true);
    const messagesEndRef = useRef(null);
    const [localTicket, setLocalTicket] = useState(ticket);
    const [newTag, setNewTag] = useState('');
    const [shouldPing, setShouldPing] = useState(false);
    const [userPrefs, setUserPrefs] = useState({ staffBubbleColor: '#5865F2', staffTextColor: '#FFFFFF' });

    // Mark ticket as read when it's viewed
    useEffect(() => {
        const markAsRead = async () => {
            if (ticket.id && ticket.isRead === false) {
                const ticketDocRef = doc(db, 'tickets', ticket.id);
                try {
                    await updateDoc(ticketDocRef, { isRead: true });
                } catch(error) {
                    console.error("Error marking ticket as read:", error);
                }
            }
        };
        markAsRead();
    }, [ticket.id, ticket.isRead]);

    // Fetch user preferences when the component mounts
    useEffect(() => {
        const fetchPrefs = async () => {
            if (user?.id) {
                const prefDocRef = doc(db, 'userPreferences', user.id);
                const prefDocSnap = await getDoc(prefDocRef);
                if (prefDocSnap.exists()) {
                    const defaultPrefs = { staffBubbleColor: '#5865F2', staffTextColor: '#FFFFFF' };
                    setUserPrefs({ ...defaultPrefs, ...prefDocSnap.data() });
                }
            }
        };
        fetchPrefs();
    }, [user]);

    useEffect(() => {
        setLocalTicket(ticket);
    }, [ticket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        setLoadingMessages(true);
        const messagesRef = collection(db, 'tickets', ticket.id, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingMessages(false);
        });
        return () => unsubscribe();
    }, [ticket.id]);

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (replyContent.trim() === '' || localTicket.status === 'closed') return;
        const messagesRef = collection(db, 'tickets', ticket.id, 'messages');
        await addDoc(messagesRef, {
            authorId: user.id,
            authorUsername: user.name,
            authorAvatar: user.image,
            content: replyContent,
            timestamp: serverTimestamp(),
            isStaff: true,
            pingUser: shouldPing,
        });
        setReplyContent('');
        setShouldPing(false);
    };

    const handleUpdateStatus = async (newStatus) => {
        const ticketDocRef = doc(db, 'tickets', ticket.id);
        await updateDoc(ticketDocRef, {
            status: newStatus,
            closedAt: newStatus === 'closed' ? serverTimestamp() : null
        });
        onBack();
    };

    const handleAssignTicket = async (e) => {
        const selectedUserId = e.target.value;
        const ticketDocRef = doc(db, 'tickets', ticket.id);
        const assignmentData = selectedUserId
            ? { assignedTo: selectedUserId, assignedToName: staffMembers.find(m => m.id === selectedUserId)?.username, assignedToAvatar: `https://cdn.discordapp.com/avatars/${selectedUserId}/${staffMembers.find(m => m.id === selectedUserId)?.avatar}.png` }
            : { assignedTo: null, assignedToName: null, assignedToAvatar: null };

        await updateDoc(ticketDocRef, assignmentData);
        setLocalTicket(prev => ({ ...prev, ...assignmentData }));
    };

    const handlePriorityChange = async (e) => {
        const newPriority = e.target.value;
        const ticketDocRef = doc(db, 'tickets', ticket.id);
        await updateDoc(ticketDocRef, { priority: newPriority });
        setLocalTicket(prev => ({ ...prev, priority: newPriority }));
    };

    const handleAddTag = async (e) => {
        e.preventDefault();
        if (newTag.trim() === '' || (localTicket.tags && localTicket.tags.includes(newTag.trim()))) {
            setNewTag('');
            return;
        }
        const ticketDocRef = doc(db, 'tickets', ticket.id);
        await updateDoc(ticketDocRef, {
            tags: arrayUnion(newTag.trim())
        });
        setLocalTicket(prev => ({ ...prev, tags: [...(prev.tags || []), newTag.trim()] }));
        setNewTag('');
    };

    const handleRemoveTag = async (tagToRemove) => {
        const ticketDocRef = doc(db, 'tickets', ticket.id);
        await updateDoc(ticketDocRef, {
            tags: arrayRemove(tagToRemove)
        });
        setLocalTicket(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
    };

    const isTicketClosed = localTicket.status === 'closed';

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-neutral-800 gap-4">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 mr-4 rounded-md hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-neutral-100">{localTicket.title}</h2>
                        <p className="text-sm text-neutral-400">
                            Opened by <span className="font-medium text-neutral-300">{ticket.openerUsername}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    {localTicket.status === 'open' && (
                        <>
                            <button onClick={() => handleUpdateStatus('resolved')} className="flex items-center px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md hover:bg-green-500/20 transition-colors text-sm font-medium">
                                <CheckCircle className="h-4 w-4 mr-2"/> Mark Resolved
                            </button>
                            <button onClick={() => handleUpdateStatus('closed')} className="flex items-center px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors text-sm font-medium">
                                <Lock className="h-4 w-4 mr-2"/> Close Ticket
                            </button>
                        </>
                    )}
                    {localTicket.status === 'resolved' && (
                        <>
                            <button onClick={() => handleUpdateStatus('open')} className="flex items-center px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md hover:bg-orange-500/20 transition-colors text-sm font-medium">
                                <Undo2 className="h-4 w-4 mr-2"/> Re-open
                            </button>
                            <button onClick={() => handleUpdateStatus('closed')} className="flex items-center px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors text-sm font-medium">
                                <Lock className="h-4 w-4 mr-2"/> Close Ticket
                            </button>
                        </>
                    )}
                    {localTicket.status === 'closed' && (
                        <button onClick={() => handleUpdateStatus('open')} className="flex items-center px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md hover:bg-orange-500/20 transition-colors text-sm font-medium">
                            <Unlock className="h-4 w-4 mr-2"/> Re-open Ticket
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Body */}
            <div className="flex flex-col md:flex-row flex-grow min-h-0 gap-8">
                {/* Left side: Messages */}
                <div className="flex flex-col flex-grow">
                    <div className="flex-grow bg-neutral-900/50 rounded-lg p-4 overflow-y-auto mb-4 border border-neutral-800">
                        {messages.map((msg, index) => {
                            const showAuthor = index === 0 || messages[index - 1].authorId !== msg.authorId;
                            return (
                                <div key={msg.id} className={`flex items-start ${msg.isStaff ? 'justify-end' : 'justify-start'} ${showAuthor ? 'mt-4' : 'mt-1'}`}>
                                    {showAuthor && !msg.isStaff && (
                                        <img src={msg.authorAvatar} alt={msg.authorUsername} className="w-9 h-9 rounded-full mr-3" />
                                    )}
                                    {!showAuthor && !msg.isStaff && <div className="w-9 mr-3 flex-shrink-0" />}

                                    <div className={`flex flex-col w-full max-w-xl ${msg.isStaff ? 'items-end' : 'items-start'}`}>
                                        {showAuthor && <p className={`font-semibold text-sm mb-1 ${msg.isStaff ? 'text-right mr-3' : 'text-left'}`}>{msg.authorUsername}</p>}
                                        <div className="p-3 rounded-lg" style={{ backgroundColor: msg.isStaff ? userPrefs.staffBubbleColor : '#27272a' }}>
                                            <p className="whitespace-pre-wrap" style={{ color: msg.isStaff ? userPrefs.staffTextColor : '#d4d4d8' }}>{msg.content}</p>
                                        </div>
                                    </div>

                                    {showAuthor && msg.isStaff && (
                                        <img src={msg.authorAvatar} alt={msg.authorUsername} className="w-9 h-9 rounded-full ml-3" />
                                    )}
                                    {!showAuthor && msg.isStaff && <div className="w-9 ml-3 flex-shrink-0" />}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSendReply}>
                        <div className="flex items-center bg-neutral-800 rounded-lg p-1 border border-neutral-700 focus-within:border-indigo-500 transition-colors">
                            <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder={isTicketClosed ? "This ticket is closed." : "Type your reply..."}
                                className="flex-grow bg-transparent focus:outline-none px-3 py-1.5"
                                disabled={isTicketClosed}
                            />
                            <button type="button" title="Ping User" onClick={() => setShouldPing(!shouldPing)} className={`p-2 rounded-md m-1 transition-colors ${shouldPing ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-neutral-700 text-neutral-400'}`}>
                                <AtSign className="h-4 w-4" />
                            </button>
                            <button type="submit" className="p-2 bg-indigo-600 rounded-md m-1 hover:bg-indigo-700 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors" disabled={!replyContent.trim() || isTicketClosed}>
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right sidebar: Ticket Details */}
                <aside className="w-full md:w-72 md:flex-shrink-0 bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                    <h3 className="text-lg font-bold mb-4 text-neutral-200">Ticket Details</h3>
                    <div className="space-y-6">
                        <div className="flex items-start">
                            <User className="h-4 w-4 mt-1 mr-3 text-neutral-500"/>
                            <div className="w-full">
                                <label className="block text-sm font-medium text-neutral-500">Assigned To</label>
                                <div className="relative">
                                    <select onChange={handleAssignTicket} value={localTicket.assignedTo || ''} disabled={isTicketClosed} className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm font-medium text-neutral-200 focus:outline-none focus:border-indigo-500 appearance-none transition-colors">
                                        <option value="" className="bg-neutral-800 text-neutral-400">Unassigned</option>
                                        {staffMembers.map(staff => (
                                            <option key={staff.id} value={staff.id} className="bg-neutral-800">{staff.username}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <ShieldAlert className="h-4 w-4 mt-1 mr-3 text-neutral-500"/>
                            <div className="w-full">
                                <label className="block text-sm font-medium text-neutral-500">Priority</label>
                                <div className="relative">
                                    <select onChange={handlePriorityChange} value={localTicket.priority || 'low'} disabled={isTicketClosed} className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm font-medium text-neutral-200 focus:outline-none focus:border-indigo-500 appearance-none transition-colors">
                                        <option value="low" className="bg-neutral-800">Low</option>
                                        <option value="medium" className="bg-neutral-800">Medium</option>
                                        <option value="high" className="bg-neutral-800">High</option>
                                    </select>
                                    <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <Tag className="h-4 w-4 mt-1 mr-3 text-neutral-500"/>
                            <div className="w-full">
                                <label className="block text-sm font-medium text-neutral-500 mb-2">Tags</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {(localTicket.tags || []).map(tag => (
                                        <div key={tag} className="flex items-center bg-neutral-700/80 px-2 py-0.5 rounded-full text-xs text-neutral-300">
                                            <span>{tag}</span>
                                            <button onClick={() => handleRemoveTag(tag)} disabled={isTicketClosed} className="ml-1.5 text-neutral-500 hover:text-white disabled:hover:text-neutral-500 transition-colors">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={handleAddTag} className="flex items-center">
                                    <input
                                        type="text"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        placeholder="Add a tag..."
                                        className="flex-grow w-full bg-neutral-800 border border-neutral-700 rounded-l-md px-2 py-1 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                        disabled={isTicketClosed}
                                    />
                                    <button type="submit" disabled={isTicketClosed || !newTag.trim()} className="px-2 py-1 bg-indigo-600 rounded-r-md hover:bg-indigo-700 disabled:bg-neutral-700 disabled:cursor-not-allowed border border-indigo-600 disabled:border-neutral-700 transition-colors">
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
