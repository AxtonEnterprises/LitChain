import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import ReadingTimelineCard from "../components/ReadingTimelineCard";
import { BRAND } from "../../shared/brand";
import { FEATURED_PUBLIC_DOMAIN_BOOKS } from "../../shared/discoveryCatalog";
import { getNativeReadingTimeline } from "../services/reading";
import { hydrateNativeReadingCovers } from "../services/library";

function authorName(book){return book?.authors?.[0]?.name||book?.author||"Unknown author"}
function coverUrl(book){return book?.image||book?.cover||book?.formats?.["image/jpeg"]||""}

export default function DiscoverScreen(){
 const[queryText,setQueryText]=useState(""),[searchResults,setSearchResults]=useState([]),[randomBook,setRandomBook]=useState(null),[timeline,setTimeline]=useState([]),[loading,setLoading]=useState(false);
 useFocusEffect(useCallback(()=>{let active=true;
   async function refresh(){
     for(let attempt=0;attempt<4&&active;attempt++){
       const reading=await getNativeReadingTimeline();
       if(reading.length||attempt===3){
         if(active)setTimeline(reading); // show immediately
         if(reading.length){
           hydrateNativeReadingCovers(reading).then(h=>{if(active)setTimeline(h)});
         }
         return;
       }
       await new Promise(r=>setTimeout(r,250));
     }
   }
   refresh(); return()=>{active=false};
 },[]));
 useEffect(()=>{loadRandom()},[]);
 async function loadRandom(){try{setLoading(true);const page=1+Math.floor(Math.random()*20);const response=await fetch(`https://gutendex.com/books/?languages=en&page=${page}`);const data=await response.json();const results=Array.isArray(data.results)?data.results:[];if(results.length)setRandomBook(results[Math.floor(Math.random()*results.length)])}finally{setLoading(false)}}
 async function search(){const term=queryText.trim();if(!term){setSearchResults([]);return}try{setLoading(true);const response=await fetch(`https://gutendex.com/books/?languages=en&search=${encodeURIComponent(term)}`);const data=await response.json();setSearchResults(Array.isArray(data.results)?data.results:[])}finally{setLoading(false)}}
 function openBook(book){router.push({pathname:"/reader/[bookId]",params:{bookId:String(book.bookId||book.id),title:book.title||"Book",author:authorName(book),image:coverUrl(book)}})}
 function BookRow({book}){const image=coverUrl(book);return <Pressable onPress={()=>openBook(book)} style={s.bookRow}>{!!image&&<Image source={{uri:image}} style={s.cover} resizeMode="contain"/>}<View style={s.bookInfo}><Text style={s.bookTitle}>{book.title}</Text><Text style={s.bookAuthor}>{authorName(book)}</Text></View></Pressable>}
 return <SafeAreaView style={s.safe}><AppHeader title="Discover" subtitle="Random, featured, search, and your reading"/>
 <View style={s.searchRow}><TextInput value={queryText} onChangeText={setQueryText} onSubmitEditing={search} placeholder="Search title or author" placeholderTextColor="#8B999B" style={s.search}/><Pressable onPress={search} style={s.searchButton}><Text style={s.searchButtonText}>Search</Text></Pressable></View>
 {loading&&<View style={s.loader}><ActivityIndicator/></View>}
 <ScrollView contentContainerStyle={s.content}>
 {!!searchResults.length&&<View style={s.section}><Text style={s.sectionTitle}>Search Results</Text>{searchResults.map(book=><BookRow key={`search-${book.id}`} book={book}/>)}</View>}
 {!!randomBook&&<View style={s.section}><View style={s.sectionHeader}><Text style={s.sectionTitle}>Random Read</Text><Pressable onPress={loadRandom} style={s.randomButton}><Text style={s.randomButtonText}>🎲 Random</Text></Pressable></View><BookRow book={randomBook}/></View>}
 <View style={s.section}><Text style={s.sectionTitle}>Featured</Text>{FEATURED_PUBLIC_DOMAIN_BOOKS.map(book=><BookRow key={`featured-${book.id}`} book={book}/>)}</View>
 {!!timeline.length&&<View style={s.readingSection}><Text style={s.readingEyebrow}>YOUR READING</Text><Text style={s.readingTitle}>Continue Reading</Text>{timeline.slice(0,5).map(book=><ReadingTimelineCard key={`reading-${book.id}`} item={book} onPress={()=>openBook(book)}/>)}</View>}
 </ScrollView><BottomNav active="discover"/></SafeAreaView>
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:BRAND.background},searchRow:{flexDirection:"row",gap:8,padding:12,backgroundColor:BRAND.surface},search:{flex:1,minHeight:46,borderWidth:1,borderColor:BRAND.line,borderRadius:13,paddingHorizontal:12},
 searchButton:{minWidth:82,borderRadius:13,backgroundColor:BRAND.teal,alignItems:"center",justifyContent:"center"},searchButtonText:{color:"#fff",fontWeight:"900"},loader:{padding:8},content:{padding:14},section:{marginBottom:20},
 sectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},sectionTitle:{color:BRAND.ink,fontSize:22,fontWeight:"900",marginBottom:10},randomButton:{minHeight:38,paddingHorizontal:14,borderRadius:999,backgroundColor:BRAND.yellow,alignItems:"center",justifyContent:"center",marginBottom:8},
 randomButtonText:{color:BRAND.ink,fontWeight:"900"},bookRow:{backgroundColor:BRAND.surface,borderWidth:1,borderColor:BRAND.line,borderRadius:18,padding:12,marginBottom:10,flexDirection:"row",alignItems:"center"},cover:{width:72,height:105},
 bookInfo:{flex:1,marginLeft:14},bookTitle:{color:BRAND.ink,fontWeight:"900",fontSize:17},bookAuthor:{color:BRAND.muted,marginTop:5},
 readingSection:{backgroundColor:BRAND.surface,borderWidth:1,borderColor:BRAND.line,borderRadius:20,padding:16,marginBottom:20},readingEyebrow:{color:BRAND.tealDark,fontSize:12,fontWeight:"900",letterSpacing:1.4},
 readingTitle:{color:BRAND.ink,fontSize:26,fontWeight:"900",marginTop:7,marginBottom:8}
});
