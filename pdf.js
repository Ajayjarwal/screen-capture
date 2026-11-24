// Local raster PDF writer. Binary image data is stored in Blob parts.
export class ScreenshotPDF{
  constructor(){this.parts=[];this.offset=0;this.offsets=[0];this.pageIds=[];this.next=3;this.push('%PDF-1.6\n%PYQ\n');}
  push(v){const d=typeof v==='string'?new TextEncoder().encode(v):v;this.parts.push(d);this.offset+=d.byteLength;}
  object(id,body){this.offsets[id]=this.offset;this.push(`${id} 0 obj\n${body}\nendobj\n`);}
  stream(id,attrs,bytes){this.offsets[id]=this.offset;this.push(`${id} 0 obj\n<< ${attrs} /Length ${bytes.byteLength} >>\nstream\n`);this.push(bytes);this.push('\nendstream\nendobj\n');}
  addPage(width,height,images,userUnit=1){
    const page=this.next++,content=this.next++,ids=images.map(()=>this.next++);
    const resources=ids.map((id,i)=>`/Im${i} ${id} 0 R`).join(' ');
    const commands=images.map((im,i)=>`q ${im.drawWidth.toFixed(4)} 0 0 ${im.drawHeight.toFixed(4)} ${im.x.toFixed(4)} ${im.y.toFixed(4)} cm /Im${i} Do Q`).join('\n');
    this.object(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(4)} ${height.toFixed(4)}] /UserUnit ${userUnit} /Resources << /XObject << ${resources} >> >> /Contents ${content} 0 R >>`);
    this.stream(content,'',new TextEncoder().encode(commands));images.forEach((im,i)=>this.stream(ids[i],`/Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,im.bytes));this.pageIds.push(page);
  }
  finish(){this.object(1,'<< /Type /Catalog /Pages 2 0 R >>');this.object(2,`<< /Type /Pages /Count ${this.pageIds.length} /Kids [${this.pageIds.map(id=>`${id} 0 R`).join(' ')}] >>`);const start=this.offset;this.push(`xref\n0 ${this.next}\n0000000000 65535 f \n`);for(let i=1;i<this.next;i++)this.push(`${String(this.offsets[i]).padStart(10,'0')} 00000 n \n`);this.push(`trailer\n<< /Size ${this.next} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`);return new Blob(this.parts,{type:'application/pdf'});}
}
