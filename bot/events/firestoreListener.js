const { collection, collectionGroup, query, where, onSnapshot, getDoc, updateDoc } = require('firebase/firestore');
const { EmbedBuilder } = require('discord.js');

const ticketAssignmentState = new Map();

/**
 * Sets up listeners on Firestore to react to database changes and interact with Discord.
 * @param {Firestore} db The Firestore database instance.
 * @param {Client} client The Discord client instance.
 */
function setupFirestoreListener(db, client) {
    const messagesQuery = query(
        collectionGroup(db, 'messages'),
        where('isStaff', '==', true)
    );

    onSnapshot(messagesQuery, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const messageData = change.doc.data();
                if (messageData.sentToDiscord) return;

                const ticketRef = change.doc.ref.parent.parent;
                try {
                    const ticketSnapshot = await getDoc(ticketRef);
                    if (!ticketSnapshot.exists()) return;

                    const ticketData = ticketSnapshot.data();
                    const guild = await client.guilds.fetch(ticketData.serverId);
                    if (!guild) return;
                    const thread = await guild.channels.fetch(ticketData.threadId);
                    if (!thread) return;

                    const staffReplyEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setAuthor({ name: `${messageData.authorUsername} (Staff)`, iconURL: messageData.authorAvatar })
                        .setDescription(messageData.content)
                        .setTimestamp(messageData.timestamp ? messageData.timestamp.toDate() : new Date());

                    const messagePayload = { embeds: [staffReplyEmbed] };

                    if (messageData.pingUser) {
                        messagePayload.content = `<@${ticketData.openerId}>`;
                    }

                    await thread.send(messagePayload);
                    await updateDoc(change.doc.ref, { sentToDiscord: true });
                } catch (error) {
                    console.error("Error sending staff reply to Discord:", error);
                }
            }
        });
    });

    const ticketsQuery = query(collection(db, 'tickets'));

    onSnapshot(ticketsQuery, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            const ticketId = change.doc.id;
            const ticketData = change.doc.data();
            const previousAssignedTo = ticketAssignmentState.get(ticketId);

            ticketAssignmentState.set(ticketId, ticketData.assignedTo);

            if (change.type === 'modified') {
                try {
                    const guild = await client.guilds.fetch(ticketData.serverId);
                    if (!guild) return;
                    const thread = await guild.channels.fetch(ticketData.threadId);
                    if (!thread) return;

                    if (ticketData.assignedTo !== previousAssignedTo) {
                        const assignmentEmbed = new EmbedBuilder()
                            .setColor('Yellow')
                            .setTitle('Ticket Assigned')
                            .setTimestamp();

                        if (ticketData.assignedTo) {
                            assignmentEmbed.setDescription(`This ticket has been assigned to **${ticketData.assignedToName}**.`);
                        } else {
                            assignmentEmbed.setDescription(`This ticket has been **unassigned** and is now available for all staff.`);
                        }
                        await thread.send({ embeds: [assignmentEmbed] });
                        return;
                    }

                    if (ticketData.status === 'closed' && !thread.locked) {
                        const closeEmbed = new EmbedBuilder()
                            .setColor('Red')
                            .setTitle('Ticket Closed')
                            .setDescription('This ticket has been closed by a staff member. The thread is now locked.')
                            .setTimestamp();
                        await thread.send({ embeds: [closeEmbed] });
                        await thread.setLocked(true, 'Ticket closed by staff from web panel.');
                    }
                    else if (ticketData.status === 'resolved') {
                        const resolveEmbed = new EmbedBuilder()
                            .setColor('Green')
                            .setTitle('Ticket Resolved')
                            .setDescription('This ticket has been marked as resolved by a staff member. If your issue is not solved, you can continue to send messages here.')
                            .setTimestamp();
                        await thread.send({ embeds: [resolveEmbed] });
                    }
                    else if (ticketData.status === 'open' && thread.locked) {
                        const openEmbed = new EmbedBuilder()
                            .setColor('Orange')
                            .setTitle('Ticket Re-opened')
                            .setDescription('This ticket has been re-opened by a staff member.')
                            .setTimestamp();
                        await thread.send({ embeds: [openEmbed] });
                        await thread.setLocked(false, 'Ticket re-opened by staff.');
                    }
                } catch (error) {
                    console.error("Error updating ticket status in Discord:", error);
                }
            } else if (change.type === 'added') {
                ticketAssignmentState.set(ticketId, ticketData.assignedTo);
            }
        });
    });

    console.log("🔥 Firestore listeners are now active.");
}

module.exports = { setupFirestoreListener };
