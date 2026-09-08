import { deleteDoc,doc,updateDoc } from "firebase/firestore";import { db } from "../lib/firebase";
export async function saveNativeGroupSettings(id,u){await updateDoc(doc(db,"groups",String(id)),{name:String(u.name||"").trim(),description:String(u.description||"").trim()});}
export async function deleteNativeGroupPost(id,pid){await deleteDoc(doc(db,"groups",String(id),"forumPosts",String(pid)));}
