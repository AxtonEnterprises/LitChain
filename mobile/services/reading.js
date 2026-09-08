import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export async function getNativeReadingProgress(bookId){
  const u=auth.currentUser;if(!u||!bookId)return null;
  try{const s=await getDoc(doc(db,"users",u.uid,"readingProgress",String(bookId)));return s.exists()?{id:s.id,...s.data()}:null;}catch{return null;}
}
export async function getNativeReadingTimeline(){
  const u=auth.currentUser;if(!u)return [];
  try{const s=await getDocs(collection(db,"users",u.uid,"readingProgress"));
    return s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.positionUpdatedAtISO||b.updatedAtISO||"").localeCompare(String(a.positionUpdatedAtISO||a.updatedAtISO||"")));
  }catch{return [];}
}
export async function saveNativeReadingProgress({bookId,title,author,paragraphIndex,totalParagraphs,image=""}){
  const u=auth.currentUser;if(!u||!bookId)return null;
  const ref=doc(db,"users",u.uid,"readingProgress",String(bookId));
  let old={};try{const s=await getDoc(ref);if(s.exists())old=s.data();}catch{}
  const total=Math.max(Number(totalParagraphs)||0,0), idx=Math.max(Number(paragraphIndex)||0,0);
  const pct=total>1?Math.min(100,Math.max(0,Math.round(idx/(total-1)*100))):0, now=new Date().toISOString();
  await setDoc(ref,{bookId:String(bookId),title:title||old.title||"Untitled",author:author||old.author||"",image:image||old.image||null,
    paragraphIndex:idx,totalParagraphs:total,percentComplete:Math.max(Number(old.percentComplete)||0,pct),readingVersion:2,
    positionUpdatedAtISO:now,updatedAtISO:now,updatedAt:serverTimestamp()},{merge:true});
  return {paragraphIndex:idx,percentComplete:pct};
}
