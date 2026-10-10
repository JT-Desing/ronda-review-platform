export function importAccountState(old, user) {
  if (old?.schemaVersion !== 1 || !old.members || !old.projects || !old.versions || !old.comments) throw new Error('La copia local no tiene un formato compatible.');
  const previous = old.currentUserId;
  const map = id => id === previous ? user.id : id;
  const members = { ...old.members };
  delete members[previous];
  members[user.id] = { ...user, initials: user.name.slice(0, 2).toUpperCase(), role: 'admin', status: 'active' };
  const versions = Object.fromEntries(Object.entries(old.versions).map(([id, value]) => [id, { ...value, reviewerIds: [...new Set((value.reviewerIds || []).map(map))], decisions: Object.fromEntries(Object.entries(value.decisions || {}).map(([key, decision]) => [map(key), decision])) }]));
  const comments = Object.fromEntries(Object.entries(old.comments).map(([id, value]) => [id, { ...value, authorId: map(value.authorId), assigneeId: map(value.assigneeId), replies: Array.isArray(value.replies) ? value.replies.map(reply => ({ ...reply, authorId: map(reply.authorId) })) : value.replies }]));
  return { ...old, currentUserId: user.id, workspace: { ...old.workspace, id: `account-${user.id}` }, members, versions, comments, activity: (old.activity || []).map(event => ({ ...event, actorId: map(event.actorId) })), notifications: Object.fromEntries(Object.entries(old.notifications || {}).map(([id, value]) => [id, { ...value, memberId: map(value.memberId) }])) };
}
