import { useEffect,useState } from "react";
import { ActivityIndicator,Image,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View } from "react-native";
import { router } from "expo-router";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { BRAND } from "../../shared/brand";
import { FEATURED_PUBLIC_DOMAIN_BOOKS } from "../../shared/discoveryCatalog";
import { getNativeReadingTimeline } from "../services/reading";

const author=b=>b?.authors?.[0]?.name||b?.author||"Unknown author";
const cover=b=>b?.image||b?.cover||b?.formats?.["image/jpeg"]||"";
export default function Discover(){
 const [q,setQ]=useState(""),[results,setResults]=useState([]),[random,setRandom]=useState(null),[timeline,setTimeline]=useState([]),[loading,setLoading]=useState(false);
 useEffect(()=>{getNativeReadingTimeline().then(setTimeline);rand();},[]);
 async function rand(){setLoading(true);try{const page=1+Math.floor(Math.random()*20),d=await (await fetch(`https://gutendex.com/books/?languages=en&page=${page}`)).json(),r=d.results||[];setRandom(r.length?r[Math.floor(Math.random()*r.length)]:null);}finally{setLoading(false);}}
 async function search(){if(!q.trim()){setResults([]);return;}setLoading(true);try{const d=await (await fetch(`https://gutendex.com/books/?languages=en&search=${encodeURIComponent(q.trim())}`)).json();setResults(d.results||[]);}finally{setLoading(false);}}
 function open(b){router.push({pathname:"/reader/[bookId]",params:{bookId:String(b.bookId||b.id),title:b.title||"Book",author:author(b)}});}
 const Row=({b})=><Pressable onPress={()=>open(b)} style={s.row}>{!!cover(b)&&<Image source={{uri:cover(b)}} style={s.cover} resizeMode="contain"/>}<View style={{flex:1,marginLeft:12}}><Text style={s.title}>{b.title}</Text><Text style={s.author}>{author(b)}</Text></View></Pressable>;
 return <SafeAreaView style={s.safe}><AppHeader title="Discover" subtitle="Random, featured, search, and your reading"/>
  <View style={s.searchRow}><TextInput value={q} onChangeText={setQ} onSubmitEditing={search} placeholder="Search title or author" style={s.search}/><Pressable onPress={search} style={s.searchBtn}><Text style={s.searchTxt}>Search</Text></Pressable></View>
  {loading&&<ActivityIndicator style={{padding:8}}/>}
  <ScrollView contentContainerStyle={{padding:14}}>
   {!!results.length&&<View style={s.section}><Text style={s.h}>Search Results</Text>{results.map(b=><Row key={`s${b.id}`} b={b}/>)}</View>}
   {!!random&&<View style={s.section}><View style={s.sectionHead}><Text style={s.h}>Random Read</Text><Pressable onPress={rand}><Text style={s.link}>Another</Text></Pressable></View><Row b={random}/></View>}
   <View style={s.section}><Text style={s.h}>Featured</Text>{FEATURED_PUBLIC_DOMAIN_BOOKS.map(b=><Row key={`f${b.id}`} b={b}/>)}</View>
   {!!timeline.length&&<View style={s.section}><Text style={s.h}>Your Reading</Text>{timeline.slice(0,5).map(b=><Row key={`t${b.id}`} b={b}/>)}</View>}
  </ScrollView><BottomNav active="discover"/></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:BRAND.background},searchRow:{flexDirection:"row",gap:8,padding:12,backgroundColor:BRAND.surface},search:{flex:1,minHeight:46,borderWidth:1,borderColor:BRAND.line,borderRadius:13,paddingHorizontal:12},searchBtn:{minWidth:82,borderRadius:13,backgroundColor:BRAND.teal,alignItems:"center",justifyContent:"center"},searchTxt:{color:"#FFF",fontWeight:"900"},section:{marginBottom:18},sectionHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},h:{fontSize:22,fontWeight:"900",color:BRAND.ink,marginBottom:10},link:{color:BRAND.tealDark,fontWeight:"900"},row:{backgroundColor:BRAND.surface,borderWidth:1,borderColor:BRAND.line,borderRadius:18,padding:12,marginBottom:10,flexDirection:"row",alignItems:"center"},cover:{width:72,height:105},title:{color:BRAND.ink,fontWeight:"900",fontSize:17},author:{color:BRAND.muted,marginTop:5}});
