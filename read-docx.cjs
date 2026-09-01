const JSZip = require('C:\\Users\\chandramouli\\Downloads\\Nat20-main\\Nat20-main\\node_modules\\jszip');
const fs = require('fs');
const buf = fs.readFileSync('C:\\Users\\chandramouli\\Downloads\\brd.docx');
JSZip.loadAsync(buf).then(function(zip) {
  return zip.file('word/document.xml').async('string');
}).then(function(xml) {
  const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  process.stdout.write(text.substring(12000, 28000));
}).catch(function(e){ console.error(e.message); });
