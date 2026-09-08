import { useEffect,useMemo,useRef,useState } from "react";
import { ActivityIndicator,Dimensions,FlatList,Pressable,SafeAreaView,StyleSheet,Text,View } from "react-native";
import { router,useLocalSearchParams } from "expo-router";
import { BRAND } from "../../../shared/brand";
import { getNativeReadingProgress,saveNativeReadingProgress } from "../../services/reading";

const TARGET=1500;
const extract=v=>typeof v==="string"?v:(v?.text||v?.content||v?.bookText||v?.body||"");
function paginate(ps){const pages=[];let cur=[],n=0;ps.forEach((t,i)=>{if(cur.length&&n+t.length>TARGET){pages.push(cur);cur=[];n=0;}cur.push({text:t,index:i});n+=t.length;});if(cur.length)pages.push(cur);return pages;}

export default function Reader(){
 const p=useLocalSearchParams(),bookId=String(p.bookId||""),title=String(p.title||"Book"),author=String(p.author||"");
 const [text,setText]=useState(""),[loading,setLoading]=useState(true),[page,setPage]=useState(0),[font,setFont]=useState(18),[dark,setDark]=useState(false),[resume,setResume]=useState(0);
 const ref=useRef(null), width=Dimensions.get("window").width;
 const paragraphs=useMemo(()=>String(text).split(/\n\s*\n+/).map(x=>x.trim()).filter(Boolean),[text]);
 const pages=useMemo(()=>paginate(paragraphs),[paragraphs]);
 useEffect(()=>{let active=true;(async()=>{try{
   const prog=await getNativeReadingProgress(bookId);if(active)setResume(Number(prog?.paragraphIndex)||0);
   let loaded="";for(const url of [`https://litchain.org/api/book-text?id=${encodeURIComponent(bookId)}`,`https://litchain.org/api/book?id=${encodeURIComponent(bookId)}`]){
    const r=await fetch(url);if(!r.ok)continue;const ct=r.headers.get("content-type")||"";loaded=extract(ct.includes("application/json")?await r.json():await r.text());if(loaded)break;}
   if(active)setText(loaded);
 }finally{if(active)setLoading(false);}})();return()=>{active=false};},[bookId]);
 useEffect(()=>{if(!pages.length)return;let idx=pages.findIndex(pg=>pg.some(x=>x.index>=resume));if(idx<0)idx=0;setPage(idx);requestAnimationFrame(()=>ref.current?.scrollToIndex({index:idx,animated:false}));},[pages.length,resume]);
 async function persist(i){const idx=pages[i]?.[0]?.index??0;await saveNativeReadingProgress({bookId,title,author,paragraphIndex:idx,totalParagraphs:paragraphs.length});}
 function go(i){const n=Math.max(0,Math.min(i,pages.length-1));setPage(n);persist(n);ref.current?.scrollToIndex({index:n,animated:true});}
 const pal=dark?{bg:"#111516",surface:"#171D1E",text:"#EEF3F3",muted:"#9BA9AA",line:"#263234"}:{bg:"#FFFDF8",surface:"#FFF",text:"#242A2B",muted:"#79888A",line:BRAND.line};
 if(loading)return <SafeAreaView style={[s.safe,{backgroundColor:pal.bg}]}><View style={s.center}><ActivityIndicator size="large"/></View></SafeAreaView>;
 return <SafeAreaView style={[s.safe,{backgroundColor:pal.bg}]}>
  <View style={[s.header,{backgroundColor:pal.surface,borderBottomColor:pal.line}]}>
   <Pressable onPress={()=>router.back()}><Text style={s.back}>‹ Back</Text></Pressable>
   <View style={{flex:1,marginLeft:14}}><Text numberOfLines={1} style={[s.title,{color:pal.text}]}>{title}</Text><Text numberOfLines={1} style={{color:pal.muted,fontSize:11}}>{author}</Text></View>
  </View>
  <FlatList ref={ref} horizontal pagingEnabled data={pages} keyExtractor={(_,i)=>String(i)} showsHorizontalScrollIndicator={false}
    getItemLayout={(_,i)=>({length:width,offset:width*i,index:i})}
    onMomentumScrollEnd={e=>{const n=Math.round(e.nativeEvent.contentOffset.x/Math.max(width,1));setPage(n);persist(n);}}
    renderItem={({item})=><View style={[s.page,{width}]}>{item.map(x=><View key={x.index} style={s.row}><Text style={[s.num,{color:pal.muted}]}>{x.index+1}</Text><Text style={{flex:1,color:pal.text,fontSize:font,lineHeight:font*1.55}}>{x.text}</Text></View>)}</View>}/>
  <View style={[s.controls,{backgroundColor:pal.surface,borderTopColor:pal.line}]}>
   <Pressable onPress={()=>go(page-1)}><Text style={s.control}>‹</Text></Pressable>
   <Pressable onPress={()=>setFont(v=>Math.max(14,v-1))}><Text style={s.control}>A−</Text></Pressable>
   <Text style={{color:pal.muted,fontWeight:"700"}}>{page+1}/{Math.max(pages.length,1)}</Text>
   <Pressable onPress={()=>setFont(v=>Math.min(28,v+1))}><Text style={s.control}>A+</Text></Pressable>
   <Pressable onPress={()=>setDark(v=>!v)}><Text style={s.control}>{dark?"☀":"☾"}</Text></Pressable>
   <Pressable onPress={()=>go(page+1)}><Text style={s.control}>›</Text></Pressable>
  </View>
 </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1},center:{flex:1,alignItems:"center",justifyContent:"center"},header:{minHeight:76,paddingHorizontal:16,borderBottomWidth:1,flexDirection:"row",alignItems:"center"},back:{color:BRAND.tealDark,fontWeight:"900"},title:{fontWeight:"900",fontSize:17},page:{flex:1,paddingHorizontal:22,paddingVertical:24},row:{flexDirection:"row",alignItems:"flex-start",marginBottom:18},num:{width:34,fontSize:10,paddingTop:4},controls:{minHeight:64,borderTopWidth:1,flexDirection:"row",alignItems:"center",justifyContent:"space-around"},control:{color:BRAND.tealDark,fontSize:18,fontWeight:"900"}});
