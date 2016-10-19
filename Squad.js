module.exports =

class Squad {

  constructor(leader, members, pinnedMessage = null, description = '', datetime = null, isOpen = true, isVisible = true) {
      this.leader = leader;
      this.members = members;
      this.pinnedMessage = pinnedMessage;
      this.description = description;
      this.datetime = datetime;
      this.isOpen = isOpen;
      this.isVisible = isVisible;
  }

  disband() {
    this.isVisible = false;
  }

  transferTo(newLeader) {
    this.leader = newLeader;

    this.members = this.members.filter(user => user.id !== newLeader.id );
    this.members.unshift(newLeader);
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  add(member) {
    return this.members.push(member);
  }

  kick(member) {
    if (member.id === this.leader.id) {
      console.error("Cannot kick the leader of the squad.", { member, leader });
      return false;
    }

    return this.members = this.members.filter(m => m.id !== member.id);
  }

  describe(description) {
    let maxDescriptionLength = 150;
    return this.description = description.substring(0, maxDescriptionLength) + (description.length > maxDescriptionLength ? '…' : '');
  }

  /**
   * Add a datetime to the squad.
   *
   * @param  {DateTime} date
   * @return {string} The formatted date
   */
  schedule(date) {
    return this.datetime = date.toLocaleString('en-US', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: process.env.TimeZone,
      timeZoneName: 'short'
    });
  }

  get size() {
    return this.members.length;
  }

  has(member) {
    return this.members.some(m => m.id === member.id);
  }

  /**
   * Search for a member in the squad. Return the member if found, undefined
   * otherwise.
   *
   * @param  {Object}
   * @return {Object|undefined}
   */
  find(member) {
    return this.members.filter(m => m.id === member.id)[0];
  }

}