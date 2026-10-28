import {mkdir,writeFile,open} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../.superpowers/ronda-usability/fixtures/',import.meta.url));await mkdir(root,{recursive:true});
const rate=16000,samples=rate*2,wav=Buffer.alloc(44+samples*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(1800*Math.sin(2*Math.PI*440*i/rate)),44+i*2);
await writeFile(root+'qa-tone.wav',wav);await writeFile(root+'invalid-video.mp4','This is not an MP4. QA invalid-signature fixture.');
const large=await open(root+'too-large.png','w');await large.truncate(101*1024*1024);await large.close();console.log('QA fixtures created: 2-second WAV, invalid MP4 and sparse 101 MB image.');
