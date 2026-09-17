import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getNativeGroups } from "./social";
import { getNativeFriendBundle } from "./librarySocial";

async function readCollection(path) {
  try {
    const snapshot = await getDocs(collection(db, ...path));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch (error) {
    console.warn(`Could not read ${path.join("/")}:`, error?.code || error);
    return [];
  }
}

export function nativeReadingCoverUrl(book) {
  return book?.image || book?.cover || book?.formats?.["image/jpeg"] || "";
}

export async function hydrateNativeReadingCovers(items) {
  const books = Array.isArray(items) ? items : [];
  const missingIds = [...new Set(books.filter(b => !nativeReadingCoverUrl(b))
    .map(b => String(b.bookId || b.id || "").trim()).filter(Boolean))];
  if (!missingIds.length) return books;
  try {
    const response = await fetch(`https://gutendex.com/books/?ids=${encodeURIComponent(missingIds.join(","))}`);
    if (!response.ok) return books;
    const data = await response.json();
    const byId = new Map((Array.isArray(data.results) ? data.results : []).map(b => [String(b.id), b]));
    return books.map(book => {
      if (nativeReadingCoverUrl(book)) return book;
      const metadata = byId.get(String(book.bookId || book.id || ""));
      const image = nativeReadingCoverUrl(metadata);
      return image ? { ...book, image } : book;
    });
  } catch { return books; }
}

function progressPercent(item) {
  const value = Number(item?.percentComplete ?? item?.activePercent ?? 0);
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function isCompleted(item) {
  return item?.cycleComplete === true || Number(item?.completedReads || 0) > 0 || progressPercent(item) >= 100;
}

function publicTimelineItem(item) {
  return {
    id: String(item?.id || item?.bookId || ""),
    bookId: String(item?.bookId || item?.id || ""),
    title: String(item?.title || "Book"),
    author: String(item?.author || ""),
    image: nativeReadingCoverUrl(item),
    percentComplete: progressPercent(item),
    activePercent: progressPercent(item),
    cycleComplete: item?.cycleComplete === true,
    completedReads: Number(item?.completedReads || 0),
    visibility: "public",
    lastReadAtISO: String(item?.positionUpdatedAtISO || item?.updatedAtISO || item?.lastReadAtISO || "")
  };
}

export async function getNativeReadingTimelineVisibility() {
  const user = auth.currentUser;
  if (!user) return "private";
  try {
    const snapshot = await getDoc(doc(db, "users", user.uid));
    return snapshot.exists() && snapshot.data()?.readingTimelineVisibility === "public" ? "public" : "private";
  } catch {
    return "private";
  }
}

export async function setNativeReadingTimelineVisibility(visibility) {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");
  const normalized = visibility === "public" ? "public" : "private";
  const now = new Date().toISOString();
  await Promise.all([
    setDoc(doc(db, "users", user.uid), { readingTimelineVisibility: normalized, updatedAt: serverTimestamp() }, { merge: true }),
    setDoc(doc(db, "publicProfiles", user.uid), { userId: user.uid, readingTimelineVisibility: normalized, updatedAtISO: now, updatedAt: serverTimestamp() }, { merge: true })
  ]);
  return normalized;
}

/*
 * Publish only the profile-safe reading summary needed by public reader profiles.
 * The private users/{uid}/readingProgress collection remains owner-only.
 * Individual books are included only when both the overall timeline and that
 * book's readingProgress.visibility are public.
 */
export async function syncNativePublicProfileReadingData(bundle, timelineVisibility = "private") {
  const user = auth.currentUser;
  if (!user || !bundle) return;
  const timeline = Array.isArray(bundle.timeline) ? bundle.timeline : [];
  const journal = Array.isArray(bundle.journal) ? bundle.journal : [];
  const isPublic = timelineVisibility === "public";
  const publicTimeline = isPublic
    ? timeline.filter((item) => item?.visibility === "public").map(publicTimelineItem)
    : [];
  const readingStats = {
    books: timeline.length,
    completed: timeline.filter(isCompleted).length,
    journal: journal.length
  };
  await setDoc(doc(db, "publicProfiles", user.uid), {
    userId: user.uid,
    readingTimelineVisibility: isPublic ? "public" : "private",
    readingStats,
    publicReadingTimeline: publicTimeline,
    publicReadingUpdatedAtISO: new Date().toISOString(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function getNativeLibraryBundle() {
  const user = auth.currentUser;
  if (!user) return { profile:null,timeline:[],journal:[],savedBooks:[],savedChain:[],friends:[],friendBundle:{friends:[],incoming:[],outgoing:[]},groups:[] };
  let profile=null;
  try { const snapshot=await getDoc(doc(db,"users",user.uid)); if(snapshot.exists()) profile={id:snapshot.id,...snapshot.data()}; } catch {}
  const [timeline,journal,savedBooks,savedChain,friendBundle,groupBundle]=await Promise.all([
    readCollection(["users",user.uid,"readingProgress"]),
    readCollection(["users",user.uid,"journal"]),
    readCollection(["users",user.uid,"savedBooks"]),
    readCollection(["users",user.uid,"savedChainEntries"]),
    getNativeFriendBundle(), getNativeGroups()
  ]);
  timeline.sort((a,b)=>String(b.positionUpdatedAtISO||b.updatedAtISO||b.lastReadAtISO||"").localeCompare(String(a.positionUpdatedAtISO||a.updatedAtISO||a.lastReadAtISO||"")));
  journal.sort((a,b)=>String(b.updatedAtISO||b.createdAt||"").localeCompare(String(a.updatedAtISO||a.createdAt||"")));
  return {profile,timeline,journal,savedBooks,savedChain,
    friends:friendBundle.friends.map(item=>({id:item.otherUserId,otherUserId:item.otherUserId,relationshipId:item.id,acceptedAtISO:item.acceptedAtISO||"",...(item.profile||{})})),
    friendBundle,groups:[...groupBundle.mine,...groupBundle.classes]};
}
