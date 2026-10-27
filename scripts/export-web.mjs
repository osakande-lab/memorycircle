import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const preloader=process.platform==='win32'?['--import',pathToFileURL(resolve('scripts/serialize-mkdir.mjs')).href]:[];
const child=spawn(process.execPath,[...preloader,require.resolve('expo/bin/cli'),'export','--platform','web','--output-dir','dist-reviewed','--max-workers','2',...process.argv.slice(2)],{stdio:'inherit',env:process.env});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
