import { useState, useEffect, useRef } from 'react';
import { getSession } from 'next-auth/react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, X, ChevronDown } from 'lucide-react';
import { getServerRoles } from '../api/get-roles';

export default function SettingsPage({ serverId, initialAccessRoles, serverRoles, isOwner, hasAdminPermissions, serverName }) {
    const [accessRoles, setAccessRoles] =useState(initialAccessRoles);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);


    if (!isOwner && !hasAdminPermissions) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-neutral-200">
                <h1 className="text-3xl font-bold text-red-500">Access Denied</h1>
                <p className="text-neutral-400 mt-2">You must be the server owner to access this page.</p>
                <Link href="/dashboard" className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                    Go Back to Dashboard
                </Link>
            </div>
        );
    }

    const handleRoleToggle = (roleId, roleName) => {
        setAccessRoles(prev => {
            const exists = prev.some(r => r.roleId === roleId);
            if (exists) {
                return prev.filter(r => r.roleId !== roleId);
            } else {
                return [...prev, { roleId, roleName }];
            }
        });
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setSaveMessage('');
        const serverDocRef = doc(db, 'servers', serverId);
        try {
            await updateDoc(serverDocRef, { accessRoles: accessRoles });
            setSaveMessage('Settings saved successfully!');
        } catch (error) {
            console.error("Error saving settings:", error);
            setSaveMessage('Failed to save settings.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(''), 3000);
        }
    };

    const handleRoleSelect = (role) => {
        handleRoleToggle(role.id, role.name);
        setIsDropdownOpen(false);
    };

    const availableRoles = serverRoles.filter(
        serverRole => !accessRoles.some(accessRole => accessRole.roleId === serverRole.id)
    );

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <Link href="/dashboard" className="inline-flex items-center text-neutral-400 hover:text-white mb-8 transition-colors text-sm">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
                </Link>

                <div className="animate-fade-in-up">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Panel Access for <span className="text-indigo-400">{serverName}</span></h1>
                    <p className="text-neutral-400 mb-8">Select which roles have permission to view and manage tickets in the web panel.</p>

                    <div className="bg-neutral-900 rounded-lg shadow-lg p-6 border border-neutral-800">
                        <div className="p-4 bg-black/20 rounded-md border border-neutral-700/50 backdrop-blur-sm">
                            <h2 className="text-lg font-bold mb-3 text-neutral-300">Staff Roles</h2>
                            <div className="relative" ref={dropdownRef}>
                                <label htmlFor="role-select" className="sr-only">Add a role</label>
                                <button
                                    id="role-select"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full flex justify-between items-center bg-neutral-800/80 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-400 focus:outline-none focus:border-indigo-500 appearance-none transition-colors"
                                >
                                    <span>Click to add a role...</span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isDropdownOpen && (
                                    <div className="absolute top-full mt-2 w-full bg-neutral-800 border border-neutral-700 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                                        {availableRoles.length > 0 ? availableRoles.map(role => (
                                            <button
                                                key={role.id}
                                                onClick={() => handleRoleSelect(role)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-600/50 transition-colors flex items-center"
                                            >
                                                <span className="w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99AAB5' }}></span>
                                                {role.name}
                                            </button>
                                        )) : <p className="text-sm text-center py-2 text-neutral-500">No more roles to add.</p>}
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 min-h-[24px]">
                                {accessRoles.map(role => {
                                    const fullRole = serverRoles.find(r => r.id === role.roleId);
                                    const roleColor = fullRole?.color ? `#${fullRole.color.toString(16).padStart(6, '0')}` : '#99AAB5';
                                    return (
                                        <div key={role.roleId} className="flex items-center bg-neutral-700/80 pl-2.5 pr-1 py-1 rounded-full text-sm font-medium text-neutral-200">
                                            <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: roleColor }}></span>
                                            <span>{role.roleName}</span>
                                            <button onClick={() => handleRoleToggle(role.roleId, role.roleName)} className="ml-2 p-0.5 rounded-full text-neutral-400 hover:bg-neutral-600 hover:text-white transition-colors">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end items-center">
                        {saveMessage && (
                            <p className={`mr-4 text-sm ${saveMessage.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                                {saveMessage}
                            </p>
                        )}
                        <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:cursor-wait transition-colors font-semibold"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export async function getServerSideProps(context) {
    const session = await getSession(context);
    const { serverId } = context.query;

    if (!session || !serverId) {
        return { redirect: { destination: '/', permanent: false } };
    }

    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${serverId}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    });
    if (!guildResponse.ok) return { notFound: true };
    const guildDetails = await guildResponse.json();
    const isOwner = session.user.id === guildDetails.owner_id;

    let serverRoles = [];
    try {
        serverRoles = await getServerRoles(serverId);
    } catch (error) {
        console.error("Failed to get server roles in settings page:", error.message);
    }

    const memberResponse = await fetch(
        `https://discord.com/api/v10/guilds/${serverId}/members/${session.user.id}`,
        { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
    );
    if (!memberResponse.ok) return { notFound: true };
    const member = await memberResponse.json();
    const adminRoles = serverRoles.filter(
        role => (BigInt(role.permissions) & 0x8n) !== 0n
    ).map(role => role.id);
    const hasAdminPermissions = member.roles.some(roleId => adminRoles.includes(roleId));

    const serverDocRef = doc(db, 'servers', serverId);
    const serverDocSnap = await getDoc(serverDocRef);
    const initialAccessRoles = serverDocSnap.exists() ? serverDocSnap.data().accessRoles : [];

    return {
        props: {
            serverId,
            initialAccessRoles,
            serverRoles,
            isOwner,
            hasAdminPermissions,
            serverName: guildDetails.name
        },
    };
}
