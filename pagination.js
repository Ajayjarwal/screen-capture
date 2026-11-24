// Analyze screenshot rows, including captures made by earlier versions.
export function findPageBreak(image,{start,height,target,minimum}){
  const {data,width,height:rows}=image,ratio=height/rows,columns=new Uint32Array(width);
  const edge=(a,b)=>Math.max(Math.abs(data[a]-data[b]),Math.abs(data[a+1]-data[b+1]),Math.abs(data[a+2]-data[b+2]))>20;
  for(let y=0;y<rows;y++)for(let x=2;x<width-2;x++){const a=(y*width+x)*4;if(edge(a,a-4))columns[x]++;}
  const persistent=columns.reduce((n,v)=>n+(v>rows*.8?1:0),0),ignore=persistent<=Math.max(8,width*.02);
  const scores=new Uint32Array(rows);let baseline=Infinity;
  for(let y=0;y<rows;y++){let count=0;for(let x=2;x<width-2;x++){if(ignore&&columns[x]>rows*.8)continue;const a=(y*width+x)*4;if(edge(a,a-4))count++;}scores[y]=count;baseline=Math.min(baseline,count);}
  if(baseline>Math.max(6,width*.012))return {y:target,safe:false};
  const threshold=baseline+Math.max(1,Math.floor(width*.0007)),gaps=[];
  for(let row=0;row<rows;){
    if(scores[row]>threshold){row++;continue;}const first=row;while(row<rows&&scores[row]<=threshold)row++;const end=row;if(end-first<5)continue;
    const t=(target-start)/ratio,middle=end-first>Math.max(24,width*.03)&&t>=first+2&&t<=end-2?t:Math.min((first+end)/2,t);
    if(middle<first+2||middle>end-2)continue;const y=Math.round(start+middle*ratio);if(y<minimum||y>target)continue;gaps.push({y,wide:end-first>=Math.max(10,width*.009)});
  }
  if(!gaps.length)return {y:target,safe:false};const wide=gaps.filter(g=>g.wide),choices=wide.length?wide:gaps;return {y:choices.at(-1).y,safe:true};
}
export async function planPages({height,pageHeight,readRows,onProgress=()=>{}}){
  if(!Number.isInteger(height)||height<1||!Number.isInteger(pageHeight)||pageHeight<1)throw new Error('Invalid page dimensions.');
  const pages=[];let y=0,fallbacks=0;
  while(y<height){const target=Math.min(height,y+pageHeight);let end=target;if(target<height){const minimum=y+Math.max(1,Math.floor(pageHeight*.55)),start=Math.max(y,minimum-8),scanEnd=Math.min(height,target+16);onProgress(pages.length+1);const im=await readRows(start,scanEnd-start),choice=findPageBreak(im,{start,height:scanEnd-start,target,minimum});end=choice.y;if(!choice.safe)fallbacks++;}pages.push({y,height:end-y});y=end;}
  return {pages,fallbacks};
}
