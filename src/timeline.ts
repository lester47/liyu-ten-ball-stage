export const names = ['慢速亮相','依序接力','左右對拍','十球開花','快走急停','觀眾倒數','雙波衝線','定格謝幕'];
export const durations = [6,8,8,8,8,7,8,7];
export const summaries = ['第一對緩緩前進，點亮舞台','2 至 5 號依序成對出發','左隊先走，右隊跟上，兩次對拍','單數向外、定格，再收回來','十球退至急停點，整齊停住','保持隊形，迎接 3、2、1','單數先衝，雙數接力到站','揮手、鞠躬，向觀眾致謝'];
export type Card = {id:string;type:number;duration:number};
export type Segment = {id:string;cardId:string;type:number;start:number;end:number;from:number[];to:number[];transition:boolean};
export const template = ():Card[] => durations.map((duration,type)=>({id:crypto.randomUUID(),type,duration}));
const all = (d:number)=>Array(10).fill(d) as number[];
const initial = (type:number):number[]|null => type===0?all(1):type===1?all(1).map((v,i)=>i%5===0?2:v):type===2?all(2):type===3||type===4?all(3.8):type===6?all(3.3):null;
const lerp = (a:number,b:number,t:number)=>a+(b-a)*Math.max(0,Math.min(1,t));
export function motion(type:number,t:number,from:number[]):number[]{
 return from.map((d,i)=>{const n=i%5;const left=i<5;
  if(type===0&&n===0)return lerp(d,2,(t-1)/4);
  if(type===1&&n>0)return lerp(d,2,(t-(n-1)*2)/2);
  if(type===2){const first=left?0:2, second=left?4:6;return t<second?lerp(d,2.9,(t-first)/1.5):lerp(2.9,3.8,(t-second)/1.5);}
  if(type===3&&n%2===0)return t<4?lerp(d,2,t/2):lerp(2,3.8,(t-4)/2);
  if(type===4)return lerp(d,3.3,t);
  if(type===6)return lerp(d,1,(t-(n%2===0?0:1))/1.5);
  return d;
 });
}
export function compile(cards:Card[]):Segment[]{
 let state=all(1),time=0; const segments:Segment[]=[];
 for(const card of cards){const required=initial(card.type);
  if(required&&required.some((d,i)=>Math.abs(d-state[i])>0.00001)){segments.push({id:`move-${card.id}`,cardId:card.id,type:card.type,start:time,end:time+2,from:[...state],to:[...required],transition:true});time+=2;state=required;}
  const to=motion(card.type,durations[card.type],state);segments.push({id:card.id,cardId:card.id,type:card.type,start:time,end:time+card.duration,from:[...state],to,transition:false});state=to;time+=card.duration;
 }return segments;
}
export function sample(segments:Segment[],time:number){
 const segment=segments.find(s=>time>=s.start&&time<s.end)??(time>=0?segments.at(-1):undefined);
 if(!segment)return {positions:all(1),subtitle:'準備好，讓十顆球一起上場',countdown:'',segment:undefined,local:0};
 const progress=Math.max(0,Math.min(1,(time-segment.start)/(segment.end-segment.start)));const t=progress*durations[segment.type];
 const positions=segment.transition?segment.from.map((d,i)=>lerp(d,segment.to[i],progress)):motion(segment.type,t,segment.from);
 let subtitle=names[segment.type],countdown='';
 if(segment.transition)subtitle=`換位準備 · ${names[segment.type]}`;
 else if(segment.type===0)subtitle='第一對出發！';
 else if(segment.type===1)subtitle=`第 ${Math.min(5,Math.floor(t/2)+2)} 對出發！`;
 else if(segment.type===2)subtitle=t<2||t>=4&&t<6?'左！':'右！';
 else if(segment.type===3)subtitle=t<2?'單數向外！':t<4?'定格！':'收回來！';
 else if(segment.type===4)subtitle=t<1?'快走！':'停！';
 else if(segment.type===5){subtitle='觀眾一起倒數！';countdown=t>=4&&t<7?String(3-Math.floor(t-4)):'';}
 else if(segment.type===6)subtitle=t<1?'衝！':t<2.5?'第二波跟上！':'十球到站！';
 else if(segment.type===7)subtitle='掌聲送給鯉魚機器人隊！';
 return {positions,subtitle,countdown,segment,local:t};
}
