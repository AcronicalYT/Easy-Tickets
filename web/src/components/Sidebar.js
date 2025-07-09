import { LogOut, Settings, Loader2, MessageSquare, Server, Search, User as UserIcon, Menu, X as CloseIcon } from 'lucide-react';
import Link from 'next/link';

export default function Sidebar({ user, authorizedGuilds, selectedServer, setSelectedServer, onSignOut }) {
    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    return (
        <>
            <div className="flex items-center mb-8 px-2">
                <MessageSquare className="h-8 w-8 text-indigo-400" />
                <h1 className="text-xl font-bold ml-2">Ticket Panel</h1>
            </div>

            <nav className="flex-grow space-y-2">
                <h2 className="text-xs font-semibold text-neutral-500 mb-2 px-2 uppercase tracking-wider">Servers</h2>
                {authorizedGuilds.map(guild => (
                    <button key={guild.id} onClick={() => setSelectedServer(guild)} className={`flex items-center w-full p-2 rounded-md text-left transition-colors ${selectedServer?.id === guild.id ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-neutral-800/50'}`}>
                        {guild.icon ? (
                            <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`} className="w-8 h-8 rounded-md mr-3" alt={guild.name}/>
                        ) : (
                            <div className="w-8 h-8 rounded-md mr-3 flex-shrink-0 flex items-center justify-center bg-neutral-700 text-xs font-bold">
                                {getInitials(guild.name)}
                            </div>
                        )}
                        <span className="font-medium truncate">{guild.name}</span>
                    </button>
                ))}
                {authorizedGuilds.length === 0 && (
                    <p className="text-sm text-neutral-500 px-2">No authorized servers found.</p>
                )}
            </nav>

            <div className="border-t border-neutral-800 pt-4 space-y-2">
                <Link href="/dashboard/preferences" className="flex items-center w-full p-2 rounded-md hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200 transition-colors">
                    <UserIcon className="h-4 w-4 mr-2"/>
                    My Preferences
                </Link>
                {selectedServer && selectedServer.owner && (
                    <Link href={`/dashboard/settings?serverId=${selectedServer.id}`} className="flex items-center w-full p-2 rounded-md hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200 transition-colors">
                        <Settings className="h-4 w-4 mr-2"/>
                        Server Settings
                    </Link>
                )}
                <div className="flex items-center p-2">
                    <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                    <div className="flex-grow truncate">
                        <p className="font-bold text-sm">{user.name}</p>
                    </div>
                    <button onClick={onSignOut} className="ml-2 p-2 rounded-md hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors">
                        <LogOut className="h-4 w-4"/>
                    </button>
                </div>
            </div>
        </>
    );
}