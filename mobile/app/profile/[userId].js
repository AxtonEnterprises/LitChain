import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import BottomNav from "../../components/BottomNav";
import ReadingTimelineCard from "../../components/ReadingTimelineCard";
import { getNativePublicProfile } from "../../services/profile";
import { hydrateNativeReadingCovers, nativeReadingCoverUrl } from "../../services/library";
import { getNativeFriendRelationship, sendNativeFriendRequest } from "../../services/librarySocial";
import { profileAvatarUrl } from "../../../shared/profileAvatars";
import { BRAND } from "../../../shared/brand";

function formatFriendDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PublicProfile() {
  const { userId } = useLocalSearchParams();
  const [profile, setProfile] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendBusy, setFriendBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function load() {
    try {
      setLoading(true);
      const [nextProfile, nextRelationship] = await Promise.all([
        getNativePublicProfile(userId),
        getNativeFriendRelationship(userId).catch(() => ({ status: "none" }))
      ]);
      setProfile(nextProfile);
      setRelationship(nextRelationship);
      const initialTimeline = nextProfile?.readingTimelineVisibility === "public" && Array.isArray(nextProfile?.publicReadingTimeline)
        ? nextProfile.publicReadingTimeline
        : [];
      setTimeline(initialTimeline);
      if (initialTimeline.length) {
        hydrateNativeReadingCovers(initialTimeline).then(setTimeline).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [userId]);

  const displayName = profile?.displayName || profile?.username || "Reader";
  const image = profileAvatarUrl(profile?.avatar) || profile?.photoURL || "";
  const stats = profile?.readingStats || {};
  const friendsSince = formatFriendDate(relationship?.acceptedAtISO || relationship?.updatedAtISO);
  const timelinePublic = profile?.readingTimelineVisibility === "public";

  const friendLabel = useMemo(() => {
    if (relationship?.status === "accepted") return friendsSince ? `Friends since ${friendsSince}` : "Friends";
    if (relationship?.status === "pending" && relationship?.direction === "outgoing") return "Request Sent";
    if (relationship?.status === "pending" && relationship?.direction === "incoming") return "Accept Friend";
    return "Add Friend";
  }, [relationship, friendsSince]);

  async function friendAction() {
    if (relationship?.status === "accepted" || (relationship?.status === "pending" && relationship?.direction === "outgoing")) return;
    try {
      setFriendBusy(true);
      setStatus("");
      await sendNativeFriendRequest(userId);
      setStatus(relationship?.direction === "incoming" ? "Friend request accepted." : "Friend request sent.");
      await load();
    } catch (error) {
      setStatus(error?.message || "Could not update friendship.");
    } finally {
      setFriendBusy(false);
    }
  }

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 80 }} size="large" /></SafeAreaView>;

  return <SafeAreaView style={s.safe}>
    <View style={s.header}>
      <Pressable onPress={() => router.back()} hitSlop={12}><Text style={s.back}>‹ Back</Text></Pressable>
      <Text style={s.headerTitle}>Reader Profile</Text>
    </View>
    <ScrollView contentContainerStyle={s.scroll}>
      <View style={s.profileCard}>
        {image ? <Image source={{ uri: image }} style={s.avatar} /> : <View style={s.fallback}><Text style={s.initial}>{displayName[0]?.toUpperCase() || "R"}</Text></View>}
        <View style={s.profileBody}>
          <Text style={s.eyebrow}>READER PROFILE</Text>
          <Text style={s.name}>{displayName}</Text>
          {!!profile?.username && <Text style={s.username}>@{profile.username}</Text>}
          <View style={s.stats}>
            <View style={s.statPill}><Text style={s.statIcon}>◉</Text><Text style={s.statValue}>{Number(stats.books || 0)}</Text></View>
            <View style={s.statPill}><Text style={s.statIcon}>▣</Text><Text style={s.statValue}>{Number(stats.completed || 0)}</Text></View>
            <View style={s.statPill}><Text style={s.statIcon}>✎</Text><Text style={s.statValue}>{Number(stats.journal || 0)}</Text></View>
          </View>
          <Pressable disabled={friendBusy || relationship?.status === "accepted" || (relationship?.status === "pending" && relationship?.direction === "outgoing")} onPress={friendAction} style={[s.friendButton, relationship?.status === "accepted" && s.friendButtonQuiet]}>
            <Text style={[s.friendButtonText, relationship?.status === "accepted" && s.friendButtonQuietText]}>{friendBusy ? "Saving…" : friendLabel}</Text>
          </Pressable>
          {!!status && <Text style={s.status}>{status}</Text>}
          {!!profile?.about && <Text style={s.about}>{profile.about}</Text>}
        </View>
      </View>

      <View style={s.timelinePanel}>
        <Text style={s.eyebrow}>READING HISTORY</Text>
        <Text style={s.sectionTitle}>Reading Timeline</Text>
        {!timelinePublic ? <View style={s.privateBox}><Text style={s.privateTitle}>Timeline Private</Text><Text style={s.privateText}>This reader has chosen to keep their reading history private.</Text></View> : timeline.length === 0 ? <Text style={s.empty}>No public books are currently shown on this reader's timeline.</Text> : timeline.map((item, index) => <ReadingTimelineCard key={String(item.id || item.bookId || index)} item={item} onPress={() => router.push({ pathname: "/reader/[bookId]", params: { bookId: String(item.bookId || item.id), title: item.title || "Book", author: item.author || "", image: nativeReadingCoverUrl(item) } })} />)}
      </View>
    </ScrollView>
    <BottomNav active="library" />
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:BRAND.background},header:{paddingHorizontal:18,paddingVertical:14,backgroundColor:BRAND.surface,borderBottomWidth:1,borderBottomColor:BRAND.line},back:{color:BRAND.tealDark,fontWeight:"900",fontSize:15},headerTitle:{color:BRAND.ink,fontSize:24,fontWeight:"900",marginTop:5},scroll:{padding:18,paddingBottom:100},
  profileCard:{backgroundColor:BRAND.surface,borderWidth:1,borderColor:BRAND.line,borderRadius:22,padding:18,flexDirection:"row",alignItems:"flex-start"},avatar:{width:92,height:92,borderRadius:46,borderWidth:2,borderColor:BRAND.teal},fallback:{width:92,height:92,borderRadius:46,backgroundColor:BRAND.teal,alignItems:"center",justifyContent:"center"},initial:{fontSize:34,fontWeight:"900",color:"#fff"},profileBody:{flex:1,marginLeft:16},eyebrow:{color:BRAND.tealDark,fontSize:11,fontWeight:"900",letterSpacing:1.5},name:{fontSize:28,fontWeight:"900",color:BRAND.ink,marginTop:4},username:{color:BRAND.muted,fontSize:16,marginTop:2},stats:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:12},statPill:{minWidth:56,height:36,paddingHorizontal:10,borderRadius:999,borderWidth:1,borderColor:BRAND.line,backgroundColor:"#fff",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},statIcon:{color:BRAND.ink,fontWeight:"900"},statValue:{color:BRAND.ink,fontWeight:"900"},friendButton:{alignSelf:"flex-start",backgroundColor:BRAND.primary,borderRadius:999,paddingHorizontal:14,paddingVertical:10,marginTop:12},friendButtonQuiet:{backgroundColor:"#EDF3F2",borderWidth:1,borderColor:BRAND.line},friendButtonText:{color:"#fff",fontWeight:"900"},friendButtonQuietText:{color:BRAND.ink},status:{color:BRAND.tealDark,fontWeight:"700",marginTop:8},about:{color:BRAND.muted,fontSize:15,lineHeight:22,marginTop:14},
  timelinePanel:{backgroundColor:BRAND.surface,borderWidth:1,borderColor:BRAND.line,borderRadius:22,padding:18,marginTop:16},sectionTitle:{color:BRAND.ink,fontSize:27,fontWeight:"900",marginTop:6,marginBottom:14},privateBox:{backgroundColor:"#EDF3F2",borderRadius:16,padding:16},privateTitle:{color:BRAND.ink,fontWeight:"900",fontSize:16},privateText:{color:BRAND.muted,lineHeight:21,marginTop:5},empty:{color:BRAND.muted,textAlign:"center",paddingVertical:22}
});
