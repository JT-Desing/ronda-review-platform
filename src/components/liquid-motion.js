export function liquidGeometry(amount,phase,intensity=1){
 const a=Math.max(0,Math.min(1,amount)),wave=a*(1-a)*Math.max(0,Math.min(1.3,intensity));
 return [30,120,210].map((x,i)=>({cx:x,cy:108-a*94+Math.sin(phase+i*2.1)*wave*24+(i-1)*wave*22,rx:42+a*14,ry:42+a*14}));
}
export function stepLiquid(state,target,dt){
 const step=Math.min(.025,Math.max(0,dt)),velocity=state.velocity+((target-state.amount)*110-state.velocity*19)*step;
 const amount=state.amount+velocity*step;
 return Math.abs(target-amount)<.0005&&Math.abs(velocity)<.002?{amount:target,velocity:0}:{amount,velocity};
}
