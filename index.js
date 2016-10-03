const asciitable = require('asciitable');

const Discord = require('discord.js');
const client = new Discord.Client();

const token = 'MjMyNDIwMjA2MzczMzcxOTA1.CtOvAA.NLO1aVLsEkPSjUGU85P2klr_1v8';

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
– /create  [@mention[, …]]  Create a new squad and add the @mention-ed person(s).
– /join  @mention Join the squad whom leader is @mention.
– /leave  @mention Leave the squad whom leader is @mention.

Available commands as a squad leader:
– /add  @mention[, …]]  Add the @mention-ed person(s) to the squad.
– /kick  @mention[, …]]  Kick the @mention-ed person(s) from the squad.
– /close  Close the squad.
– /open  Open the squad.
– /describe  <description>  Add a short description to the squad (maximum 150 characters). Update the description with the same command.
– /disband  Disband the squad. This action is irreversible. Use /close to temporarly disable joining.` +
'```';
    message.channel.sendMessage(text);
  }

  if (message.content.startsWith('/create')) {
    let squadLeader = message.author;

    if (squadList[squadLeader.id]) {
      message.channel.sendMessage(`You have already created a squad. Type \`/disband\` to disband it.`);
      return;
    }

    squadList[squadLeader.id] = {
      users: [],
      pinnedMessage: null,
      messageHistory: [],
      description: '',
      isOpen: true,
      isVisible: true
    };

    squadList[squadLeader.id]['messageHistory'].push(message);

    squadList[squadLeader.id]['users'].push(squadLeader);

    for (mentionedUser of message.mentions.users.array()) {
      squadList[squadLeader.id]['users'].push(mentionedUser);
    }

    let text =
`Squad created by ${squadLeader.username} (${squadLeader.discriminator}).
Type \`/join @${squadLeader.username}\` to join the squad.
Type \`/leave @${squadLeader.username}\` to leave the squad.`;

    message.channel.sendMessage(text)
      .then(m => squadList[squadLeader.id]['messageHistory'].push(m));

    let memberTable = makeMemberTable(squadLeader);

    message.channel.sendMessage(memberTable)
      .then(m => {
        squadList[squadLeader.id]['pinnedMessage'] = m;
        m.pin();
      });
  }

  if (message.content.startsWith('/add')) {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    if (message.mentions.users.size === 0) {
      message.channel.sendMessage(`Please @mention the user(s) you want to add to the squad. Usage: \`/add @mention @mention\`.`);
      return;
    }

    let inSquadUserList = [];

    for (mentionedUser of message.mentions.users.array()) {
      let isInSquad = squadList[squadLeader.id]['users'].filter(user => user.id === mentionedUser.id).length;
      if (isInSquad) {
        inSquadUserList.push(mentionedUser);
      } else {
        squadList[squadLeader.id]['users'].push(mentionedUser);
      }
    }

    if (inSquadUserList.length) {
      message.channel.sendMessage(`The following users are already in the squad: ${inSquadUserList.join(', ')}.`);
    }

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  if (message.content.startsWith('/kick')) {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    if (message.mentions.users.size === 0) {
      message.channel.sendMessage(`Please @mention the user(s) you want to kick from the squad. Usage: \`/kick @mention @mention\`.`);
      return;
    }

    let notInSquadUserList = [];

    for (mentionedUser of message.mentions.users.array()) {
      let isInSquad = squadList[squadLeader.id]['users'].filter(user => user.id === mentionedUser.id).length;
      if ( ! isInSquad) {
        notInSquadUserList.push(mentionedUser);
      } else {
        squadList[squadLeader.id]['users'] = squadList[squadLeader.id]['users'].filter(user => {
          return user.id !== mentionedUser.id;
        });
      }
    }

    if (notInSquadUserList.length) {
      message.channel.sendMessage(`The following users were not in the squad: ${notInSquadUserList.join(', ')}.`);
    }

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  if (message.content == '/open') {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[squadLeader.id]['isOpen'] = true;

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  if (message.content == '/close') {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[squadLeader.id]['isOpen'] = false;

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  if (message.content == '/disband') {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[squadLeader.id]['isVisible'] = false;

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
    squadList[squadLeader.id]['pinnedMessage'].unpin();

    // TODO: Consider storing the squad instead of deleting it
    delete squadList[squadLeader.id];
  }

  if (message.content == '/close') {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[squadLeader.id]['isOpen'] = false;

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  if (message.content.startsWith('/describe')) {
    let squadLeader = message.author;

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`You are not the leader of any squad. Type \`/create\` to create a new squad.`);
      return;
    }

    squadList[squadLeader.id]['description'] = message.content.substring('/describe'.length).trim().substring(0, 150);

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  // TODO: Problematic if multiple raid squads are created. Consider bulkDelete squad.messageHistory
  if (message.content == '/clear') {
    // message.channel.sendMessage(`Command disabled.`);
    // return;

    // TODO: test
    if ( ! message.member.hasPermission('MANAGE_MESSAGES')) {
      message.channel.sendMessage(`You are not allowed to delete messages in this channel (MANAGE_MESSAGES).`);
      return;
    }

    // TODO: Maybe delete only the related messages (bot and users interacting with the bot)
    message.channel.fetchMessages({ limit: 99 })
      .then(messages => message.channel.bulkDelete(messages))
      .catch(console.log);
  }

  if (message.content.startsWith('/join')) {
    let squadLeader = message.mentions.users.first();

    if ( ! squadLeader) {
      message.channel.sendMessage(`Please @mention the squad leader to join his/her squad. Usage: \`/join @mention\`.`);
      return;
    }

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`The user ${squadLeader.username} (${squadLeader.discriminator}) is not the leader of any squad.`);
      return;
    }

    if ( ! squadList[squadLeader.id]['isOpen']) {
      message.channel.sendMessage(`The squad is not open. Ask the squad leader ${squadLeader.username} (${squadLeader.discriminator}) to open the squad by typing \`/open\`.`);
      return;
    }

    let isInSquad = squadList[squadLeader.id]['users'].filter(user => user.id === message.author.id).length;
    if (isInSquad) {
      // TODO: Check grammar, "whom the leader is"
      message.channel.sendMessage(`You have already joined the squad whom the leader is ${squadLeader.username} (${squadLeader.discriminator}).`);
      return;
    }

    squadList[squadLeader.id]['users'].push(message.author);

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

  if (message.content.startsWith('/leave')) {
    let squadLeader = message.mentions.users.first();

    if ( ! squadLeader) {
      message.channel.sendMessage(`Please @mention the squad leader to leave his/her squad. Usage: \`/join @mention\`.`);
      return;
    }

    if ( ! squadList[squadLeader.id]) {
      message.channel.sendMessage(`You're not the leader of any squad.`);
      return;
    }

    // TODO?: on leader leave, give ownership to the second person who joined.
    if (message.author.id === squadLeader.id) {
      message.channel.sendMessage(`You can't leave your own squad. Type \`/disband\` to disband it.`);
      return;
    }

    let isInSquad = squadList[squadLeader.id]['users'].filter(user => user.id === message.author.id).length;
    if ( ! isInSquad) {
      // TODO: Check grammar, "whom the leader is"
      message.channel.sendMessage(`You are not in the squad whom the leader is ${squadLeader.username} (${squadLeader.discriminator}).`);
      return;
    }

    squadList[squadLeader.id]['users'] = squadList[squadLeader.id]['users'].filter(user => {
      return user.id !== message.author.id;
    });

    let memberTable = makeMemberTable(squadLeader);
    squadList[squadLeader.id]['pinnedMessage'].edit(memberTable);
  }

});

client.login(token);

let makeMemberTable = (squadLeader) => {
  let memberList = squadList[squadLeader.id]['users'].map((user, index) => {
    return { number: index+1, username: `${user.username} (${user.discriminator})` };
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
    '```' + textArray.join('\n') + '\n\n' + table + '```'
  );
}
