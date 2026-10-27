// Expo writes many bundles in parallel. Serialize mkdir on Windows to avoid
// concurrent directory creation errors; original permissions/errors are preserved.
import fs from 'node:fs';
if(process.platform==='win32'){
 const original=fs.promises.mkdir.bind(fs.promises);let queue=Promise.resolve();
 fs.promises.mkdir=(...args)=>{const operation=queue.then(()=>original(...args));queue=operation.catch(()=>{});return operation;};
}
