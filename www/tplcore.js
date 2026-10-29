'use strict';
/* Templates: the look, wording and small behaviors that make Anti-Social resemble other kinds of social app.
   Pure logic only (no page, no network). A template never changes where your data lives or what the app can do. */
const TemplateCore = (() => {
  const TEMPLATES = [
    { id: 'default', name: 'Anti-Social', blurb: 'The original look: a timeline with a menu down the side.', mode: '' },
    { id: 'chat', name: 'Chat Rooms', blurb: 'A server with channels, a chat column and a member list. Posts become messages.', mode: 'dark' },
    { id: 'blue', name: 'Classic Blue', blurb: 'A blue bar on top, shortcuts on the left, a News Feed and a Timeline. Early-2010s social network.', mode: 'light' },
    { id: 'reddit', name: 'Communities', blurb: 'A community page with vote arrows, score counts, comments and an orange header. Posts become threads in r/AntiSocial.', mode: 'light' },
  ];
  const ids = TEMPLATES.map(t => t.id);
  const get = id => TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
  const valid = id => ids.includes(id) ? id : 'default';

  const DEFAULT = {
    navHome: 'Home', navApps: 'Apps', navExplore: 'Explore', navNotifications: 'Notifications', navProfile: 'Profile', navSettings: 'Settings',
    titleHome: 'Home', titleExplore: 'Explore', titleNotifications: 'Notifications', titlePost: 'Post',
    composePlaceholder: "What's happening?", composeHeading: '', send: 'Post', reply: 'Reply',
    replyGhostPlaceholder: 'Post your reply (they will not answer)', replySelfPlaceholder: 'Post your reply (to yourself)',
    actReply: 'Reply', actRepost: 'Repost', actLike: 'Like', actLikeOn: 'Like', actViews: 'Views', actDelete: 'Delete post',
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
    actReply: 'Reply', actRepost: 'Forward', actLike: 'React', actLikeOn: 'React', actViews: 'Seen by', actDelete: 'Delete message',
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
    composePlaceholder: "What's on your mind?", composeHeading: 'Update Status', send: 'Post', reply: 'Comment',
    replyGhostPlaceholder: 'Write a comment... (they will not answer)', replySelfPlaceholder: 'Write a comment on your own status...',
    actReply: 'Comment', actRepost: 'Share', actLike: 'Like', actLikeOn: 'Unlike', actViews: 'Seen by', actDelete: 'Delete',
    statReplies: 'Comments', statReposts: 'Shares', statLikes: 'Likes',
    youReposted: 'You shared your own status', replyingSelf: 'You commented on your own status', replyingTo: 'In reply to',
    following: 'Friends', followers: 'Followers', follow: 'Add Friend', unfollow: 'Friends',
    tabPosts: 'Timeline', tabReplies: 'Comments', tabMedia: 'Photos', tabForYou: 'Top Stories', tabYours: 'Your Posts', editProfile: 'Update Info',
    sideHappening: 'Trending', sideTrending: 'Trending', sideWho: 'People You May Know', sideEmptyWho: 'No one. Zero mutual friends.', sideEmptyHappening: 'Nothing. Nobody is here.',
    exploreEmptyTitle: 'No friends found', exploreSearching: 'Looking for friends...', searchAgain: 'Search again', exploreDiscover: 'Find Friends', discoverBtn: 'Find a new friend',
    emptyFeedTitle: 'Welcome to your News Feed', emptyFeedText: 'Nothing new from your friends, because you have none. Share a status.', caughtUp: "You're all caught up. 0 friends have posted.",
    notifTitle: 'No new notifications', notifText: 'Nobody has liked, commented on, or poked you. Nobody can.',
    postNotFound: 'Status not found', profileOf: 'Timeline', searchBlurb: 'Search for people, places and things',
  };
  const REDDIT = {
    ...DEFAULT,
    navHome: 'Home', navExplore: 'Popular', navNotifications: 'Inbox', navProfile: 'Profile', navSettings: 'Settings',
    titleHome: 'Home', titleExplore: 'Popular', titleNotifications: 'Inbox', titlePost: 'Post',
    composePlaceholder: 'Text (optional)', composeHeading: 'Create a post', send: 'Post', reply: 'Comment',
    replyGhostPlaceholder: 'What are your thoughts? (they will not answer)', replySelfPlaceholder: 'What are your thoughts? (you are commenting on yourself)',
    actReply: 'Comments', actRepost: 'Share', actLike: 'Upvote', actLikeOn: 'Remove upvote', actViews: 'Views', actDelete: 'Delete',
    statReplies: 'Comments', statReposts: 'Shares', statLikes: 'Upvotes',
    youReposted: 'You shared your own post', replyingSelf: 'Commenting on yourself', replyingTo: 'In reply to',
    following: 'Following', followers: 'Followers', follow: 'Join', unfollow: 'Joined',
    tabPosts: 'Posts', tabReplies: 'Comments', tabMedia: 'Media', tabForYou: 'Best', tabYours: 'Yours', editProfile: 'Edit profile',
    sideHappening: 'Popular communities', sideTrending: 'Trending today', sideWho: 'Communities near you', sideEmptyWho: 'None. You are the only member of everything.', sideEmptyHappening: 'Nothing is trending. Nobody is here.',
    exploreEmptyTitle: 'No communities found', exploreSearching: 'Looking for communities...', searchAgain: 'Search again', exploreDiscover: 'Popular', discoverBtn: 'Find something new',
    emptyFeedTitle: 'Welcome to r/AntiSocial', emptyFeedText: 'Nothing has been posted. Be the first. Your post will get one upvote: yours.', caughtUp: "You've reached the end of the feed. There is no more.",
    notifTitle: 'No new messages', notifText: 'Nobody has replied, mentioned you or sent you anything. Nobody can.',
    postNotFound: 'Post not found', profileOf: 'Profile', searchBlurb: 'Search Anti-Social',
  };
  const WORDS = { default: DEFAULT, chat: CHAT, blue: BLUE, reddit: REDDIT };
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
  const MAX_SERVER_NAME = 40;
  const cleanServerName = raw => String(raw == null ? '' : raw).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_SERVER_NAME).trim();
  // The server's name: the one you chose, or "<you>'s Server" until you do.
  const serverTitle = (acct, custom) => cleanServerName(custom) || serverName(acct);
  // "Cozy Cave" -> "CC"; the default "Ann's Server" -> "A" style initials of the owner, never "AS".
  const serverInitials = (title, acct) => {
    const t = cleanServerName(title);
    if (!t || t === serverName(acct)) return initials((acct && (acct.name || acct.handle)) || '?');
    return initials(t);
  };
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

  /* ---------- blue: how a time is written ("about an hour ago", "Yesterday at 3:04pm", "October 28 at 3:04pm") ---------- */
  const fbTime = (ts, now = Date.now(), locale) => {
    const d = new Date(ts), n = new Date(now), diff = now - ts;
    const t = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }).replace(/\s+/g, '').toLowerCase();
    const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((day(n) - day(d)) / 864e5);
    if (diff < 0) return `Today at ${t}`;
    if (diff < 60000) return 'a few seconds ago';
    if (diff < 3600000) { const m = Math.round(diff / 60000); return m <= 1 ? 'about a minute ago' : `${m} minutes ago`; }
    if (diff < 21600000 && days === 0) { const h = Math.round(diff / 3600000); return h <= 1 ? 'about an hour ago' : `about ${h} hours ago`; }
    if (days === 0) return `Today at ${t}`;
    if (days === 1) return `Yesterday at ${t}`;
    const date = d.toLocaleDateString(locale, { month: 'long', day: 'numeric', ...(d.getFullYear() !== n.getFullYear() ? { year: 'numeric' } : {}) });
    return `${date} at ${t}`;
  };

  /* ---------- reddit: "3 hr. ago", and the community's name ---------- */
  const COMMUNITY = 'r/AntiSocial';
  const redditTime = (ts, now = Date.now()) => {
    const s = Math.max(0, Math.round((now - ts) / 1000));
    if (s < 45) return 'just now'; const m = Math.round(s / 60); if (m < 60) return `${Math.max(1, m)} min. ago`;
    const hr = Math.round(m / 60); if (hr < 24) return `${hr} hr. ago`;
    const d = Math.round(hr / 24); if (d < 30) return `${d} ${d === 1 ? 'day' : 'days'} ago`;
    const mo = Math.round(d / 30); return mo < 12 ? `${mo} mo. ago` : `${Math.round(mo / 12)} yr. ago`;
  };
  // the number between the arrows: your own vote counts one
  const score = (base, up, down) => (base || 0) + (up ? 1 : 0) - (down ? 1 : 0);

  /* ---------- blue: little helpers ---------- */
  const firstName = acct => String((acct && (acct.name || acct.handle)) || '').trim().split(/\s+/)[0] || '';
  const countLabel = (n, one, many) => n === 1 ? `1 ${one}` : `${n} ${many}`;

  return { COMMUNITY, redditTime, score, TEMPLATES, get, valid, word, WORDS, MAX_CHANNELS, channelName, channelError, isGeneral, inChannel, crowdMayPost, serverName, serverTitle, cleanServerName, serverInitials, MAX_SERVER_NAME, initials, roleFor, ROLE_COLOR, memberGroups, messageOrder, firstName, countLabel, fbTime };
})();
if (typeof module !== 'undefined') module.exports = TemplateCore;
