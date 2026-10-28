'use strict';
/* Templates: the look, wording and small behaviors that make Anti-Social resemble other kinds of social app.
   Pure logic only (no page, no network). A template never changes where your data lives or what the app can do. */
const TemplateCore = (() => {
  const TEMPLATES = [
    { id: 'default', name: 'Anti-Social', blurb: 'The original look: a timeline with a menu down the side.', mode: '' },
    { id: 'chat', name: 'Chat Rooms', blurb: 'A server with channels, a chat column and a member list. Posts become messages.', mode: 'dark' },
    { id: 'blue', name: 'Classic Blue', blurb: 'A blue bar on top, shortcuts on the left, a News Feed and a Timeline. Early-2010s social network.', mode: 'light' },
  ];
  const ids = TEMPLATES.map(t => t.id);
  const get = id => TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
  const valid = id => ids.includes(id) ? id : 'default';

  const DEFAULT = {
    navHome: 'Home', navApps: 'Apps', navExplore: 'Explore', navNotifications: 'Notifications', navProfile: 'Profile', navSettings: 'Settings',
    titleHome: 'Home', titleExplore: 'Explore', titleNotifications: 'Notifications', titlePost: 'Post',
    composePlaceholder: "What's happening?", send: 'Post', reply: 'Reply',
    replyGhostPlaceholder: 'Post your reply (they will not answer)', replySelfPlaceholder: 'Post your reply (to yourself)',
    actReply: 'Reply', actRepost: 'Repost', actLike: 'Like', actViews: 'Views', actDelete: 'Delete post',
    statReplies: 'Replies', statReposts: 'Reposts', statLikes: 'Likes',
    youReposted: 'You reposted yourself', replyingSelf: 'Replying to yourself, as usual', replyingTo: 'Replying to',
    following: 'Following', followers: 'Followers', follow: 'Follow', unfollow: 'Following',
    tabPosts: 'Posts', tabReplies: 'Replies', tabMedia: 'Media', tabForYou: 'For you', tabYours: 'Yours', editProfile: 'Edit profile',
    sideHappening: "What's happening", sideTrending: 'Trending', sideWho: 'Who to follow', sideEmptyWho: 'No one. There is no one.', sideEmptyHappening: 'Nothing. Nobody is here.',
    exploreEmptyTitle: 'Nobody found', exploreSearching: 'Searching for people...', searchAgain: 'Search again', exploreDiscover: 'Discover', discoverBtn: 'Discover someone new',
    emptyFeedTitle: 'Welcome to nowhere', emptyFeedText: "Your timeline is empty. So is everyone else's. Go on, post something.", caughtUp: "You're all caught up. Nobody else posted. Nobody else exists.",
    notifTitle: 'Nothing to see here', notifText: 'Literally no one has liked, replied to, or noticed you. No one can. That is the whole point.',
    postNotFound: 'Post not found', profileOf: 'Profile', searchBlurb: 'Search for people in Explore. Good luck.',
  };
  const CHAT = {
    ...DEFAULT,
    navHome: 'Channels', navExplore: 'Discover', navNotifications: 'Inbox', navProfile: 'Profile', navSettings: 'User Settings',
    titleHome: 'general', titleExplore: 'Discover servers', titleNotifications: 'Inbox', titlePost: 'Message',
    composePlaceholder: 'Message #general', send: 'Send', reply: 'Reply',
    replyGhostPlaceholder: 'Reply to this message (they will not answer)', replySelfPlaceholder: 'Reply to your own message',
    actReply: 'Reply', actRepost: 'Forward', actLike: 'React', actViews: 'Seen by', actDelete: 'Delete message',
    statReplies: 'Replies', statReposts: 'Forwards', statLikes: 'Reactions',
    youReposted: 'You forwarded your own message', replyingSelf: 'Replying to yourself', replyingTo: 'Replying to',
    following: 'Friends', followers: 'Servers', follow: 'Add Friend', unfollow: 'Friends',
    tabPosts: 'Messages', tabReplies: 'Replies', tabMedia: 'Attachments', tabForYou: 'general', tabYours: 'Yours', editProfile: 'Edit Profile',
    sideHappening: 'Active now', sideTrending: 'Hot topics', sideWho: 'People you may know', sideEmptyWho: 'Nobody. It is a quiet server.', sideEmptyHappening: 'Nothing. Nobody is here.',
    exploreEmptyTitle: 'No servers found', exploreSearching: 'Looking for servers...', searchAgain: 'Look again', exploreDiscover: 'Discover', discoverBtn: 'Find a new member',
    emptyFeedTitle: 'This is the start of #general', emptyFeedText: 'Nobody has said anything here yet. Say something. Nobody will read it.', caughtUp: 'You have read everything. There was nothing else.',
    notifTitle: 'Your inbox is empty', notifText: 'No mentions, no friend requests, no pings. Nobody knows you exist, so nobody can.',
    postNotFound: 'Message not found', profileOf: 'Profile', searchBlurb: 'Find or start a conversation. Good luck.',
  };
  const BLUE = {
    ...DEFAULT,
    navHome: 'News Feed', navExplore: 'Find Friends', navProfile: 'Timeline',
    titleHome: 'News Feed', titleExplore: 'Find Friends', titleNotifications: 'Notifications', titlePost: 'Status',
    composePlaceholder: "What's on your mind?", send: 'Post', reply: 'Comment',
    replyGhostPlaceholder: 'Write a comment... (they will not answer)', replySelfPlaceholder: 'Write a comment on your own status...',
    actReply: 'Comment', actRepost: 'Share', actLike: 'Like', actViews: 'Seen by', actDelete: 'Delete',
    statReplies: 'Comments', statReposts: 'Shares', statLikes: 'Likes',
    youReposted: 'You shared your own status', replyingSelf: 'You commented on your own status', replyingTo: 'In reply to',
    following: 'Friends', followers: 'Friends', follow: 'Add Friend', unfollow: 'Friends',
    tabPosts: 'Timeline', tabReplies: 'Comments', tabMedia: 'Photos', tabForYou: 'Top Stories', tabYours: 'Your Posts', editProfile: 'Update Info',
    sideHappening: 'Trending', sideTrending: 'Trending', sideWho: 'People You May Know', sideEmptyWho: 'No one. Zero mutual friends.', sideEmptyHappening: 'Nothing. Nobody is here.',
    exploreEmptyTitle: 'No friends found', exploreSearching: 'Looking for friends...', searchAgain: 'Search again', exploreDiscover: 'Find Friends', discoverBtn: 'Find a new friend',
    emptyFeedTitle: 'Welcome to your News Feed', emptyFeedText: 'Nothing new from your friends, because you have none. Share a status.', caughtUp: "You're all caught up. 0 friends have posted.",
    notifTitle: 'No new notifications', notifText: 'Nobody has liked, commented on, or poked you. Nobody can.',
    postNotFound: 'Status not found', profileOf: 'Timeline', searchBlurb: 'Search for people, places and things',
  };
  const WORDS = { default: DEFAULT, chat: CHAT, blue: BLUE };
  const word = (id, key) => (WORDS[valid(id)] || DEFAULT)[key] ?? DEFAULT[key] ?? key;

  /* ---------- chat: channels ---------- */
  const MAX_CHANNELS = 30;
  // "My Cool Channel!" -> "my-cool-channel". Empty if nothing usable is left.
  const channelName = raw => String(raw == null ? '' : raw).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_ -]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30).replace(/-$/, '');
  const channelError = (raw, existing) => {
    const n = channelName(raw);
    if (!n) return 'Channel names use letters, numbers and dashes.';
    if (n === 'general' || existing.some(c => c.name === n)) return `There is already a #${n}.`;
    if (existing.length >= MAX_CHANNELS - 1) return `That is plenty of channels (${MAX_CHANNELS}).`;
    return '';
  };
  const isGeneral = p => !p || !p.channel || p.channel === 'general';
  const inChannel = (p, id) => !id || id === 'general' ? isGeneral(p) : p.channel === id;
  // Generated members only ever talk in #general; every other channel holds nothing but your own messages.
  const crowdMayPost = id => !id || id === 'general';
  const serverName = acct => { const n = String((acct && (acct.name || acct.handle)) || 'My').trim().slice(0, 24); return n.endsWith('s') ? `${n}' Server` : `${n}'s Server`; };
  const initials = s => String(s || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';

  /* ---------- chat: the member list (generated people only, never real) ---------- */
  const hash = s => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
  const roleFor = id => { const r = hash('role:' + id) % 100; return r < 2 ? 'Admin' : r < 8 ? 'Moderator' : 'Member'; };
  const ROLE_COLOR = { Admin: '#f23f43', Moderator: '#23a55a', Member: '' };
  // members: [{id, name, handle, online, activity}] -> ordered groups for the list.
  const memberGroups = members => {
    const withRole = members.map(m => ({ ...m, role: roleFor(m.id) }));
    const by = (f, sort = (a, b) => a.name.localeCompare(b.name)) => withRole.filter(f).sort(sort);
    const groups = [
      ['Admin', by(m => m.online && m.role === 'Admin')], ['Moderator', by(m => m.online && m.role === 'Moderator')],
      ['Online', by(m => m.online && m.role === 'Member')], ['Offline', by(m => !m.online)],
    ];
    return groups.filter(g => g[1].length).map(([name, list]) => ({ name, list }));
  };
  const messageOrder = items => [...items].sort((a, b) => a.ts - b.ts);

  /* ---------- blue: little helpers ---------- */
  const firstName = acct => String((acct && (acct.name || acct.handle)) || '').trim().split(/\s+/)[0] || '';
  const countLabel = (n, one, many) => n === 1 ? `1 ${one}` : `${n} ${many}`;

  return { TEMPLATES, get, valid, word, WORDS, MAX_CHANNELS, channelName, channelError, isGeneral, inChannel, crowdMayPost, serverName, initials, roleFor, ROLE_COLOR, memberGroups, messageOrder, firstName, countLabel };
})();
if (typeof module !== 'undefined') module.exports = TemplateCore;
