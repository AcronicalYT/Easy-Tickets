import { useState, useEffect, useMemo } from 'react';
import { getSession, signOut } from 'next-auth/react';
import { collection, query, where, onSnapshot, getDocsFromServer, orderBy, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LogOut, Settings, Loader2, MessageSquare, Server, Search, User as UserIcon, Menu } from 'lucide-react';
import TicketView from '@/components/TicketView';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

export default function Dashboard({ user, authorizedGuilds }) {
    const [selectedServer, setSelectedServer] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [activeFilter, setActiveFilter] = useState('open');
    const [serverData, setServerData] = useState({ staffMembers: [], allMembers: {}, channels: {} });
    const [searchTerm, setSearchTerm] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!selectedServer) {
            setTickets([]);
            setServerData({ staffMembers: [], allMembers: {}, channels: {} });
            return;
        }
        setSelectedTicket(null);
        setSidebarOpen(false);

        setLoadingTickets(true);
        const ticketsCollectionRef = collection(db, 'tickets');

        const queryConstraints = [where('serverId', '==', selectedServer.id), orderBy('createdAt', 'desc')];

        if (activeFilter === 'assigned_to_me') {
            queryConstraints.push(where('status', '==', 'open'), where('assignedTo', '==', user.id));
        } else if (activeFilter === 'unassigned') {
            queryConstraints.push(where('status', '==', 'open'), where('assignedTo', '==', null));
        } else {
            queryConstraints.push(where('status', '==', activeFilter));
        }

        const q = query(ticketsCollectionRef, ...queryConstraints);

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setTickets(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingTickets(false);
        });

        const fetchServerData = async () => {
            try {
                const response = await fetch(`/api/get-server-data?guildId=${selectedServer.id}`);
                const data = await response.json();
                if (response.ok) setServerData(data);
                else console.error("Failed to fetch server data:", data.error);
            } catch (error) {
                console.error("Error fetching server data:", error);
            }
        };
        fetchServerData();

        return () => unsubscribe();
    }, [selectedServer, activeFilter, user.id]);

    const filteredTickets = useMemo(() => {
        if (!searchTerm) return tickets;
        return tickets.filter(ticket => {
            const lowerCaseSearch = searchTerm.toLowerCase();
            return ticket.title.toLowerCase().includes(lowerCaseSearch) ||
                ticket.openerUsername.toLowerCase().includes(lowerCaseSearch) ||
                ticket.tags?.some(tag => tag.toLowerCase().includes(lowerCaseSearch));
        });
    }, [tickets, searchTerm]);

    const showTicketList = () => setSelectedTicket(null);

    const priorityStyles = {
        high: 'bg-red-500/20 text-red-400 border-red-500/30',
        medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };

    return (
        <div className="flex h-screen bg-neutral-950 text-neutral-200 font-sans">
            <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-neutral-900 border-r border-neutral-800 p-4 flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar user={user} authorizedGuilds={authorizedGuilds} selectedServer={selectedServer} setSelectedServer={setSelectedServer} onSignOut={() => signOut({ callbackUrl: '/' })} />
            </div>
            {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)}></div>}

            <aside className="w-64 bg-neutral-900 border-r border-neutral-800 p-4 hidden lg:flex lg:flex-col">
                <Sidebar user={user} authorizedGuilds={authorizedGuilds} selectedServer={selectedServer} setSelectedServer={setSelectedServer} onSignOut={() => signOut({ callbackUrl: '/' })} />
            </aside>

            <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
                <div className="lg:hidden flex items-center mb-4">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-md hover:bg-neutral-800/50">
                        <Menu className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-bold ml-4">{selectedServer ? selectedServer.name : 'Dashboard'}</h1>
                </div>

                {!selectedServer ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Server className="h-16 w-16 text-neutral-700 mb-4" />
                        <h2 className="text-2xl font-bold text-neutral-300">Select a Server</h2>
                        <p className="text-neutral-500 mt-2">Choose a server from the sidebar to view its tickets.</p>
                    </div>
                ) : selectedTicket ? (
                    <TicketView ticket={selectedTicket} onBack={showTicketList} user={user} serverData={serverData} />
                ) : (
                    <div>
                        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                            <h1 className="text-3xl font-bold text-neutral-100 hidden lg:block">Tickets</h1>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                                <div className="relative w-full sm:w-auto">
                                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-neutral-800/80 border border-neutral-700 rounded-lg pl-9 pr-3 py-1.5 text-sm w-full sm:w-48 focus:w-full sm:focus:w-64 transition-all focus:outline-none focus:border-indigo-500/50"/>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex space-x-1 bg-neutral-800/80 p-1 rounded-lg">
                                        <button onClick={() => setActiveFilter('open')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeFilter === 'open' ? 'bg-neutral-700 shadow-sm' : 'hover:bg-neutral-700/50 text-neutral-400'}`}>All Open</button>
                                        <button onClick={() => setActiveFilter('assigned_to_me')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeFilter === 'assigned_to_me' ? 'bg-neutral-700 shadow-sm' : 'hover:bg-neutral-700/50 text-neutral-400'}`}>My Tickets</button>
                                        <button onClick={() => setActiveFilter('unassigned')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeFilter === 'unassigned' ? 'bg-neutral-700 shadow-sm' : 'hover:bg-neutral-700/50 text-neutral-400'}`}>Unassigned</button>
                                    </div>
                                    <div className="flex space-x-1 bg-neutral-800/80 p-1 rounded-lg">
                                        <button onClick={() => setActiveFilter('resolved')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeFilter === 'resolved' ? 'bg-neutral-700 shadow-sm' : 'hover:bg-neutral-700/50 text-neutral-400'}`}>Resolved</button>
                                        <button onClick={() => setActiveFilter('closed')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeFilter === 'closed' ? 'bg-neutral-700 shadow-sm' : 'hover:bg-neutral-700/50 text-neutral-400'}`}>Closed</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {loadingTickets ? (
                                <div className="flex items-center justify-center p-10 text-neutral-500"> <Loader2 className="animate-spin h-6 w-6 mr-3"/>Loading tickets...</div>
                            ) : filteredTickets.length > 0 ? (
                                filteredTickets.map(ticket => (
                                    <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="relative p-4 bg-neutral-900 rounded-lg border border-neutral-800 hover:border-indigo-500/50 cursor-pointer transition-all">
                                        {ticket.isRead === false && (
                                            <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-indigo-400 flex items-center justify-center">
                                                <span className="absolute h-full w-full rounded-full bg-indigo-400 animate-ping"></span>
                                            </span>
                                        )}
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-grow">
                                                <p className="font-semibold text-base text-neutral-100">{ticket.title}</p>
                                                <p className="text-sm text-neutral-400 mt-1">
                                                    Opened by <span className="font-medium text-neutral-300">{ticket.openerUsername}</span>
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${priorityStyles[ticket.priority] || priorityStyles.low}`}>
                                                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                                                </div>
                                            </div>
                                        </div>
                                        {ticket.tags && ticket.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-neutral-800">
                                                {ticket.tags.map(tag => (
                                                    <span key={tag} className="bg-neutral-800 px-2 py-0.5 rounded-full text-xs text-neutral-400">{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center p-10 bg-neutral-900 rounded-lg border border-dashed border-neutral-800">
                                    <p className="font-medium text-neutral-400">{searchTerm ? `No results for "${searchTerm}"` : `No tickets found for this filter.`}</p>
                                    <p className="text-sm text-neutral-600">{searchTerm ? 'Try a different search term.' : 'This view is currently empty.'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export async function getServerSideProps(context) {
    const session = await getSession(context);
    if (!session) {
        return { redirect: { destination: '/', permanent: false } };
    }

    const [userGuildsResponse, serverConfigsSnapshot] = await Promise.all([
        fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: { Authorization: `Bearer ${session.accessToken}` },
        }),
        getDocs(collection(db, 'servers'))
    ]);

    if (!userGuildsResponse.ok) {
        return { props: { user: session.user, authorizedGuilds: [] } };
    }
    const userGuilds = await userGuildsResponse.json();
    if (!Array.isArray(userGuilds)) {
        return { props: { user: session.user, authorizedGuilds: [] } };
    }

    const serverConfigs = new Map(serverConfigsSnapshot.docs.map(doc => [doc.id, doc.data()]));

    const guildsToCheckRoles = [];
    const authorizedGuilds = userGuilds.filter(guild => {
        if (!serverConfigs.has(guild.id)) return false;
        if (guild.owner) return true;
        if (guild.permissions && (BigInt(guild.permissions) & BigInt(0x8)) === BigInt(0x8)) return true;
        guildsToCheckRoles.push(guild);
        return false;
    });

    if (guildsToCheckRoles.length > 0) {
        const memberPromises = guildsToCheckRoles.map(guild =>
            fetch(`https://discord.com/api/v10/users/@me/guilds/${guild.id}/member`, {
                headers: { Authorization: `Bearer ${session.accessToken}` },
            }).then(res => res.ok ? res.json() : null)
        );
        const memberDetailsArray = await Promise.all(memberPromises);

        memberDetailsArray.forEach((memberDetails, index) => {
            if (!memberDetails) return;
            const guild = guildsToCheckRoles[index];
            const config = serverConfigs.get(guild.id);
            const userRoleIds = new Set(memberDetails.roles);
            const hasAccessRole = config.accessRoles?.some(ar => userRoleIds.has(ar.roleId));
            if (hasAccessRole) authorizedGuilds.push(guild);
        });
    }

    return {
        props: {
            user: session.user,
            authorizedGuilds: authorizedGuilds.sort((a,b) => a.name.localeCompare(b.name)),
        },
    };
}
