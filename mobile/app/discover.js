import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

import {
  FEATURED_PUBLIC_DOMAIN_BOOKS
} from "../../shared/discoveryCatalog";

import { BRAND } from "../../shared/brand";

export default function DiscoverScreen() {
  function openBook(book) {
    router.push({
      pathname: "/reader/[bookId]",
      params: {
        bookId: book.id,
        title: book.title,
        author: book.author
      }
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Discover"
        subtitle="Classic literature discovery"
      />

      <FlatList
        data={
          FEATURED_PUBLIC_DOMAIN_BOOKS
        }
        keyExtractor={(item) =>
          item.id
        }
        contentContainerStyle={
          styles.list
        }
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text
              style={styles.introTitle}
            >
              Featured reading
            </Text>

            <Text
              style={styles.introBody}
            >
              Books now open in the
              native Lit Chain reader.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              openBook(item)
            }
            style={styles.card}
          >
            <Image
              source={{
                uri: item.image
              }}
              resizeMode="contain"
              style={styles.cover}
            />

            <View style={styles.info}>
              <Text style={styles.title}>
                {item.title}
              </Text>

              <Text
                style={styles.author}
              >
                {item.author}
              </Text>

              <Text style={styles.open}>
                Read natively →
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
    backgroundColor:
      BRAND.background
  },
  list: {
    padding: 18
  },
  intro: {
    marginBottom: 16
  },
  introTitle: {
    color: BRAND.ink,
    fontSize: 23,
    fontWeight: "900"
  },
  introBody: {
    color: BRAND.muted,
    marginTop: 6
  },
  card: {
    backgroundColor:
      BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
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
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  author: {
    color: BRAND.muted,
    marginTop: 5
  },
  open: {
    color: BRAND.tealDark,
    fontWeight: "900",
    marginTop: 18
  }
});
