const { Events, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } = require('firebase/firestore');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, db) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            try {
                await command.execute(interaction, db);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);
            }
        } else if (interaction.isButton()) {
            await interaction.deferUpdate();

            const customId = interaction.customId;

            if (customId === 'open_ticket_button') {
                const guild = interaction.guild;
                const user = interaction.user;

                try {
                    const thread = await interaction.channel.threads.create({
                        name: `ticket-${user.username}`,
                        autoArchiveDuration: 60,
                        type: ChannelType.PrivateThread,
                        reason: `Support ticket for ${user.tag}`,
                    });

                    await thread.members.add(user.id);

                    const ticketsCollectionRef = collection(db, 'tickets');
                    const newTicketDoc = await addDoc(ticketsCollectionRef, {
                        serverId: guild.id,
                        threadId: thread.id,
                        openerId: user.id,
                        openerUsername: user.username,
                        openerAvatar: user.displayAvatarURL(),
                        title: `Ticket by ${user.username}`,
                        status: 'open',
                        priority: 'low',
                        assignedTo: null,
                        createdAt: serverTimestamp(),
                        closedAt: null,
                        tags: [],
                    });

                    const welcomeEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setTitle(`Support Ticket #${newTicketDoc.id.substring(0, 6)}`)
                        .setDescription(`Hello ${user}, thank you for reaching out to support.\n\nA staff member will be with you shortly. Please describe your issue in detail here.`);

                    const closeButton = new ButtonBuilder()
                        .setCustomId(`close_ticket_${newTicketDoc.id}`)
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒');

                    const row = new ActionRowBuilder().addComponents(closeButton);

                    await thread.send({ embeds: [welcomeEmbed], components: [row] });

                    await interaction.followUp({ content: `✅ Your ticket has been created in ${thread}!`, ephemeral: true });
                } catch (error) {
                    console.error("Error creating ticket:", error);
                    await interaction.followUp({ content: '❌ An error occurred while creating your ticket.', ephemeral: true });
                }
            } else if (customId.startsWith('close_ticket_')) {
                try {
                    const ticketsCollectionRef = collection(db, 'tickets');
                    const q = query(ticketsCollectionRef, where('threadId', '==', interaction.channel.id));
                    const querySnapshot = await getDocs(q);

                    if (querySnapshot.empty) {
                        return interaction.followUp({ content: 'Could not find a corresponding ticket for this thread.', ephemeral: true });
                    }

                    const ticketDoc = querySnapshot.docs[0];
                    const ticketData = ticketDoc.data();

                    if (ticketData.openerId !== interaction.user.id) {
                        return interaction.followUp({ content: 'You do not have permission to close this ticket.', ephemeral: true });
                    }

                    const ticketDocRef = doc(db, 'tickets', ticketDoc.id);
                    await updateDoc(ticketDocRef, {
                        status: 'closed',
                        closedAt: serverTimestamp()
                    });

                    await interaction.channel.setLocked(true, 'Ticket closed by user.');

                    const closeEmbed = new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('Ticket Closed')
                        .setDescription(`This ticket has been closed by ${interaction.user}. The thread is now locked.`)
                        .setTimestamp();

                    await interaction.channel.send({ embeds: [closeEmbed] });

                    const originalMessage = interaction.message;
                    const originalComponents = originalMessage.components[0].components;
                    const disabledComponents = originalComponents.map(component => {
                        return new ButtonBuilder(component.data).setDisabled(true);
                    });
                    const disabledRow = new ActionRowBuilder().addComponents(disabledComponents);
                    await originalMessage.edit({ components: [disabledRow] });
                } catch (error) {
                    console.error("Error closing ticket:", error);
                    await interaction.followUp({ content: 'An error occurred while closing the ticket.', ephemeral: true });
                }
            }
        }
    },
};
