import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';const mp='C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',m=JSON.parse(fs.readFileSync(mp)),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),file='packages/extension-service/native/windows-filesystem.cs',raw=fs.readFileSync(file),at=new Date().toISOString(),dir=m.base+'/evidence/p02-native-canonical-codec-repair-'+at.replace(/[-:.]/g,'');assert.equal(sha(raw),'a9916584bf3709ab47e68283e83903b117539c46ebfb1794166f191c39cd105e');assert(m.nativeCanonicalCodecRcaDir);fs.mkdirSync(dir);fs.writeFileSync(dir+'/before-native.cs',raw,{flag:'wx'});const method=String.raw`  // Match the existing host JSON.stringify encoding without relaxing canonical/duplicate-key checks.
  static string CanonicalJson(object value) {
    string encoded=Json.Serialize(value);var result=new StringBuilder(encoded.Length);
    for(int i=0;i<encoded.Length;i++){
      char c=encoded[i];if(c==(char)92&&i+1<encoded.Length){
        if(encoded[i+1]=='u'&&i+5<encoded.Length){string token=encoded.Substring(i,6);char plain=(char)0;
          switch(token){case "\u0027":plain=(char)39;break;case "\u0026":plain=(char)38;break;case "\u003c":plain=(char)60;break;case "\u003e":plain=(char)62;break;case "\u2028":plain=(char)0x2028;break;case "\u2029":plain=(char)0x2029;break;}
          if(plain!=0){result.Append(plain);i+=5;continue;}
        }
        // An escaped backslash is consumed as a pair; literal "\\u0027" data stays literal.
        result.Append(c);result.Append(encoded[++i]);continue;
      }
      result.Append(c);
    }return result.ToString();
  }
`;
let s=raw.toString();assert(s.includes('  static void Check(bool value)'));s=s.replace('  static void Check(bool value)',method+'  static void Check(bool value)');assert.equal(s.split('Json.Serialize(request)').length,2);s=s.replace('Json.Serialize(request)!=text','CanonicalJson(request)!=text').replaceAll('Json.Serialize(result)','CanonicalJson(result)');fs.writeFileSync(file,s);
const tests='packages/extension-service/tests/filesystem.windows.test.ts',beforeTests=fs.readFileSync(tests),original=fs.readFileSync(m.nativeExtendedGuardProtocolRedDir+'/original-native9.test.txt');assert(beforeTests.subarray(0,original.length).equals(original));let t=beforeTests.toString();const anchor="expect((await f.send('bind', { root: f.root })).status).toBe('REFUSED')\n    expect(await fs.readFile(path.join(f.outside, 'sentinel'), 'utf8')).toBe('outside-original')";assert(t.includes(anchor));t=t.replace(anchor,`expect((await f.send('bind', { root: f.root })).status).toBe('REFUSED')
    const exit = await new Promise<number | null>((resolve, reject) => {
      if (f.process.exitCode !== null) { resolve(f.process.exitCode); return }
      const timer = setTimeout(() => reject(Error('EXPECTED_REFUSAL_EXIT_TIMEOUT')), 5000)
      f.process.once('close', code => { clearTimeout(timer); resolve(code) })
    })
    expect(exit).toBe(2)
    expect(await fs.readFile(path.join(f.outside, 'sentinel'), 'utf8')).toBe('outside-original')`);fs.writeFileSync(tests,t);assert(fs.readFileSync(tests).subarray(0,original.length).equals(original));fs.writeFileSync(dir+'/repair.json',JSON.stringify({atUtc:at,classification:'INTEGRATION_AND_TEST',RCA:m.nativeCanonicalCodecRcaDir,nativeBeforeSha256:sha(raw),nativeAfterSha256:sha(fs.readFileSync(file)),originalNative9PrefixByteIdentical:sha(original),fixtureWait:'Only new forged-lease tail now requires bounded actual normal helper exit2 before unchanged outside byte assertion; no arbitrary delay/killing/failure masking',canonicalEncoding:'Normalize only six Framework emitted HTML/line-separator escape tokens to established host JSON.stringify representation; consume escaped backslash pairs intact; retain exact canonical comparison/duplicate-key/schema/UTF8/byte limits. No new accepted logical value/root/operation/share/permission.',build:'NOT_RUN',runtime:'NOT_RUN',capabilities:'NOT_VERIFIED'},null,2)+'\n',{flag:'wx'});fs.copyFileSync(process.argv[1],dir+'/repair-codec.mjs',fs.constants.COPYFILE_EXCL);m.nativeCanonicalCodecRepairDir=dir;m.phase='NATIVE_CANONICAL_CODEC_BUILD_REGRESSION_PENDING';fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify({dir,sourceSha256:sha(fs.readFileSync(file)),original9PrefixUnchanged:true}));
