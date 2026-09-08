import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import { ActivityIndicator,FlatList,PanResponder,Pressable,SafeAreaView,StyleSheet,Text,TextInput,View } from "react-native";
import { router,useLocalSearchParams } from "expo-router";
import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";
import { chainDownCount,chainEntryKey,chainUpCount,chainVoteScore,getDirectBookEntries,getMyChainVotes,getPublicBranches,getChainFeedByFilter,voteOnChainEntry } from "../../services/chain";
import { addNativeChainLink } from "../../services/chainLink";
import { BRAND } from "../../../shared/brand";

export default function Screen(){
 const p=useLocalSearchParams(),bookId=String(p.bookId||""),title=String(p.title||"Book"),filter=String(p.filter||"all");
 const [all,setAll]=useState([]),[levels,setLevels]=useState([]),[votes,setVotes]=useState({}),[loading,setLoading]=useState(true),[status,setStatus]=useState(""),[link,setLink]=useState("");
 const selected=useRef(null),depth=levels.length,current=levels[depth-1]||[];
 const back=useCallback(()=>setLevels(cur=>{if(cur.length<=1){router.replace("/home");return cur;}const n=cur.slice(0,-1);selected.current=n[n.length-1]?.[0]||null;return n;}),[]);
 const deeper=useCallback(e=>{const b=getPublicBranches(all,e);if(!b.length){setStatus("End of this branch.");return;}selected.current=b[0];setLevels(cur=>[...cur,b]);},[all]);
 const pan=useMemo(()=>PanResponder.create({onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>18&&Math.abs(g.dx)>Math.abs(g.dy)*1.2,onPanResponderRelease:(_,g)=>{if(g.dx>60)back();else if(g.dx<-60&&selected.current)deeper(selected.current);}}),[back,deeper]);
 useEffect(()=>{let a=true;(async()=>{try{const f=await getChainFeedByFilter(filter);if(!a)return;const l=getDirectBookEntries(f,bookId);setAll(f);setLevels([l]);selected.current=l[0]||null;setVotes(await getMyChainVotes(f));}finally{if(a)setLoading(false);}})();return()=>{a=false};},[bookId,filter]);
 async function vote(e,d){const k=chainEntryKey(e),r=await voteOnChainEntry(e,d);setVotes(v=>({...v,[k]:r.direction}));const patch=x=>chainEntryKey(x)===k?{...x,chainUpCount:r.chainUpCount,chainDownCount:r.chainDownCount,chainScore:r.chainScore}:x;setAll(v=>v.map(patch));setLevels(v=>v.map(l=>l.map(patch)));}
 async function add(e){try{const c=await addNativeChainLink(e,link);setAll(v=>[...v,c]);setLink("");setStatus("Link added.");}catch(err){setStatus(err.message||"Could not add link.");}}
 if(loading)return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large"/></View></SafeAreaView>;
 return <SafeAreaView style={s.safe} {...pan.panHandlers}><AppHeader title={title} subtitle={`Level ${Math.max(depth,1)}`}/><View style={s.nav}><Pressable onPress={back}><Text style={s.back}>‹ {depth<=1?"Books":`Level ${depth-1}`}</Text></Pressable></View>{!!status&&<Text style={s.status}>{status}</Text>}
 <FlatList data={current} key={`d${depth}`} keyExtractor={chainEntryKey} pagingEnabled showsVerticalScrollIndicator={false}
 onViewableItemsChanged={useRef(({viewableItems})=>{selected.current=viewableItems[0]?.item||null;}).current}
 viewabilityConfig={useRef({itemVisiblePercentThreshold:55}).current}
 renderItem={({item})=>{const k=chainEntryKey(item),my=votes[k]||0;return <View style={s.page}><View style={s.card}>{!!item.paragraphPreview&&<Text style={s.quote}>“{item.paragraphPreview}”</Text>}<Text style={s.note}>{item.note||"Linked note"}</Text>
 <View style={s.actions}><Pressable onPress={()=>vote(item,1)} style={[s.vote,my===1&&s.active]}><Text style={s.voteTxt}>🔗 Link {chainUpCount(item)}</Text></Pressable><Pressable onPress={()=>vote(item,-1)} style={[s.vote,my===-1&&s.active]}><Text style={s.voteTxt}>⛓ Unlink {chainDownCount(item)}</Text></Pressable></View>
 <Text style={s.score}>Score {chainVoteScore(item)}</Text><TextInput value={link} onChangeText={setLink} placeholder="Add your link to this Chain..." multiline style={s.input}/><Pressable onPress={()=>add(item)} style={s.add}><Text style={s.addTxt}>Add link</Text></Pressable></View></View>}}/>
 <BottomNav active="chain"/></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:BRAND.background},center:{flex:1,alignItems:"center",justifyContent:"center"},nav:{minHeight:44,paddingHorizontal:16,backgroundColor:BRAND.surface,justifyContent:"center",borderBottomWidth:1,borderBottomColor:BRAND.line},back:{color:BRAND.tealDark,fontWeight:"900"},status:{textAlign:"center",padding:8,color:"#6D5A16",backgroundColor:"#FFF8DF"},page:{minHeight:560,padding:18,justifyContent:"center"},card:{backgroundColor:BRAND.surface,borderWidth:1,borderColor:BRAND.line,borderRadius:24,padding:22},quote:{color:BRAND.muted,fontStyle:"italic"},note:{color:BRAND.ink,fontSize:21,lineHeight:30,fontWeight:"700",marginTop:16},actions:{flexDirection:"row",gap:10,marginTop:20},vote:{flex:1,borderWidth:1,borderColor:BRAND.line,borderRadius:14,minHeight:46,alignItems:"center",justifyContent:"center"},active:{backgroundColor:"#E8F7F6"},voteTxt:{color:BRAND.ink,fontWeight:"900"},score:{textAlign:"center",color:BRAND.muted,marginTop:10},input:{marginTop:18,minHeight:90,borderWidth:1,borderColor:BRAND.line,borderRadius:14,padding:12,textAlignVertical:"top"},add:{minHeight:48,marginTop:10,borderRadius:14,backgroundColor:BRAND.yellow,alignItems:"center",justifyContent:"center"},addTxt:{color:BRAND.ink,fontWeight:"900"}});
