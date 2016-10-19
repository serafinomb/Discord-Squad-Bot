module.exports =

class Member {

  // Find an alternative to hardcoding `role = 'm'`

  constructor(discordMember, role = 'm') {
    this.id = discordMember.id;
    this.username = discordMember.username;
    this.discriminator = discordMember.discriminator;
    this.role = role;
  }

  static get LEADER()     { return 'L'; }
  static get LIEUTENANT() { return 'l'; }
  static get MEMBER()     { return 'm'; }

  get isLeader() {
    return this.role == this.LEADER;
  }

  get isLieutenant() {
    return this.role == this.LIEUTENANT;
  }

  get isMember() {
    return this.role == this.MEMBER;
  }

  transfer() {
    this.role = 'L';
  }

  promote() {
    this.role = 'l';
  }

  demote() {
    this.role = 'm';
  }

}