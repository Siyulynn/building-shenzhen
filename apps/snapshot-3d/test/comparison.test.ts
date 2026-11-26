import {describe,expect,it} from 'vitest';
import {comparisonDate,comparisonShortcut} from '../src/comparison';

describe('atlas date comparison',()=>{
  it('pairs a bookend with September by default and reuses the last explicit pair',()=>{
    expect(comparisonDate('baseline')).toBe('visit');
    expect(comparisonDate('opening')).toBe('baseline');
    expect(comparisonDate('visit')).toBe('baseline');
    const pair=comparisonDate('visit','opening');
    expect(pair).toBe('opening');
    expect(comparisonDate(pair,'visit')).toBe('visit');
  });

  it('maps the documented keys without hijacking chords, IME or auto-repeat',()=>{
    const event=(key:string)=>({key,repeat:false,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,
      defaultPrevented:false,isComposing:false});
    expect(['1','2','3','f','Escape','ArrowRight',' '].map(key=>comparisonShortcut(event(key)))).toEqual([
      'opening','baseline','visit','flip','exit',undefined,undefined,
    ]);
    for(const flag of ['repeat','ctrlKey','altKey','shiftKey','metaKey','defaultPrevented','isComposing'] as const)
      expect(comparisonShortcut({...event('f'),[flag]:true})).toBeUndefined();
  });
});
