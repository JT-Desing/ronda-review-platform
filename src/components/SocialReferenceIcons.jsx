import React from 'react';
const paths={heart:'M12 21s-9-5.7-9-12a5.3 5.3 0 0 1 9-3.8A5.3 5.3 0 0 1 21 9c0 6.3-9 12-9 12Z',chat:'M21 12a9 9 0 1 0-5 8l5 1-1-5a9 9 0 0 0 1-4Z',repost:'M4 14V9a4 4 0 0 1 4-4h11m-4-4 4 4-4 4M20 10v5a4 4 0 0 1-4 4H5m4-4-4 4 4 4',send:'M21 3 3.9 3c-1.7 0-2.3 1.8-1 2.8L10 11l3.7 9.2c.6 1.4 2.4 1.4 3 0L23 5c.5-1.2-.5-2-2-2ZM10 11l11-7',bookmark:'M5 3h14v18l-7-5-7 5Z'};
export function SocialReferenceIcon({name,size=25,...props}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><path d={paths[name]}/></svg>}
export const Heart=props=><SocialReferenceIcon name="heart" {...props}/>;
export const ChatBubble=props=><SocialReferenceIcon name="chat" {...props}/>;
export const RefreshDouble=props=><SocialReferenceIcon name="repost" {...props}/>;
export const Bookmark=props=><SocialReferenceIcon name="bookmark" {...props}/>;
