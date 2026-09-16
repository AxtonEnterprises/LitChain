import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from "firebase/auth";
import BrandMark from "../components/BrandMark";
import { auth } from "../lib/firebase";

export default function LoginScreen() {
  const [mode,setMode]=useState("login"), [email,setEmail]=useState(""), [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false), [showPassword,setShowPassword]=useState(false);
  useEffect(()=>{ GoogleSignin.configure({webClientId:process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID||"424669347546-j4lef85nkgcvd3t835nkm1pen9kic1sv.apps.googleusercontent.com"}); },[]);
  async function finishAuth(fn){ try{setBusy(true); const ok=await fn(); if(ok!==false) router.replace('/home');}catch(e){if(!['ERR_REQUEST_CANCELED','SIGN_IN_CANCELLED'].includes(e?.code)) Alert.alert('Authentication error',e?.message||'Please try again.');}finally{setBusy(false);} }
  async function submit(){ if(!email.trim()||!password){Alert.alert('Missing information','Enter your email and password.');return;} await finishAuth(async()=>{ if(mode==='signup') await createUserWithEmailAndPassword(auth,email.trim(),password); else await signInWithEmailAndPassword(auth,email.trim(),password); }); }
  async function signInGoogle(){ await finishAuth(async()=>{ await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true}); try{await GoogleSignin.signOut();}catch{} const response=await GoogleSignin.signIn(); if(!isSuccessResponse(response)) return false; const idToken=response.data?.idToken||response.idToken; if(!idToken) throw new Error('Google did not return an ID token.'); await signInWithCredential(auth,GoogleAuthProvider.credential(idToken)); return true; }); }
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled"><BrandMark/><View style={styles.card}>
    <Text style={styles.heading}>{mode==='signup'?'Create your account':'Welcome back'}</Text>
    <Pressable style={styles.googleButton} onPress={signInGoogle} disabled={busy}><Text style={styles.googleText}>Continue with Google</Text></Pressable>
    <View style={styles.dividerRow}><View style={styles.divider}/><Text style={styles.dividerText}>or</Text><View style={styles.divider}/></View>
    <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address"/>
    <View style={styles.passwordRow}><TextInput style={styles.passwordInput} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry={!showPassword}/><Pressable onPress={()=>setShowPassword(v=>!v)} style={styles.showButton}><Text style={styles.showText}>{showPassword?'Hide':'Show'}</Text></Pressable></View>
    <Pressable style={styles.primaryButton} onPress={submit} disabled={busy}><Text style={styles.primaryButtonText}>{busy?'Please wait…':mode==='signup'?'Create account':'Sign in'}</Text></Pressable>
    <Pressable style={styles.switchButton} onPress={()=>setMode(mode==='login'?'signup':'login')}><Text style={styles.switchText}>{mode==='signup'?'Already have an account? Sign in':'New to Lit Chain? Create an account'}</Text></Pressable>
  </View></ScrollView></KeyboardAvoidingView>;
}
const styles=StyleSheet.create({flex:{flex:1,backgroundColor:'#FBF7EF'},container:{flexGrow:1,justifyContent:'center',padding:24,gap:32},card:{width:'100%',maxWidth:480,alignSelf:'center',backgroundColor:'#FFFDF8',borderRadius:22,padding:22,borderWidth:1,borderColor:'#D9DDD9'},heading:{fontSize:24,fontWeight:'800',color:'#0B2D45',marginBottom:20},googleButton:{minHeight:52,borderRadius:14,borderWidth:1,borderColor:'#D9DDD9',alignItems:'center',justifyContent:'center',backgroundColor:'#FFF'},googleText:{color:'#0B2D45',fontSize:16,fontWeight:'800'},dividerRow:{flexDirection:'row',alignItems:'center',gap:12,marginVertical:18},divider:{flex:1,height:1,backgroundColor:'#D9DDD9'},dividerText:{color:'#61717C'},input:{height:52,borderWidth:1,borderColor:'#D9DDD9',borderRadius:14,paddingHorizontal:16,marginBottom:12,backgroundColor:'#FFF',fontSize:16},passwordRow:{height:52,borderWidth:1,borderColor:'#D9DDD9',borderRadius:14,backgroundColor:'#FFF',flexDirection:'row',alignItems:'center',marginBottom:12},passwordInput:{flex:1,height:50,paddingHorizontal:16,fontSize:16},showButton:{paddingHorizontal:14,height:50,justifyContent:'center'},showText:{color:'#2F8E9C',fontWeight:'800'},primaryButton:{minHeight:52,borderRadius:14,backgroundColor:'#0B2D45',alignItems:'center',justifyContent:'center',marginTop:4},primaryButtonText:{color:'#FFF',fontSize:16,fontWeight:'800'},switchButton:{paddingVertical:16,alignItems:'center'},switchText:{color:'#2F8E9C',fontWeight:'700'}});
