// Ids of the members tagged as "@Name" in a comment. Longer names are matched first so
// "@Ana María" is not also read as "@Ana".
export function mentionedMemberIds(text, members) {
  if (typeof text !== 'string' || !text.includes('@')) return [];
  const found = [];
  let rest = text.toLocaleLowerCase();
  for (const member of [...members].filter(item => item?.id && item?.name).sort((a, b) => b.name.length - a.name.length)) {
    const tag = '@' + member.name.toLocaleLowerCase();
    let at = rest.indexOf(tag);
    let hit = false;
    while (at !== -1) {
      const after = rest[at + tag.length];
      if (after === undefined || !/[\p{L}\p{N}]/u.test(after)) { hit = true; rest = rest.slice(0, at) + ' '.repeat(tag.length) + rest.slice(at + tag.length); }
      at = rest.indexOf(tag, at + 1);
    }
    if (hit) found.push(member.id);
  }
  return found;
}
