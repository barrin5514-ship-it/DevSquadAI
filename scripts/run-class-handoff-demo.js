import path from 'node:path';import {createClassDemo} from '../src/services/class-handoff-demo.js';
// Deliberately never loads .env. The class demo has no provider credentials.
const demo=createClassDemo({folder:path.resolve('data/class-handoff-demo')}),server=demo.app.listen(3002,'127.0.0.1',()=>console.log('SIMULATION ONLY: http://127.0.0.1:3002/class-demo'));
server.on('error',async()=>{console.error('Simulation server could not start; no retry');await demo.close();process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(async()=>{await demo.close();}));
