import { Image, StyleSheet, Text, View } from "react-native";
import { BRAND } from "../../shared/brand";

export default function AppHeader({ title="Lit Chain", subtitle="" }) {
  return (
    <View style={s.header}>
      <View style={s.copy}>
        <Text style={s.title}>{title}</Text>
        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
      <Image source={{uri:BRAND.logoHorizontal}} resizeMode="contain" style={s.logo}/>
    </View>
  );
}
const s=StyleSheet.create({
  header:{minHeight:86,backgroundColor:BRAND.surface,borderBottomWidth:1,borderBottomColor:BRAND.line,paddingHorizontal:18,paddingVertical:12,flexDirection:"row",alignItems:"center"},
  copy:{flex:1,paddingRight:10},title:{color:BRAND.ink,fontSize:27,fontWeight:"900"},subtitle:{color:BRAND.muted,fontSize:12,marginTop:4},
  logo:{width:132,height:50}
});
