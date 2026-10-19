import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfjsPackageUrl=import.meta.resolve('pdfjs-dist/package.json');
const requirePdfRuntimeDependency=createRequire(pdfjsPackageUrl);
const {createCanvas}=requirePdfRuntimeDependency('@napi-rs/canvas');
const standardFontDataUrl=fileURLToPath(new URL('./standard_fonts/',pdfjsPackageUrl)).replaceAll('\\','/')+'/';
const loadPdf= data => getDocument({data,isEvalSupported:false,stopAtErrors:true,standardFontDataUrl});

function onePagePdf(text='Ronda QA PDF'){
  const stream=`BT /F1 18 Tf 50 140 Td (${text}) Tj ET\n`;
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let source='%PDF-1.4\n';
  const offsets=[0];
  for(let i=0;i<objects.length;i++){
    offsets.push(Buffer.byteLength(source));
    source+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref=Buffer.byteLength(source);
  source+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  source+=offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('');
  source+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(source));
}

test('PDF engine parses uploaded bytes and reads first-page content',async()=>{
  const bytes=onePagePdf();
  const source=Buffer.from(bytes).toString('ascii');
  const startxref=Number(source.slice(source.lastIndexOf('startxref')).split('\n')[1]);
  assert.equal(source.slice(startxref,startxref+4),'xref');
  const objectOffsets=[...source.matchAll(/(\d{10}) 00000 n/g)].map(match=>Number(match[1]));
  for(let index=0;index<objectOffsets.length;index++)assert.ok(source.startsWith(`${index+1} 0 obj`,objectOffsets[index]));
  const task=loadPdf(bytes);
  try{
    const document=await task.promise;
    assert.equal(document.numPages,1);
    const page=await document.getPage(1);
    assert.deepEqual(page.getViewport({scale:1}).viewBox,[0,0,300,200]);
    const content=await page.getTextContent();
    assert.equal(content.items.map(item=>item.str).join(''),'Ronda QA PDF');
  }finally{
    await task.destroy();
  }
});

test('checked-in browser QA PDF fixture remains readable',async()=>{
  const data=new Uint8Array(await readFile(new URL('../docs/qa/fixtures/ronda-synthetic-review.pdf',import.meta.url)));
  const task=loadPdf(data);
  try{
    const document=await task.promise;
    assert.equal(document.numPages,1);
    const page=await document.getPage(1);
    assert.deepEqual(page.getViewport({scale:1}).viewBox,[0,0,300,200]);
    const content=await page.getTextContent();
    assert.equal(content.items.map(item=>item.str).join(''),'Ronda QA PDF');
  }finally{
    await task.destroy();
  }
});

test('checked-in PDF fixture renders visible page pixels to a canvas',async()=>{
  const data=new Uint8Array(await readFile(new URL('../docs/qa/fixtures/ronda-synthetic-review.pdf',import.meta.url)));
  const task=loadPdf(data);
  try{
    const document=await task.promise;
    const page=await document.getPage(1);
    const viewport=page.getViewport({scale:1});
    const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    const context=canvas.getContext('2d');
    await page.render({canvasContext:context,viewport}).promise;
    const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
    let nonWhitePixels=0;
    for(let index=0;index<pixels.length;index+=4){
      if(pixels[index]<245||pixels[index+1]<245||pixels[index+2]<245)nonWhitePixels++;
    }
    assert.ok(canvas.width>0&&canvas.height>0,'the PDF page should allocate a visible canvas');
    assert.ok(nonWhitePixels>0,'rendering should paint content rather than leave a blank white page');
    assert.ok(nonWhitePixels<canvas.width*canvas.height,'the rendered page should retain a white background');
  }finally{
    await task.destroy();
  }
});

test('PDF engine rejects corrupt bytes instead of returning a blank document',async()=>{
  const task=loadPdf(new Uint8Array(Buffer.from('not a PDF')));
  try{
    await assert.rejects(task.promise);
  }finally{
    await task.destroy();
  }
});
