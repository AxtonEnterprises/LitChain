import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
export async function addNativeChainLink(source,note){
  const u=auth.currentUser;if(!u)throw new Error("You must be logged in.");
  const clean=String(note||"").trim();if(!clean)throw new Error("Enter a note for your link.");
  if(!source?.id||!source?.userId)throw new Error("Missing source Chain entry.");
  const ref=doc(collection(db,"users",u.uid,"journal")), now=new Date().toISOString();
  const p={id:ref.id,userId:u.uid,bookId:String(source.bookId||""),title:source.title||"Untitled",author:source.author||"",
    note:clean,paragraphNumber:source.paragraphNumber??null,paragraphPreview:source.paragraphPreview||"",visibility:"public",groupId:null,
    sourceChainEntryId:String(source.id),sourceUserId:String(source.userId),createdAt:now,updatedAtISO:null,
    chainUpCount:0,chainDownCount:0,chainScore:0,createdAtServer:serverTimestamp()};
  await setDoc(ref,p);return p;
}
