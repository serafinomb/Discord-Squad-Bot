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
  if (message.content == '/help') {
    let text = '```' +
`Info:
- Available squads can be found in the pinned messages (top right).

Usage:
/command [parameter[, …]]
- Elements in square brackets are optional

Available commands:
– /help  Show this help message.
– /commands  Show all available commands.
– /clear  Delete the channel chat history. Need the "Manage Messages" permission.
– /create  [@mention[, …]]  Create a new squad and add the @mention-ed person(s).
– /join  @mention  Join the squad whom leader is @mention.
– /leave  @mention  Leave the squad whom leader is @mention.

Available commands as a squad leader:
– /add  @mention[, …]]  Add the @mention-ed person(s) to the squad.
– /kick  @mention[, …]]  Kick the @mention-ed person(s) from the squad.
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
`Available commands: \`/help\`, \`/commands\`, \`/create\`, \`/join\`, \`/leave\`.
Available commands as a squad leader: \`/add\`, \`/kick\`, \`/close\`, \`/open\`, \`/describe\`, \`/transfer\`, \`/disband\`.`;

    message.channel.sendMessage(text);
  }

  else if (message.content.startsWith('/create')) {
    let squadLeader = message.author;

    if (squadList[squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are already leader of a squad. Type \`/transfer @mention\` to give the lead to somebody else. Type \`/disband\` to disband it.`);
      return;
    }

    squadList[squadLeader.id] = {
      leader: null,
      users: [],
      pinnedMessage: null,
      description: '',
      isOpen: true,
      isVisible: true
    };

    squadList[squadLeader.id]['leader'] = squadLeader;
    squadList[squadLeader.id]['users'].push(squadLeader);

    let triedToAddSelf = false;

    for (let mentionedUser of message.mentions.users.array()) {
      if ( ! triedToAddSelf && mentionedUser.id === squadLeader.id) {
        triedToAddSelf = true;
      } else {
        squadList[squadLeader.id]['users'].push(mentionedUser);
      }
    }

    if (triedToAddSelf) {
      message.channel.sendMessage(`<@${squadLeader.id}> you have already joined the squad by creating it.`);
    }

    let memberTable = makeMemberTable(squadLeader);

    message.channel.sendMessage(memberTable)
      .then(m => {
        squadList[squadLeader.id]['pinnedMessage'] = m;
        m.pin();
      });
  }

  else if (message.content.startsWith('/add')) {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    if (message.mentions.users.size === 0) {
      message.channel.sendMessage(`<@${message.author.id}> Please @mention the user(s) you want to add to the squad. Usage: \`/add @mention @mention\`.`);
      return;
    }

    let inSquadUserList = [];

    for (let mentionedUser of message.mentions.users.array()) {
      let isInSquad = squadList[squadLeader.id]['users'].filter(user => user.id === mentionedUser.id).length;
      if (isInSquad) {
        inSquadUserList.push(mentionedUser);
      } else {
        squadList[squadLeader.id]['users'].push(mentionedUser);
      }
    }

    if (inSquadUserList.length) {
      message.channel.sendMessage(`<@${message.author.id}> The following users are already in the squad: ${inSquadUserList.join(', ')}.`);
    }

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content.startsWith('/kick')) {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    if (message.mentions.users.size === 0) {
      message.channel.sendMessage(`<@${message.author.id}> Please @mention the user(s) you want to kick from the squad. Usage: \`/kick @mention @mention\`.`);
      return;
    }

    let notInSquadUserList = [];
    let triedToKickSelf = false;

    for (let mentionedUser of message.mentions.users.array()) {
      if ( ! triedToKickSelf && mentionedUser.id === message.author.id) {
        triedToKickSelf = true;
      }

      let isInSquad = squadList[squadLeader.id]['users'].filter(user => user.id === mentionedUser.id).length;
      if ( ! isInSquad) {
        notInSquadUserList.push(mentionedUser);
      } else {
        squadList[squadLeader.id]['users'] = squadList[squadLeader.id]['users'].filter(user => {
          return user.id !== mentionedUser.id || user.id === message.author.id;
        });
      }
    }

    if (triedToKickSelf) {
      message.channel.sendMessage(`<@${message.author.id}> You can't kick yourself from your own squad. Type \`/transfer @mention\` to give the lead to somebody else. Type \`/disband\` to disband it.`);
    }

    if (notInSquadUserList.length) {
      message.channel.sendMessage(`<@${message.author.id}> The following users were not in the squad: ${notInSquadUserList.join(', ')}.`);
    }

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content == '/open') {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[squadLeader.id]['isOpen'] = true;

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content == '/close') {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[squadLeader.id]['isOpen'] = false;

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content == '/disband') {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[squadLeader.id]['isVisible'] = false;

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
    squadList[squadLeader.id]['pinnedMessage'].unpin();

    // TODO: Consider storing the squad instead of deleting it
    delete squadList[squadLeader.id];
  }

  else if (message.content == '/close') {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[squadLeader.id]['isOpen'] = false;

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content.startsWith('/describe')) {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[squadLeader.id]['description'] = message.content.substring('/describe'.length).trim().substring(0, 150);

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content.startsWith('/transfer')) {
    let squadLeader = message.author;
    let nextSquadLeader = message.mentions.users.first();

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    if (message.mentions.users.array().length > 1) {
      message.channel.sendMessage(`<@${message.author.id}> Please @mention only one user. Usage: \`/transfer @mention\`.`);
      return;
    }

    if ( ! nextSquadLeader) {
      message.channel.sendMessage(`<@${message.author.id}> Please @mention the user you want to transfer the squad to. Usage: \`/transfer @mention\`.`);
      return;
    }

    if (squadLeader.id === nextSquadLeader.id) {
      message.channel.sendMessage(`<@${message.author.id}> You are already the leader of the squad.`);
      return;
    }

    let isInSquad = squadList[squadLeader.id]['users'].filter(user => user.id === nextSquadLeader.id).length;
    if ( ! isInSquad) {
      // TODO: Check grammar, "whom the leader is"
      message.channel.sendMessage(`<@${message.author.id}> ${nextSquadLeader.username} (${nextSquadLeader.discriminator}) is not in the squad.`);
      return;
    }

    squadList[nextSquadLeader.id] = squadList[squadLeader.id];
    delete squadList[squadLeader.id];

    squadList[nextSquadLeader.id]['leader'] = nextSquadLeader;

    squadList[nextSquadLeader.id]['users'] = squadList[nextSquadLeader.id]['users'].filter(user => {
      return user.id !== nextSquadLeader.id;
    });

    squadList[nextSquadLeader.id]['users'].unshift(nextSquadLeader);

    let memberTable = makeMemberTable(nextSquadLeader);
    squadList[nextSquadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content == '/clear') {
    if (process.env.ENABLE_CLEAR != 'true') {
      message.channel.sendMessage(`<@${message.author.id}> Command disabled.`);
      return;
    }

    // TODO: test
    if ( ! message.member.hasPermission('MANAGE_MESSAGES')) {
      message.channel.sendMessage(`<@${message.author.id}> You are not allowed to delete messages in this channel (MANAGE_MESSAGES).`);
      return;
    }

    for (let squadLeaderId in squadList) {
      if ( ! squadList.hasOwnProperty(squadLeaderId)) {
        continue;
      }

      squadList[squadLeaderId]['pinnedMessage'].unpin();
    }

    message.channel.fetchMessages({ limit: 99 })
      .then(messages => message.channel.bulkDelete(messages))
      .catch(console.log);

    for (let squadLeaderId in squadList) {
      if ( ! squadList.hasOwnProperty(squadLeaderId)) {
        continue;
      }

      let memberTable = makeMemberTable(squadList[squadLeaderId]['leader']);
      message.channel.sendMessage(memberTable)
      .then(m => {
        squadList[squadLeaderId]['pinnedMessage'] = m;
        m.pin();
      });
    }
  }

  else if (message.content.startsWith('/join')) {
    let squadLeader = message.mentions.users.first();

    if ( ! squadLeader) {
      message.channel.sendMessage(`<@${message.author.id}> Please @mention the squad leader to join his/her squad. Usage: \`/join @mention\`.`);
      return;
    }

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> ${squadLeader.username} (${squadLeader.discriminator}) is not the leader of any squad.`);
      return;
    }

    if ( ! squadList[squadLeader.id]['isOpen']) {
      message.channel.sendMessage(`<@${message.author.id}> The squad is not open. Ask the squad leader ${squadLeader.username} (${squadLeader.discriminator}) to open it.`);
      return;
    }

    let isInSquad = squadList[squadLeader.id]['users'].filter(user => user.id === message.author.id).length;
    if (isInSquad) {
      // TODO: Check grammar, "whom the leader is"
      message.channel.sendMessage(`<@${message.author.id}> You have already joined the squad whom the leader is ${squadLeader.username} (${squadLeader.discriminator}).`);
      return;
    }

    squadList[squadLeader.id]['users'].push(message.author);

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content.startsWith('/leave')) {
    let squadLeader = message.mentions.users.first();

    if ( ! squadLeader) {
      message.channel.sendMessage(`<@${message.author.id}> Please @mention the squad leader to leave his/her squad. Usage: \`/leave @mention\`.`);
      return;
    }

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`<@${message.author.id}> ${squadLeader.username} (${squadLeader.discriminator}) is not the leader of any squad.`);
      return;
    }

    // TODO?: on leader leave, give ownership to the second person who joined.
    if (message.author.id === squadLeader.id) {
      message.channel.sendMessage(`<@${message.author.id}> You can't leave your own squad. Type \`/transfer @mention\` to give the lead to somebody else. Type \`/disband\` to disband it.`);
      return;
    }

    let isInSquad = squadList[squadLeader.id]['users'].filter(user => user.id === message.author.id).length;
    if ( ! isInSquad) {
      // TODO: Check grammar, "whom the leader is"
      message.channel.sendMessage(`<@${message.author.id}> You are not in the squad whom the leader is ${squadLeader.username} (${squadLeader.discriminator}).`);
      return;
    }

    squadList[squadLeader.id]['users'] = squadList[squadLeader.id]['users'].filter(user => {
      return user.id !== message.author.id;
    });

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  else if (message.content.startsWith('/')) {
    message.channel.sendMessage(`<@${message.author.id}> \`${message.cleanContent}\` is not a valid command. Use \`/commands\` for a list of all available commands.`);
  }

});

client.login(token);

let makeMemberTable = (squadLeader) => {
  let memberList = squadList[squadLeader.id]['users'].map((user, index) => {
    let username = user.username.substring(0, 13).trim() + (user.username.length > 13 ? '…' : '');
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

  if (squadList[squadLeader.id]['isVisible'] === false) {
    squadState = 'Disbanded';
  } else {
    squadState = squadList[squadLeader.id]['isOpen'] ? 'Open' : 'Closed';
  }

  let textArray = [];

  textArray.push(`Leader: ${squadLeader.username} (${squadLeader.discriminator})`);

  if (squadList[squadLeader.id]['description'].length) {
    textArray.push(`Description: ${squadList[squadLeader.id]['description']}`);
  }

  textArray.push(`Status: ${squadState}`);

  return (
    `Type \`/join @${squadLeader.username}\` to join the squad.\n` +
    `Type \`/leave @${squadLeader.username}\` to leave the squad.\n` +
    '```' + textArray.join('\n') + '\n\n' + table + '```'
  );
}
