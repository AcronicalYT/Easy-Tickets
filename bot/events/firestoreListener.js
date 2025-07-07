const { collection, collectionGroup, query, where, onSnapshot, getDoc, updateDoc, addDoc, serverTimestamp, doc } = require('firebase/firestore');
const { EmbedBuilder } = require('discord.js');

const ticketAssignmentState = new Map();

/**
 * Creates an event message in the Firestore messages sub-collection.
 * @param {DocumentReference} ticketRef Reference to the ticket document.
 * @param {string} text The text of the event.
 */
async function createEventMessage(ticketRef, text) {
    const messagesCollectionRef = collection(ticketRef, 'messages');
    await addDoc(messagesCollectionRef, {
        type: 'event',
        text: text,
        timestamp: serverTimestamp(),
    });
}

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
            const ticketRef = doc(db, 'tickets', ticketId);
            const previousAssignedTo = ticketAssignmentState.get(ticketId);

            ticketAssignmentState.set(ticketId, ticketData.assignedTo);

            if (change.type === 'modified') {
                try {
                    const guild = await client.guilds.fetch(ticketData.serverId);
                    if (!guild) return;
                    const thread = await guild.channels.fetch(ticketData.threadId);
                    if (!thread) return;

                    if (ticketData.assignedTo !== previousAssignedTo) {
                        const eventText = ticketData.assignedTo
                            ? `Ticket assigned to ${ticketData.assignedToName}.`
                            : 'Ticket was unassigned.';
                        await createEventMessage(ticketRef, eventText);

                        const assignmentEmbed = new EmbedBuilder().setColor('Yellow').setTitle('Ticket Assigned').setDescription(eventText).setTimestamp();
                        await thread.send({ embeds: [assignmentEmbed] });
                        return;
                    }

                    if (ticketData.status === 'closed' && !thread.locked) {
                        const eventText = 'Ticket closed by staff.';
                        await createEventMessage(ticketRef, eventText);
                        const closeEmbed = new EmbedBuilder().setColor('Red').setTitle('Ticket Closed').setDescription('This ticket has been closed by a staff member. The thread is now locked.').setTimestamp();
                        await thread.send({ embeds: [closeEmbed] });
                        await thread.setLocked(true, 'Ticket closed by staff from web panel.');
                    }
                    else if (ticketData.status === 'resolved') {
                        const eventText = 'Ticket marked as resolved.';
                        await createEventMessage(ticketRef, eventText);
                        const resolveEmbed = new EmbedBuilder().setColor('Green').setTitle('Ticket Resolved').setDescription('This ticket has been marked as resolved by a staff member. If your issue is not solved, you can continue to send messages here.').setTimestamp();
                        await thread.send({ embeds: [resolveEmbed] });
                    }
                    else if (ticketData.status === 'open' && thread.locked) {
                        const eventText = 'Ticket was re-opened.';
                        await createEventMessage(ticketRef, eventText);
                        const openEmbed = new EmbedBuilder().setColor('Orange').setTitle('Ticket Re-opened').setDescription('This ticket has been re-opened by a staff member.').setTimestamp();
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
