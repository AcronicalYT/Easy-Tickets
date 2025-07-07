const { Events } = require('discord.js');
const { collection, query, where, getDocs, doc, addDoc, serverTimestamp, updateDoc } = require('firebase/firestore');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, db) {
        if (message.author.bot || !message.channel.isThread()) {
            return;
        }

        try {
            const ticketsCollectionRef = collection(db, 'tickets');
            const q = query(ticketsCollectionRef, where('threadId', '==', message.channel.id));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return;
            }

            const ticketDoc = querySnapshot.docs[0];

            const messagePayload = {
                authorId: message.author.id,
                authorUsername: message.author.username,
                authorAvatar: message.author.displayAvatarURL(),
                content: message.content,
                timestamp: serverTimestamp(),
                isStaff: false,
            };

            if (message.attachments.size > 0) {
                messagePayload.attachments = message.attachments.map(att => ({
                    url: att.url,
                    name: att.name,
                    contentType: att.contentType
                }));
            }

            if (message.stickers.size > 0) {
                messagePayload.stickers = message.stickers.map(sticker => sticker.url);
            }

            const messagesCollectionRef = collection(db, 'tickets', ticketDoc.id, 'messages');
            await addDoc(messagesCollectionRef, messagePayload);

            const ticketDocRef = doc(db, 'tickets', ticketDoc.id);
            await updateDoc(ticketDocRef, {
                lastMessageAt: serverTimestamp(),
                isRead: false
            });
        } catch (error) {
            console.error("Error saving message to Firestore:", error);
        }
    },
};
