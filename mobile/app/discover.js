import {
  FlatList,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

import {
  FEATURED_PUBLIC_DOMAIN_BOOKS
} from "../../shared/discoveryCatalog";

export default function DiscoverScreen() {
  async function openBook(book) {
    await Linking.openURL(
      `https://litchain.org/read/reader/${book.id}`
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Discover"
        subtitle="Classic literature discovery"
      />

      <FlatList
        data={FEATURED_PUBLIC_DOMAIN_BOOKS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.introTitle}>
              Featured reading
            </Text>
            <Text style={styles.introBody}>
              Native search and the native Reader are the next shared migration.
              These featured books already open the live Lit Chain reader.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openBook(item)}
            style={styles.card}
          >
            <Image
              source={{ uri: item.image }}
              resizeMode="contain"
              style={styles.cover}
            />
            <View style={styles.info}>
              <Text style={styles.title}>
                {item.title}
              </Text>
              <Text style={styles.author}>
                {item.author}
              </Text>
              <Text style={styles.open}>
                Read now →
              </Text>
            </View>
          </Pressable>
        )}
      />

      <BottomNav active="discover" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f6fafa"
  },
  list: {
    padding: 18
  },
  intro: {
    marginBottom: 16
  },
  introTitle: {
    color: "#162224",
    fontSize: 22,
    fontWeight: "900"
  },
  introBody: {
    color: "#6c7e81",
    lineHeight: 20,
    marginTop: 6
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dce7e7",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  cover: {
    width: 86,
    height: 126
  },
  info: {
    flex: 1,
    marginLeft: 16
  },
  title: {
    color: "#162224",
    fontSize: 18,
    fontWeight: "900"
  },
  author: {
    color: "#6c7e81",
    marginTop: 5
  },
  open: {
    color: "#287c79",
    fontWeight: "900",
    marginTop: 18
  }
});
