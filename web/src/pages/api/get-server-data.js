import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// This API route fetches all necessary data for a given server:
export default async function handler(req, res) {
    const { guildId } = req.query;
    if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required.' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
        return res.status(500).json({ error: 'Bot token not configured.' });
    }

    const baseUrl = 'https://discord.com/api/v10';
    const headers = { Authorization: `Bot ${botToken}` };

    try {
        // Fetch all necessary data in parallel for performance
        const [
            guildDetailsResponse,
            membersResponse,
            channelsResponse,
            serverDocSnap
        ] = await Promise.all([
            fetch(`${baseUrl}/guilds/${guildId}`, { headers }),
            fetch(`${baseUrl}/guilds/${guildId}/members?limit=1000`, { headers }),
            fetch(`${baseUrl}/guilds/${guildId}/channels`, { headers }),
            getDoc(doc(db, 'servers', guildId))
        ]);

        if (!guildDetailsResponse.ok || !membersResponse.ok || !channelsResponse.ok) {
            throw new Error('Failed to fetch required data from Discord API.');
        }

        const guildDetails = await guildDetailsResponse.json();
        const members = await membersResponse.json();
        const channels = await channelsResponse.json();

        // --- Process Staff Members ---
        if (!serverDocSnap.exists() || !serverDocSnap.data().accessRoles) {
            return res.status(404).json({ error: 'Access roles not configured.' });
        }
        const accessRoles = serverDocSnap.data().accessRoles;
        const staffRoleIds = new Set(accessRoles.map(r => r.roleId));
        const staffMembers = members.filter(member =>
            !member.user.bot &&
            (member.user.id === guildDetails.owner_id || member.roles.some(roleId => staffRoleIds.has(roleId)))
        ).map(m => m.user);

        // --- Process All Members and Channels for Mentions ---
        const allMembersMap = new Map(members.map(m => [m.user.id, m.user.username]));
        const channelsMap = new Map(channels.map(c => [c.id, c.name]));

        res.status(200).json({
            staffMembers,
            allMembers: Object.fromEntries(allMembersMap),
            channels: Object.fromEntries(channelsMap),
        });
    } catch (error) {
        console.error(`[FATAL] Error in /api/get-server-data for guild ${guildId}:`, error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
}
