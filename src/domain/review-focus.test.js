import {test} from 'node:test';
import assert from 'node:assert/strict';
import {containDialogFocus,ignoreReviewShortcut} from './review-focus.js';
test('Tab and Shift+Tab wrap within modal endpoints',()=>{
 const first={focus(){active=first;}},last={focus(){active=last;}};let active=last,prevented=0;
 const dialog={querySelectorAll:()=>[first,last],ownerDocument:{get activeElement(){return active;}}};
 containDialogFocus({key:'Tab',preventDefault(){prevented++;}},dialog);assert.equal(active,first);
 containDialogFocus({key:'Tab',shiftKey:true,preventDefault(){prevented++;}},dialog);assert.equal(active,last);assert.equal(prevented,2);
});
test('native control activation and dialog typing never invoke stage shortcuts',()=>{
 const doc={querySelector:()=>null};
 assert.equal(ignoreReviewShortcut({target:{closest:()=>({})}},doc),true);
 assert.equal(ignoreReviewShortcut({target:{closest:()=>null}},doc),false);
 assert.equal(ignoreReviewShortcut({target:{closest:()=>null}},{querySelector:()=>({})}),true);
 assert.equal(ignoreReviewShortcut({defaultPrevented:true},doc),true);
 assert.equal(ignoreReviewShortcut({key:'Escape',target:{closest:()=>({})}},doc),false);
});
