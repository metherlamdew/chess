// Chess rules engine (runs on the server only)
const N=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
const O=[[1,0],[-1,0],[0,1],[0,-1]],D=[[1,1],[1,-1],[-1,1],[-1,-1]];
function init(){
  const back="RNBQKBNR".split(""),b=[];
  b.push(back.map(x=>"b"+x));b.push(Array(8).fill("bP"));
  for(let i=0;i<4;i++)b.push(Array(8).fill(null));
  b.push(Array(8).fill("wP"));b.push(back.map(x=>"w"+x));
  return{b,t:"w",c:{wK:1,wQ:1,bK:1,bQ:1},ep:null,cap:{w:[],b:[]},last:null};
}
function att(b,r,c,by){
  const pr=r+(by==="w"?1:-1);
  for(const dc of[-1,1])if(b[pr]?.[c+dc]===by+"P")return 1;
  for(const[dr,dc]of N)if(b[r+dr]?.[c+dc]===by+"N")return 1;
  for(let dr=-1;dr<2;dr++)for(let dc=-1;dc<2;dc++)if((dr||dc)&&b[r+dr]?.[c+dc]===by+"K")return 1;
  for(const[ds,ty]of[[O,"R"],[D,"B"]])for(const[dr,dc]of ds){
    let R=r+dr,C=c+dc;
    while(R>=0&&R<8&&C>=0&&C<8){
      const q=b[R][C];
      if(q){if(q[0]===by&&(q[1]===ty||q[1]==="Q"))return 1;break}
      R+=dr;C+=dc;
    }
  }
  return 0;
}
function inCheck(b,col){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===col+"K")return !!att(b,r,c,col==="w"?"b":"w");
  return false;
}
function pseudo(s,r,c){
  const b=s.b,p=b[r][c],col=p[0],ty=p[1],o=[],en=col==="w"?"b":"w";
  const add=(R,C)=>{
    if(R<0||R>7||C<0||C>7)return 0;
    const q=b[R][C];
    if(!q){o.push([R,C]);return 1}
    if(q[0]===en)o.push([R,C]);
    return 0;
  };
  if(ty==="P"){
    const d=col==="w"?-1:1,st=col==="w"?6:1;
    if(!b[r+d][c]){o.push([r+d,c]);if(r===st&&!b[r+2*d][c])o.push([r+2*d,c])}
    for(const dc of[-1,1]){
      const q=b[r+d]?.[c+dc];
      if(q&&q[0]===en)o.push([r+d,c+dc]);
      else if(s.ep&&s.ep[0]===r+d&&s.ep[1]===c+dc)o.push([r+d,c+dc,"ep"]);
    }
  }else if(ty==="N"){for(const[dr,dc]of N)add(r+dr,c+dc)}
  else if(ty==="K"){
    for(let dr=-1;dr<2;dr++)for(let dc=-1;dc<2;dc++)if(dr||dc)add(r+dr,c+dc);
    const h=col==="w"?7:0;
    if(r===h&&c===4&&!att(b,h,4,en)){
      if(s.c[col+"K"]&&b[h][7]===col+"R"&&!b[h][5]&&!b[h][6]&&!att(b,h,5,en)&&!att(b,h,6,en))o.push([h,6,"cs"]);
      if(s.c[col+"Q"]&&b[h][0]===col+"R"&&!b[h][1]&&!b[h][2]&&!b[h][3]&&!att(b,h,3,en)&&!att(b,h,2,en))o.push([h,2,"cq"]);
    }
  }else{
    const ds=ty==="R"?O:ty==="B"?D:O.concat(D);
    for(const[dr,dc]of ds){let k=1;while(add(r+dr*k,c+dc*k))k++}
  }
  return o;
}
function apply(s,a,m,pr){
  const n={b:s.b.map(x=>[...x]),t:s.t==="w"?"b":"w",c:{...s.c},ep:null,cap:{w:[...s.cap.w],b:[...s.cap.b]}};
  const[r,c]=a,[R,C,fl]=m,p=n.b[r][c],col=p[0];
  let cp=n.b[R][C];
  if(fl==="ep"){cp=n.b[r][C];n.b[r][C]=null}
  if(cp)n.cap[col].push(cp);
  n.b[R][C]=p;n.b[r][c]=null;
  if(p[1]==="P"){
    if(Math.abs(R-r)===2)n.ep=[(r+R)/2,c];
    if(R===0||R===7)n.b[R][C]=col+(pr||"Q");
  }
  if(fl==="cs"){n.b[R][5]=n.b[R][7];n.b[R][7]=null}
  if(fl==="cq"){n.b[R][3]=n.b[R][0];n.b[R][0]=null}
  if(p[1]==="K"){n.c[col+"K"]=0;n.c[col+"Q"]=0}
  for(const[q,k]of[[[7,0],"wQ"],[[7,7],"wK"],[[0,0],"bQ"],[[0,7],"bK"]])
    if((r===q[0]&&c===q[1])||(R===q[0]&&C===q[1]))n.c[k]=0;
  n.last=[a,[R,C]];
  return n;
}
function legal(s,r,c){
  const col=s.b[r][c][0];
  return pseudo(s,r,c).filter(m=>!inCheck(apply(s,[r,c],m,"Q").b,col));
}
function allLegal(s){
  const o={};
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(s.b[r][c]&&s.b[r][c][0]===s.t){const m=legal(s,r,c);if(m.length)o[r+","+c]=m}
  return o;
}
module.exports={init,apply,legal,inCheck,allLegal};
