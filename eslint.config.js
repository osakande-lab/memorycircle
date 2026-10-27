const {defineConfig}=require('eslint/config');
const expoConfig=require('eslint-config-expo/flat');
module.exports=defineConfig([expoConfig,{ignores:['dist/**','dist-reviewed/**','node_modules/**','.expo/**','.pnpm-store/**','tests/**','scripts/**']}]);
