import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'VITE_');
 if(!/^pk_(test|live)_/.test(env.VITE_CLERK_PUBLISHABLE_KEY||'')) throw new Error('Configure VITE_CLERK_PUBLISHABLE_KEY before building PostAI');
 return {plugins:[react()]};
});
