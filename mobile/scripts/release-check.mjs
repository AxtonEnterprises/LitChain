import fs from "node:fs";
import path from "node:path";
const root=process.cwd(), failures=[], warnings=[];
const readJson=(name)=>{try{return JSON.parse(fs.readFileSync(path.join(root,name),"utf8"));}catch(e){failures.push(`Invalid or missing ${name}: ${e.message}`);return {}}};
const requireFile=(rel)=>{if(!fs.existsSync(path.join(root,rel))) failures.push(`Missing required file: ${rel}`)};
const pkg=readJson("package.json"), app=readJson("app.json"), eas=readJson("eas.json"), expo=app.expo||{};
["app/_layout.js","app/index.js","app/login.js","app/home.js","app/library.js","app/groups.js","app/notifications.js","app/reader/[bookId].js","lib/firebase.js"].forEach(requireFile);
if(pkg.main!=="expo-router/entry") failures.push("package.json main must be expo-router/entry.");
if(!expo.android?.package) failures.push("Android package identifier is missing.");
if(!Number.isInteger(expo.android?.versionCode)||expo.android.versionCode<1) failures.push("Android versionCode must be a positive integer.");
if(!expo.ios?.bundleIdentifier) failures.push("iOS bundleIdentifier is missing.");
if(!String(expo.ios?.buildNumber||"").trim()) failures.push("iOS buildNumber is missing.");
if(!expo.scheme) warnings.push("No deep-link scheme is configured.");
if(!expo.extra?.eas?.projectId) warnings.push("EAS projectId is missing.");
if(eas.build?.preview?.android?.buildType!=="apk") warnings.push("Preview is not explicitly configured to create an APK.");
console.log("\nLit Chain release preflight\n");
if(warnings.length){console.log("Warnings:");warnings.forEach(x=>console.log(`  - ${x}`));}
if(failures.length){console.error("FAILED:");failures.forEach(x=>console.error(`  - ${x}`));process.exit(1);}
console.log("PASS: required release configuration and core routes are present.");
