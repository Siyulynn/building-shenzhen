import type {BuiltDate} from './epochs';

const dates=['opening','baseline','visit'] as const;
export const dateLabels:Record<BuiltDate,string>={
  opening:'1979 opening · 1979 年初',baseline:'Sep 1980 · 1980 年 9 月',visit:'Jan 1984 · 1984 年 1 月',
};

/** The first comparison pairs a bookend with September; later flips swap the
 * last two selected dates, regardless of how they were selected. */
export function comparisonDate(current:BuiltDate,previous?:BuiltDate):BuiltDate{
  return previous&&previous!==current?previous:current==='baseline'?'visit':'baseline';
}

export function comparisonShortcut(e:Pick<KeyboardEvent,'key'|'repeat'|'ctrlKey'|'metaKey'|'altKey'|'shiftKey'|'isComposing'|'defaultPrevented'>){
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.isComposing||e.defaultPrevented)return;
  if(e.key==='f')return 'flip';
  if(e.key==='Escape')return 'exit';
  if(e.key==='1'||e.key==='2'||e.key==='3')return dates[Number(e.key)-1];
}
