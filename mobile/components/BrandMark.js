import {
  Image,
  StyleSheet,
  View
} from "react-native";

import { BRAND } from "../../shared/brand";

export default function BrandMark() {
  return (
    <View style={styles.wrap}>
      <Image
        source={{
          uri: BRAND.logoHorizontal
        }}
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
