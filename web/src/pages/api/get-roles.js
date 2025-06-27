import { PermissionsBitField } from 'discord.js';

/**
 * The core logic for fetching roles from a Discord server.
 * This can be called directly from other server-side code.
 * @param {string} guildId The ID of the Discord server.
 * @returns {Promise<Array>} A promise that resolves to an array of role objects.
 */
export async function getServerRoles(guildId) {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
        throw new Error('Bot token not configured on the server.');
    }

    const baseUrl = 'https://discord.com/api/v10';
    const headers = { Authorization: `Bot ${botToken}` };

    const rolesResponse = await fetch(`${baseUrl}/guilds/${guildId}/roles`, { headers });
    if (!rolesResponse.ok) {
        const errorText = await rolesResponse.text();
        console.error('Failed to fetch roles:', errorText);
        throw new Error(`Failed to fetch roles. Status: ${rolesResponse.status}`);
    }
    const roles = await rolesResponse.json();
    return roles
        .filter(role => role.name !== '@everyone')
        .sort((a, b) => b.position - a.position);
}

export default async function handler(req, res) {
    const { guildId } = req.query;
    if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required.' });
    }

    try {
        const roles = await getServerRoles(guildId);
        res.status(200).json(roles);
    } catch (error) {
        console.error(`Error in /api/get-roles for guild ${guildId}:`, error.message);
        res.status(500).json({ error: 'An internal error occurred.' });
    }
}
