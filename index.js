const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags
} = require('discord.js');

const OWNER_ID      = "1481375123243143320";
const SUPPORT_ROLE_ID = "1483276954433224877";
const POST_ROLE_ID  = "1490735612024586300";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel],
});

const postSessions = new Map();
const claimed      = new Map();

function parseDuration(str) {
  const match = str && str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(match[1]) * multipliers[match[2]];
}

client.once('ready', () => {
  console.log(`✅ شغال: ${client.user.tag}`);
});

// ================= COMMANDS =================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const cmd  = args.shift();

  // ====== تايم @user 10m ======
  if (cmd === 'تايم') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply('❌ ما عندك صلاحية');

    const target      = message.mentions.members.first();
    const durationStr = args[1];

    if (!target)      return message.reply('❌ حدد المستخدم — مثال: `!تايم @user 10m`');
    if (!durationStr) return message.reply('❌ حدد المدة — مثال: `!تايم @user 10m`');

    const duration = parseDuration(durationStr);
    if (!duration) return message.reply('❌ المدة غلط. استخدم: `10s` `10m` `1h` `1d`');
    if (duration > 28 * 24 * 60 * 60 * 1000)
      return message.reply('❌ الحد الأقصى للتايم 28 يوم');

    try {
      await target.timeout(duration, `تايم بواسطة ${message.author.tag}`);
      return message.reply(`✅ تم تطبيق التايم على ${target} لمدة **${durationStr}**`);
    } catch (err) {
      console.error(err);
      return message.reply('❌ فشل التايم — تأكد من صلاحيات البوت وترتيب الرتب');
    }
  }

  // ====== فك @user ======
  if (cmd === 'فك') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply('❌ ما عندك صلاحية');

    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ حدد المستخدم — مثال: `!فك @user`');

    try {
      await target.timeout(null, `فك التايم بواسطة ${message.author.tag}`);
      return message.reply(`✅ تم فك التايم عن ${target}`);
    } catch (err) {
      console.error(err);
      return message.reply('❌ فشل فك التايم');
    }
  }

  // ====== تحذير @user reason ======
  if (cmd === 'تحذير') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply('❌ ما عندك صلاحية');

    const target = message.mentions.members.first();
    const reason = args.slice(1).join(' ');

    if (!target) return message.reply('❌ حدد المستخدم — مثال: `!تحذير @user السبب`');
    if (!reason) return message.reply('❌ اكتب السبب — مثال: `!تحذير @user السبب`');

    await target.send(`⚠️ تلقيت تحذيراً في **${message.guild.name}**\n**السبب:** ${reason}`).catch(() => null);
    return message.reply(`✅ تم تحذير ${target}\n**السبب:** ${reason}`);
  }

  // ====== بان @user ======
  if (cmd === 'بان') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply('❌ ما عندك صلاحية');

    const target = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'بدون سبب';

    if (!target)           return message.reply('❌ حدد المستخدم — مثال: `!بان @user`');
    if (!target.bannable)  return message.reply('❌ ما أقدر أبان هذا الشخص — تأكد من ترتيب الرتب');

    await target.send(`🔨 تم باكنك من **${message.guild.name}**\n**السبب:** ${reason}`).catch(() => null);
    await target.ban({ reason: `بان بواسطة ${message.author.tag}: ${reason}` });
    return message.reply(`✅ تم بان ${target.user.tag}\n**السبب:** ${reason}`);
  }

  // ====== رول (اونر فقط) ======
  if (cmd === 'رول') {
    if (message.author.id !== OWNER_ID)
      return message.reply('❌ للاونر فقط');

    const user = message.mentions.members.first();
    const role = message.mentions.roles.first();
    if (!user || !role) return message.reply('مثال: `!رول @user @role`');

    await user.roles.add(role);
    return message.reply('✅ تم إعطاء الرتبة');
  }

  // ====== لوحة التكت ======
  if (cmd === 'دعم') {
    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_ticket')
        .setLabel('🎫 فتح تذكرة')
        .setStyle(ButtonStyle.Success)
    );
    return message.channel.send({ content: '📩 اضغط لفتح تذكرة الدعم', components: [btn] });
  }

  // ====== منشور ======
  if (cmd === 'منشور') {
    if (!message.member.roles.cache.has(POST_ROLE_ID))
      return message.reply('❌ ما عندك صلاحية');

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('post_start')
        .setLabel('📢 نشر')
        .setStyle(ButtonStyle.Primary)
    );
    return message.channel.send({ content: 'اضغط لبدء النشر', components: [btn] });
  }

  // بعد اختيار الروم — يكتب المنشور
  if (postSessions.has(message.author.id)) {
    const channelId = postSessions.get(message.author.id);
    const ch = message.guild.channels.cache.get(channelId);
    if (ch) {
      await ch.send(`@everyone\n\n${message.content}\n\n— ${message.author.username}`);
      await message.reply('✅ تم النشر');
    }
    postSessions.delete(message.author.id);
  }
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.guild) return;

  // ====== فتح تكت ======
  if (interaction.isButton() && interaction.customId === 'open_ticket') {
    const existing = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.username}`
    );
    if (existing)
      return interaction.reply({ content: `عندك تكت مفتوح: ${existing}`, flags: MessageFlags.Ephemeral });

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id,   deny:  [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id,    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: SUPPORT_ROLE_ID,        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      ],
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('claim').setLabel('✋ استلام').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('close').setLabel('🔒 إغلاق').setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@&${SUPPORT_ROLE_ID}> 📢 تذكرة جديدة\n${interaction.user} شرح مشكلتك وانتظر الرد.`,
      components: [row],
    });

    return interaction.reply({ content: `✅ تم فتح تكتك: ${channel}`, flags: MessageFlags.Ephemeral });
  }

  // ====== استلام ======
  if (interaction.isButton() && interaction.customId === 'claim') {
    if (!interaction.member.roles.cache.has(SUPPORT_ROLE_ID) &&
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: '❌ فقط الدعم يقدر يستلم', flags: MessageFlags.Ephemeral });

    if (claimed.has(interaction.channel.id))
      return interaction.reply({ content: '❌ التكت مستلم بالفعل', flags: MessageFlags.Ephemeral });

    claimed.set(interaction.channel.id, interaction.user.id);
    return interaction.reply(`✅ تم الاستلام بواسطة ${interaction.user}`);
  }

  // ====== إغلاق ======
  if (interaction.isButton() && interaction.customId === 'close') {
    const isClaimer = claimed.get(interaction.channel.id) === interaction.user.id;
    const isSupport = interaction.member.roles.cache.has(SUPPORT_ROLE_ID);
    const isAdmin   = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!isClaimer && !isSupport && !isAdmin)
      return interaction.reply({ content: '❌ فقط المستلم أو الدعم يقدرون يقفلون', flags: MessageFlags.Ephemeral });

    claimed.delete(interaction.channel.id);
    await interaction.reply('🗑️ جاري الإغلاق...');
    setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
  }

  // ====== زر النشر ======
  if (interaction.isButton() && interaction.customId === 'post_start') {
    const channels = interaction.guild.channels.cache
      .filter(c => c.type === ChannelType.GuildText)
      .map(c => ({ label: c.name, value: c.id }))
      .slice(0, 25);

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_room')
        .setPlaceholder('اختر الروم')
        .addOptions(channels)
    );

    return interaction.reply({ content: 'اختر الروم', components: [menu], flags: MessageFlags.Ephemeral });
  }

  // ====== اختيار روم ======
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_room') {
    postSessions.set(interaction.user.id, interaction.values[0]);
    return interaction.update({ content: '✅ اكتب المنشور الآن في الشات', components: [] });
  }
});

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN غير موجود');
  process.exit(1);
}

client.login(TOKEN);
