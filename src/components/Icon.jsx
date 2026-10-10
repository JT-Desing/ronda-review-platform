import React from 'react';
import { Calendar } from 'iconoir-react';
import { Home, ViewGrid, Folder, Clock, Group, Settings, Search, ShareAndroid, Play, Pause, SoundHigh, Expand, EditPencil, ArrowUpRight, Square, Text, Undo, Redo, Check, MoreHoriz, MediaImage, Send, Sparks, NavArrowRight, Plus, Xmark, Bell, WarningTriangle, Link } from 'iconoir-react';

const icons = { home: Home, grid: ViewGrid, folder: Folder, clock: Clock, users: Group, settings: Settings, search: Search, share: ShareAndroid, play: Play, pause: Pause, volume: SoundHigh, maximize: Expand, pen: EditPencil, arrow: ArrowUpRight, square: Square, type: Text, undo: Undo, redo: Redo, check: Check, more: MoreHoriz, image: MediaImage, send: Send, spark: Sparks, chevron: NavArrowRight, plus: Plus, x: Xmark, bell: Bell, alert: WarningTriangle, link: Link };

// Labels belong to the surrounding control; decorative icons stay out of the accessibility tree.
export default function Icon({ name, size = 18, className = '' }) {
  const Component = name === 'calendar' ? Calendar : icons[name];
  if (!Component) throw new Error(`Unknown UI icon: ${name}`);
  return <Component aria-hidden="true" focusable="false" className={`icon ${className}`} width={size} height={size} strokeWidth={1.5}/>;
}
