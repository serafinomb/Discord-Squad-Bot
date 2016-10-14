require('dotenv').config();

const asciitable = require('asciitable');

const Discord = require('discord.js');
const client = new Discord.Client();

const token = process.env.TOKEN;

let squadList = {};

client.on('ready', () => {
  console.log('ready');
});

client.on('message', message => {

  if ( ! squadList[message.channel.id]) {
    squadList[message.channel.id] = {};
  }

  if (message.content == '/help') {
    let text = '```' +
`Info:
- All available squads can be found in the pinned messages (top right).

Usage:
/command [parameter[ …]]
- Elements in square brackets are optional

Available commands:
– /help  Show this help message.
– /commands  Show all available commands.
– /clear  Delete the channel chat history. Need the "Manage Messages" permission.
– /create  [@mention[ …]]  Create a new squad and add the @mention-ed person(s).
– /join  @mention  Join the squad whom leader is @mention.
– /leave  @mention  Leave the squad whom leader is @mention.

Available squad leader commands:
– /add  @mention[ …]]  Add the @mention-ed person(s) to the squad.
– /kick  @mention[ …]]  Kick the @mention-ed person(s) from the squad.
– /close  Close the squad.
– /open  Open the squad.
– /describe  <description>  Add a short description to the squad (maximum 150 characters). Update the description with the same command.
– /transfer  @mention  Promote @mention to squad leader.
– /disband  Disband the squad. This action is irreversible. Use /close to temporarly disable joining.` +
'```';
    message.channel.sendMessage(text);
  }

  else if (message.content == '/commands') {
    let text =
`Available commands: \`/help\`, \`/commands\`, \`/clear\`, \`/create\`, \`/join\`, \`/leave\`.
Available squad leader commands: \`/add\`, \`/kick\`, \`/close\`, \`/open\`, \`/describe\`, \`/transfer\`, \`/disband\`.`;

    message.channel.sendMessage(text);
  }

  else if (message.content.startsWith('/create')) {
    let squadLeader = message.author;

    if (squadList[message.channel.id][squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are already leader of a squad. Type \`/transfer @mention\` to transfer the lead to somebody else. Type \`/disband\` to disband the squad.`);
      return;
    }

    squadList[message.channel.id][squadLeader.id] = {
      leader: null,
      users: [],
      pinnedMessage: null,
      description: '',
      isOpen: true,
      isVisible: true
    };

    squadList[message.channel.id][squadLeader.id]['leader'] = squadLeader;
    squadList[message.channel.id][squadLeader.id]['users'].push(squadLeader);

    let triedToAddSelf = false;

    for (let mentionedUser of message.mentions.users.array()) {
      if ( ! triedToAddSelf && mentionedUser.id === squadLeader.id) {
        triedToAddSelf = true;
      } else {
        squadList[message.channel.id][squadLeader.id]['users'].push(mentionedUser);
      }
    }

    if (triedToAddSelf) {
      message.channel.sendMessage(`<@${message.author.id}> you have already joined the squad by creating it.`);
    }

    message.channel.sendMessage(`@here <@${squadLeader.id}> just created a new squad!`);

    let memberTable = makeMemberTable(message.channel.id, squadLeader);

    message.channel.sendMessage(memberTable)
      .then(m => {
        squadList[message.channel.id][squadLeader.id]['pinnedMessage'] = m;
        m.pin();
      });
  }

  else if (message.content.startsWith('/add')) {
    let squadLeader = message.author;

    if ( ! squadList[message.channel.id][squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    if (message.mentions.users.size === 0) {
      message.channel.sendMessage(`<@${message.author.id}> Please @mention the member(s) you want to add to the squad. Usage: \`/add @mention @mention\`.`);
      return;
    }

    let inSquadUserList = [];

    for (let mentionedUser of message.mentions.users.array()) {
      let isInSquad = squadList[message.channel.id][squadLeader.id]['users'].filter(user => user.id === mentionedUser.id).length;
      if (isInSquad) {
        inSquadUserList.push(mentionedUser);
      } else {
        squadList[message.channel.id][squadLeader.id]['users'].push(mentionedUser);
      }
    }

    if (inSquadUserList.length) {
      message.channel.sendMessage(`<@${message.author.id}> The following members are already in the squad: ${inSquadUserList.join(', ')}.`);
    }

    let memberTable = makeMemberTable(message.channel.id, squadLeader);
    squadList[message.channel.id][squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content.startsWith('/kick')) {
    let squadLeader = message.author;

    if ( ! squadList[message.channel.id][squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    if (message.mentions.users.size === 0) {
      message.channel.sendMessage(`<@${message.author.id}> Please @mention the members(s) you want to kick from the squad. Usage: \`/kick @mention @mention\`.`);
      return;
    }

    let notInSquadUserList = [];
    let triedToKickSelf = false;

    for (let mentionedUser of message.mentions.users.array()) {
      if ( ! triedToKickSelf && mentionedUser.id === message.author.id) {
        triedToKickSelf = true;
        continue;
      }

      let isInSquad = squadList[message.channel.id][squadLeader.id]['users'].filter(user => user.id === mentionedUser.id).length;
      if ( ! isInSquad) {
        notInSquadUserList.push(mentionedUser);
      } else {
        squadList[message.channel.id][squadLeader.id]['users'] = squadList[message.channel.id][squadLeader.id]['users'].filter(user => {
          return user.id !== mentionedUser.id || user.id === message.author.id;
        });
      }
    }

    if (triedToKickSelf) {
      message.channel.sendMessage(`<@${message.author.id}> You can't kick yourself from your own squad. Type \`/transfer @mention\` to transfer the lead to somebody else. Type \`/disband\` to disband the squad.`);
    }

    if (notInSquadUserList.length) {
      message.channel.sendMessage(`<@${message.author.id}> The following members were not in the squad: ${notInSquadUserList.join(', ')}.`);
    }

    let memberTable = makeMemberTable(message.channel.id, squadLeader);
    squadList[message.channel.id][squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content == '/open') {
    let squadLeader = message.author;

    if ( ! squadList[message.channel.id][squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[message.channel.id][squadLeader.id]['isOpen'] = true;

    let memberTable = makeMemberTable(message.channel.id, squadLeader);
    squadList[message.channel.id][squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content == '/close') {
    let squadLeader = message.author;

    if ( ! squadList[message.channel.id][squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[message.channel.id][squadLeader.id]['isOpen'] = false;

    let memberTable = makeMemberTable(message.channel.id, squadLeader);
    squadList[message.channel.id][squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content == '/disband') {
    let squadLeader = message.author;

    if ( ! squadList[message.channel.id][squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[message.channel.id][squadLeader.id]['isVisible'] = false;

    let memberTable = makeMemberTable(message.channel.id, squadLeader);
    squadList[message.channel.id][squadLeader.id]['pinnedMessage'].edit(memberTable);
    squadList[message.channel.id][squadLeader.id]['pinnedMessage'].unpin();

    // TODO: Consider storing the squad instead of deleting it
    delete squadList[message.channel.id][squadLeader.id];
  }

  else if (message.content == '/close') {
    let squadLeader = message.author;

    if ( ! squadList[message.channel.id][squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[message.channel.id][squadLeader.id]['isOpen'] = false;

    let memberTable = makeMemberTable(message.channel.id, squadLeader);
    squadList[message.channel.id][squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content.startsWith('/describe')) {
    let squadLeader = message.author;

    if ( ! squadList[message.channel.id][squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[message.channel.id][squadLeader.id]['description'] = message.content.substring('/describe'.length).trim().substring(0, 150);

    let memberTable = makeMemberTable(message.channel.id, squadLeader);
    squadList[message.channel.id][squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content.startsWith('/transfer')) {
    let squadLeader = message.author;
    let nextSquadLeader = message.mentions.users.first();

    if ( ! squadList[message.channel.id][squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    if (message.mentions.users.size > 1) {
      message.channel.sendMessage(`<@${message.author.id}> Please @mention only one member. Usage: \`/transfer @mention\`.`);
      return;
    }

    if ( ! nextSquadLeader) {
      message.channel.sendMessage(`<@${message.author.id}> Please @mention the squad member you wish to transfer the leadership to. Usage: \`/transfer @mention\`.`);
      return;
    }

    if (squadLeader.id === nextSquadLeader.id) {
      message.channel.sendMessage(`<@${message.author.id}> You are already the leader of the squad.`);
      return;
    }

    let isInSquad = squadList[message.channel.id][squadLeader.id]['users'].filter(user => user.id === nextSquadLeader.id).length;
    if ( ! isInSquad) {
      // TODO: Check grammar, "whom the leader is"
      message.channel.sendMessage(`<@${message.author.id}> ${nextSquadLeader.username} (${nextSquadLeader.discriminator}) is not in the squad.`);
      return;
    }

    squadList[message.channel.id][nextSquadLeader.id] = squadList[message.channel.id][squadLeader.id];
    delete squadList[message.channel.id][squadLeader.id];

    squadList[message.channel.id][nextSquadLeader.id]['leader'] = nextSquadLeader;

    squadList[message.channel.id][nextSquadLeader.id]['users'] = squadList[message.channel.id][nextSquadLeader.id]['users'].filter(user => {
      return user.id !== nextSquadLeader.id;
    });

    squadList[message.channel.id][nextSquadLeader.id]['users'].unshift(nextSquadLeader);

    let memberTable = makeMemberTable(message.channel.id, nextSquadLeader);
    squadList[message.channel.id][nextSquadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content == '/clear') {
    if (process.env.ENABLE_CLEAR !== 'true') {
      message.channel.sendMessage(`<@${message.author.id}> The command \`/clear\` is disabled.`);
      return;
    }

    // TODO: test
    if ( ! message.member.hasPermission('MANAGE_MESSAGES')) {
      message.channel.sendMessage(`<@${message.author.id}> You are not allowed to delete messages in this channel. Only members with "Manage Messages" permissions can use the \`/clear\` command.`);
      return;
    }

    for (let squadLeaderId in squadList[message.channel.id]) {
      if ( ! squadList[message.channel.id].hasOwnProperty(squadLeaderId)) {
        continue;
      }

      squadList[message.channel.id][squadLeaderId]['pinnedMessage'].unpin();
    }

    message.channel.fetchMessages({ limit: 100 })
      .then(messages => message.channel.bulkDelete(messages))
      .catch(console.log);

    for (let squadLeaderId in squadList[message.channel.id]) {
      if ( ! squadList[message.channel.id].hasOwnProperty(squadLeaderId)) {
        continue;
      }

      let memberTable = makeMemberTable(message.channel.id, squadList[message.channel.id][squadLeaderId]['leader']);
      message.channel.sendMessage(memberTable)
      .then(m => {
        squadList[message.channel.id][squadLeaderId]['pinnedMessage'] = m;
        m.pin();
      });
    }
  }

  else if (message.content.startsWith('/join')) {
    let squadLeader = message.mentions.users.first();

    if ( ! squadLeader) {
      message.channel.sendMessage(`<@${message.author.id}> Please @mention the squad leader to join their squad. Usage: \`/join @mention\`.`);
      return;
    }

    if ( ! squadList[message.channel.id][squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> ${squadLeader.username} (${squadLeader.discriminator}) is not the leader of any squad.`);
      return;
    }

    if ( ! squadList[message.channel.id][squadLeader.id]['isOpen']) {
      message.channel.sendMessage(`<@${message.author.id}> The squad is not open. Ask the squad leader ${squadLeader.username} (${squadLeader.discriminator}) to open it.`);
      return;
    }

    let isInSquad = squadList[message.channel.id][squadLeader.id]['users'].filter(user => user.id === message.author.id).length;
    if (isInSquad) {
      // TODO: Check grammar, "whom the leader is"
      message.channel.sendMessage(`<@${message.author.id}> You have already joined the squad whom the leader is ${squadLeader.username} (${squadLeader.discriminator}).`);
      return;
    }

    squadList[message.channel.id][squadLeader.id]['users'].push(message.author);

    let memberTable = makeMemberTable(message.channel.id, squadLeader);
    squadList[message.channel.id][squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content.startsWith('/leave')) {
    let squadLeader = message.mentions.users.first();

    if ( ! squadLeader) {
      message.channel.sendMessage(`<@${message.author.id}> Please @mention the squad leader to leave their squad. Usage: \`/leave @mention\`.`);
      return;
    }

    if ( ! squadList[message.channel.id][squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> ${squadLeader.username} (${squadLeader.discriminator}) is not the leader of any squad.`);
      return;
    }

    // TODO?: on leader leave, give ownership to the second person who joined.
    if (message.author.id === squadLeader.id) {
      message.channel.sendMessage(`<@${message.author.id}> You can't leave your own squad. Type \`/transfer @mention\` to transfer the lead to somebody else. Type \`/disband\` to disband the squad.`);
      return;
    }

    let isInSquad = squadList[message.channel.id][squadLeader.id]['users'].filter(user => user.id === message.author.id).length;
    if ( ! isInSquad) {
      // TODO: Check grammar, "whom the leader is"
      message.channel.sendMessage(`<@${message.author.id}> You are not in the squad whom the leader is ${squadLeader.username} (${squadLeader.discriminator}).`);
      return;
    }

    squadList[message.channel.id][squadLeader.id]['users'] = squadList[message.channel.id][squadLeader.id]['users'].filter(user => {
      return user.id !== message.author.id;
    });

    let memberTable = makeMemberTable(message.channel.id, squadLeader);
    squadList[message.channel.id][squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content.startsWith('/')) {
    message.channel.sendMessage(`<@${message.author.id}> \`${message.cleanContent}\` is not a valid command. Use \`/commands\` to list all the available commands.`);
  }

});

client.login(token);

let makeMemberTable = (channelId, squadLeader) => {
  let usernameMaxLength = squadList[channelId][squadLeader.id]['users'].length > 99 ? 12 : 13;

  let memberList = squadList[channelId][squadLeader.id]['users'].map((user, index) => {
    let username = user.username.substring(0, usernameMaxLength).trim() + (user.username.length > usernameMaxLength ? '…' : '');
    return { number: index+1, username: `${username} (${user.discriminator})` };
  });

  let table = asciitable(memberList, {
    skinny: true,
    intersectionCharacter: 'x',
    columns: [
      { field: 'number', name: '#' },
      { field: 'username',  name: 'Username' }]
    }
  );

  let squadState = 'Undefined';

  if (squadList[channelId][squadLeader.id]['isVisible'] === false) {
    squadState = 'Disbanded';
  } else {
    squadState = squadList[channelId][squadLeader.id]['isOpen'] ? 'Open' : 'Closed';
  }

  let textArray = [];

  textArray.push(`Leader: ${squadLeader.username} (${squadLeader.discriminator})`);

  if (squadList[channelId][squadLeader.id]['description'].length) {
    textArray.push(`Description: ${squadList[channelId][squadLeader.id]['description']}`);
  }

  textArray.push(`Status: ${squadState}`);

  return (
    `Type \`/join @${squadLeader.username}\` to join the squad.\n` +
    `Type \`/leave @${squadLeader.username}\` to leave the squad.\n` +
    '```' + textArray.join('\n') + '\n\n' + table + '```'
  );
}
