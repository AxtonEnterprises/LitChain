import { useEffect, useState } from "react";
import { Alert, FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import BottomNav from "../../components/BottomNav";
import { getNativeProfile, saveNativeProfile } from "../../services/profile";
import { requestNativeAccountDeletion } from "../../services/accountDeletion";
import { auth } from "../../lib/firebase";
import { PROFILE_AVATARS, profileAvatarUrl } from "../../../shared/profileAvatars";
import { BRAND } from "../../../shared/brand";

export default function EditProfileScreen() {
  const [displayName,setDisplayName]=useState("");
  const [about,setAbout]=useState("");
  const [avatar,setAvatar]=useState("");
  const [status,setStatus]=useState("");
  const [deleting,setDeleting]=useState(false);

  useEffect(()=>{getNativeProfile().then(profile=>{
    setDisplayName(profile?.displayName||"");
    setAbout(profile?.about||"");
    setAvatar(profile?.avatar||"");
  });},[]);

  async function save(){
    try{
      setStatus("");
      await saveNativeProfile({displayName,about,avatar,photoURL:profileAvatarUrl(avatar)});
      router.replace("/library");
    }catch(error){setStatus(error?.message||"Profile could not be saved.");}
  }

  function confirmDeletion(){
    Alert.alert("Request account deletion?","This requests deletion of your Lit Chain account and associated personal data. Public community content may be retained only where necessary for conversation continuity and will be anonymized during processing. You will be signed out after the request is submitted.",[
      {text:"Cancel",style:"cancel"},{text:"Request deletion",style:"destructive",onPress:submitDeletionRequest}
    ]);
  }

  async function submitDeletionRequest(){
    try{
      setDeleting(true); setStatus("");
      await requestNativeAccountDeletion();
      await signOut(auth);
      Alert.alert("Deletion requested","Your account deletion request has been submitted.",[{text:"OK",onPress:()=>router.replace("/login")}]);
    }catch(error){setStatus(error?.message||"Account deletion could not be requested.");}
    finally{setDeleting(false);}
  }

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      <Pressable onPress={()=>router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
      <Text style={styles.title}>Edit profile</Text>
    </View>
    <View style={styles.form}>
      <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Display name" style={styles.input}/>
      <TextInput value={about} onChangeText={setAbout} placeholder="About" multiline style={[styles.input,styles.multiline]}/>
      <Text style={styles.label}>Avatar</Text>
      <FlatList data={PROFILE_AVATARS} keyExtractor={item=>item.id} numColumns={4} scrollEnabled={false}
        columnWrapperStyle={styles.avatarRow} contentContainerStyle={styles.avatarGrid}
        renderItem={({item})=><Pressable onPress={()=>setAvatar(item.id)} style={[styles.avatarWrap,avatar===item.id&&styles.avatarSelected]}>
          <Image source={{uri:item.image}} style={styles.avatar}/>
        </Pressable>}
      />
      {!!status&&<Text style={styles.status}>{status}</Text>}
      <Pressable onPress={save} style={styles.save}><Text style={styles.saveText}>Save profile</Text></Pressable>
      <View style={styles.accountSection}>
        <Text style={styles.accountTitle}>Account</Text>
        <Text style={styles.accountText}>You can request permanent deletion of your Lit Chain account and associated personal data.</Text>
        <Pressable onPress={confirmDeletion} disabled={deleting} style={[styles.deleteButton,deleting&&styles.disabled]}>
          <Text style={styles.deleteText}>{deleting?"Submitting…":"Delete Account"}</Text>
        </Pressable>
      </View>
    </View>
    <BottomNav active="library"/>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:BRAND.background},
  header:{backgroundColor:BRAND.surface,padding:18,borderBottomWidth:1,borderBottomColor:BRAND.line},
  back:{color:BRAND.tealDark,fontWeight:"900"},
  title:{color:BRAND.ink,fontSize:25,fontWeight:"900",marginTop:10},
  form:{flex:1,padding:18},
  input:{minHeight:46,backgroundColor:BRAND.surface,borderWidth:1,borderColor:BRAND.line,borderRadius:12,paddingHorizontal:12,marginBottom:12},
  multiline:{minHeight:100,textAlignVertical:"top",paddingTop:12},
  label:{color:BRAND.ink,fontWeight:"900",marginBottom:8},
  avatarGrid:{paddingBottom:2},
  avatarRow:{justifyContent:"space-between",marginBottom:10},
  avatarWrap:{width:"22%",aspectRatio:1,borderRadius:16,padding:3},
  avatarSelected:{borderWidth:2,borderColor:BRAND.teal},
  avatar:{width:"100%",height:"100%",borderRadius:12},
  status:{color:BRAND.danger,marginTop:10},
  save:{minHeight:48,marginTop:16,borderRadius:14,backgroundColor:BRAND.teal,alignItems:"center",justifyContent:"center"},
  saveText:{color:"#FFFFFF",fontWeight:"900"},
  accountSection:{marginTop:28,paddingTop:20,borderTopWidth:1,borderTopColor:BRAND.line},
  accountTitle:{color:BRAND.ink,fontSize:18,fontWeight:"900"},
  accountText:{color:BRAND.muted,lineHeight:20,marginTop:6},
  deleteButton:{minHeight:48,marginTop:14,borderRadius:14,borderWidth:1,borderColor:BRAND.danger,alignItems:"center",justifyContent:"center"},
  deleteText:{color:BRAND.danger,fontWeight:"900"},disabled:{opacity:.55}
});
