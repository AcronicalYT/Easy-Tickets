const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { doc, setDoc } = require('firebase/firestore');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Sets up the ticketing system for this server.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where users will open tickets.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, db) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel');
        const guild = interaction.guild;

        try {
            const ticketEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Support Ticket')
                .setDescription('Click the button below to open a support ticket.\nPlease provide as much detail as possible so our staff can assist you effectively.')
                .setFooter({ text: `${guild.name} Support`, iconURL: guild.iconURL() });

            const openTicketButton = new ButtonBuilder()
                .setCustomId('open_ticket_button')
                .setLabel('Open Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎟️');

            const row = new ActionRowBuilder().addComponents(openTicketButton);

            const message = await channel.send({ embeds: [ticketEmbed], components: [row] });

            const serverConfig = {
                serverName: guild.name,
                ticketChannelId: channel.id,
                ticketMessageId: message.id,
                accessRoles: [],
                tags: []
            };

            const serverDocRef = doc(db, 'servers', guild.id);
            await setDoc(serverDocRef, serverConfig);

            await interaction.editReply({ content: `✅ Successfully set up the ticketing system in ${channel}!`, ephemeral: true });
        } catch (error) {
            console.error("Error during setup command:", error);
            await interaction.editReply({ content: '❌ An error occurred while setting up the ticketing system. Please check my permissions and try again.', ephemeral: true });
        }
    },
};
