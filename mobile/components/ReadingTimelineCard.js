import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BRAND } from "../../shared/brand";
import { nativeReadingCoverUrl } from "../services/library";

function percent(item) {
  const n=Number(item?.percentComplete ?? item?.activePercent ?? 0);
  return Math.max(0,Math.min(100,Number.isFinite(n)?n:0));
}
function lastRead(item) {
  const value=item?.positionUpdatedAtISO||item?.updatedAtISO||item?.lastReadAtISO||item?.verifiedUpdatedAtISO||"";
  if(!value)return "";
  const d=new Date(value); if(Number.isNaN(d.getTime()))return "";
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
export default function ReadingTimelineCard({item,onPress,showPrivacy=false}) {
  const image=nativeReadingCoverUrl(item), pct=percent(item), date=lastRead(item);
  return <Pressable onPress={onPress} style={s.card}>
    {image?<Image source={{uri:image}} style={s.cover} resizeMode="cover"/>:<View style={s.fallback}><Text style={s.fallbackText}>▯</Text></View>}
    <View style={s.body}>
      <View style={s.top}><Text style={s.eyebrow}>READING</Text>{showPrivacy?<Text style={s.privacy}>{item?.isPublic===true||item?.public===true?"Public":"Private"}</Text>:null}</View>
      <Text style={s.title}>{item?.title||"Untitled"}</Text>
      {!!item?.author&&<Text style={s.author}>{item.author}</Text>}
      <View style={s.progress}><View style={s.track}><View style={[s.fill,{width:`${pct}%`}]}/></View><Text style={s.pct}>{Number.isInteger(pct)?pct:pct.toFixed(1)}%</Text></View>
      {!!date&&<Text style={s.date}>Last read · {date}</Text>}
    </View>
  </Pressable>;
}
const s=StyleSheet.create({
 card:{flexDirection:"row",paddingVertical:16,borderBottomWidth:1,borderBottomColor:BRAND.line},
 cover:{width:82,height:122,borderRadius:10,backgroundColor:"#EEF1EE"},
 fallback:{width:82,height:122,borderRadius:10,alignItems:"center",justifyContent:"center",backgroundColor:BRAND.teal},
 fallbackText:{color:"#fff",fontSize:38,fontWeight:"700"},body:{flex:1,marginLeft:16,justifyContent:"center"},
 top:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},eyebrow:{color:BRAND.tealDark,fontSize:11,fontWeight:"900",letterSpacing:1.2},
 privacy:{color:BRAND.ink,fontWeight:"800",fontSize:12,backgroundColor:"#EDF3F2",paddingHorizontal:9,paddingVertical:5,borderRadius:999},
 title:{color:BRAND.ink,fontSize:19,lineHeight:23,fontWeight:"900",marginTop:6},author:{color:BRAND.muted,fontSize:16,marginTop:4},
 progress:{flexDirection:"row",alignItems:"center",marginTop:13},track:{flex:1,height:8,overflow:"hidden",borderRadius:999,backgroundColor:"#E3EBE8"},
 fill:{height:"100%",minWidth:2,borderRadius:999,backgroundColor:BRAND.teal},pct:{minWidth:46,marginLeft:10,color:BRAND.ink,fontWeight:"900",textAlign:"right"},
 date:{color:BRAND.muted,marginTop:9,fontSize:14}
});
