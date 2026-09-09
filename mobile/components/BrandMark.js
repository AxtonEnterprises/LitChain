import {
  Image,
  StyleSheet,
  View
} from "react-native";

export default function BrandMark() {
  return (
    <View style={styles.wrap}>
      <Image
        source={require("../../public/branding/lit-chain-logo-horizontal.png")}
        resizeMode="contain"
        style={styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    width: 270,
    height: 110
  }
});
