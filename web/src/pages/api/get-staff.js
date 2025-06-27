import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default async function handler(req, res) {
    const { guildId } = req.query;
    if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required.' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
        console.error("DISCORD_BOT_TOKEN is not set in .env.local");
        return res.status(500).json({ error: 'Bot token not configured on the server.' });
    }

    const baseUrl = 'https://discord.com/api/v10';
    const headers = { Authorization: `Bot ${botToken}` };

    try {
        const serverDocRef = doc(db, 'servers', guildId);
        const serverDocSnap = await getDoc(serverDocRef);

        if (!serverDocSnap.exists() || !serverDocSnap.data().accessRoles) {
            return res.status(404).json({ error: 'Access roles not configured for this server.' });
        }

        const accessRoles = serverDocSnap.data().accessRoles;
        const staffRoleIds = new Set(accessRoles.map(r => r.roleId));

        const guildResponse = await fetch(`${baseUrl}/guilds/${guildId}`, { headers });
        if (!guildResponse.ok) throw new Error('Failed to fetch guild details.');
        const guildDetails = await guildResponse.json();

        const membersResponse = await fetch(`${baseUrl}/guilds/${guildId}/members?limit=1000`, { headers });
        if (!membersResponse.ok) {
            throw new Error(`Failed to fetch members. Status: ${membersResponse.status}`);
        }
        const members = await membersResponse.json();
        if (!Array.isArray(members)) {
            throw new Error("Invalid data received for members from Discord API.");
        }

        const staffMembers = members.filter(member =>
            !member.user.bot &&
            (member.user.id === guildDetails.owner_id || member.roles.some(roleId => staffRoleIds.has(roleId)))
        );

        res.status(200).json(staffMembers.map(m => m.user));
    } catch (error) {
        console.error(`[FATAL] Error in /api/get-staff for guild ${guildId}:`, error);
        res.status(500).json({ error: 'An internal server error occurred while fetching staff.' });
    }
}
