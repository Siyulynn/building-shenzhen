type Rect = {left:number;top:number;width:number;height:number};
type Label = {x:number;y:number;width:number;height:number};

function overlap(a:Rect,b:Rect){
  const width=Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left)+3;
  const height=Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top)+3;
  return Math.max(0,width)*Math.max(0,height);
}

/** Keep every site marker; name placement can omit overlapping text in crowded views. */
export function layoutBuildingLabels(labels:Label[],width:number,height:number,obstacles:Rect[],showOverlapping:boolean){
  const occupied=[...obstacles];
  return labels.map(label=>{
    const {x,y,width:w,height:h}=label;
    const clamp=(left:number,top:number):Rect=>({
      left:Math.max(4,Math.min(width-w-4,left)),top:Math.max(4,Math.min(height-h-4,top)),width:w,height:h,
    });
    let best=clamp(x-w/2,y-h-6),bestCost=Infinity;
    for(const gap of [6,24,48,76,110]){
      const candidates=[
        [x-w/2,y-h-gap],[x+gap,y-h/2],[x-w-gap,y-h/2],[x-w/2,y+gap],
        [x+gap,y-h-gap],[x-w-gap,y-h-gap],[x+gap,y+gap],[x-w-gap,y+gap],
      ];
      for(const [left,top] of candidates){
        const rect=clamp(left!,top!);
        const cost=occupied.reduce((sum,other)=>sum+overlap(rect,other),0);
        if(cost<bestCost){best=rect;bestCost=cost;}
        if(cost===0)break;
      }
      if(bestCost===0)break;
    }
    if(bestCost>0&&!showOverlapping)return undefined;
    occupied.push(best);
    return best;
  });
}
