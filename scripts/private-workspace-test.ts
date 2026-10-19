import {validReference} from "../functions/src/privateWorkspace/state";
import assert from "node:assert/strict";
import {permits,hashPassword,passwordMatches,readCookie,privatePath} from "../functions/src/privateWorkspace/policy";
const token={uid:"fixture-gm",email:"gm@example.test",email_verified:true,firebase:{sign_in_provider:"google.com"},auth_time:Math.floor(Date.now()/1000)};
const user={uid:token.uid,email:token.email,emailVerified:true,disabled:false,providerData:[{providerId:"google.com",email:token.email}],tokensValidAfterTime:new Date(0).toISOString()};
const grant={uid:token.uid,email:token.email,enabled:true,role:"gm" as const,sessionVersion:"fixture-version"};
assert.equal(permits(token,user,grant),true);
assert.equal(permits(token,user,{...grant,role:"admin"}),true);
for(const g of [undefined,{...grant,enabled:false},{...grant,role:"player"},{...grant,uid:"other"},{...grant,email:"other@example.test"},{...grant,sessionVersion:""}])assert.equal(permits(token,user,g as typeof grant),false);
for(const t of [{...token,uid:"other"},{...token,email_verified:false},{...token,email:"other@example.test"},{...token,firebase:{sign_in_provider:"custom"}},{...token,firebase:{sign_in_provider:"anonymous"}},{...token,auth_time:undefined}])assert.equal(permits(t,user,grant),false);
for(const u of [{...user,disabled:true},{...user,emailVerified:false},{...user,uid:"other"},{...user,providerData:[]},{...user,tokensValidAfterTime:new Date(Date.now()+10000).toISOString()}])assert.equal(permits(token,u,grant),false);
const secret=await hashPassword("Synthetic-test-password-42");
assert.equal(await passwordMatches("Synthetic-test-password-42",secret),true);
assert.equal(await passwordMatches("Synthetic-wrong-password",secret),false);
assert.equal(await passwordMatches("short",secret),false);
assert.notEqual((await hashPassword("Synthetic-test-password-42")).hash,secret.hash);
const cookie=Buffer.from(JSON.stringify({firebase:"fixture",proof:"a".repeat(64)})).toString("base64url");
assert.deepEqual(readCookie(`unrelated=1; __session=${cookie}`),{firebase:"fixture",proof:"a".repeat(64)});
for(const value of [undefined,"__session=broken","__session="+"x".repeat(7000)])assert.equal(readCookie(value),null);
assert.equal(privatePath("/app/"),"index.html");assert.equal(privatePath("/app/display/"),"display/index.html");assert.equal(privatePath("/app/assets/fixture.png"),"assets/fixture.png");
for(const path of ["/public/file","/app/../secret","/app/%2e%2e/secret","/app/a//file","/app/a\\file","/app/.hidden","/app/a?token=secret"]){assert.equal(privatePath(path),null,path);}
console.log("Private workspace identity, password, cookie and path tests passed.");

assert.equal(validReference({version:3,npcEdits:{},creatureArt:{},customItems:[]}),true);
for(const invalid of [null,{version:3}, {version:3,npcEdits:{fixture:{story:{script:"bad"}}},creatureArt:{},customItems:[]}, {version:3,npcEdits:{},creatureArt:{fixture:"https://example.test/leak"},customItems:[]}])assert.equal(validReference(invalid),false);
