import { Image, StyleSheet, View } from "react-native";

const ICONS = {
  discover: { default: require("../assets/icons/discover.png"), active: require("../assets/icons/discover-active.png") },
  chain: { default: require("../assets/icons/chain.png"), active: require("../assets/icons/chain-active.png") },
  groups: { default: require("../assets/icons/groups.png"), active: require("../assets/icons/groups-active.png") },
  library: { default: require("../assets/icons/library.png"), active: require("../assets/icons/library-active.png") },
  bell: { default: require("../assets/icons/bell.png"), active: require("../assets/icons/bell-active.png") },
  share: { default: require("../assets/icons/share.png"), active: require("../assets/icons/share-active.png") },
  reply: { default: require("../assets/icons/reply.png"), active: require("../assets/icons/reply-active.png") },
  save: { default: require("../assets/icons/save.png"), active: require("../assets/icons/save-active.png") },
  report: { default: require("../assets/icons/report.png"), active: require("../assets/icons/report-active.png") },
  link: { default: require("../assets/icons/link.png"), active: require("../assets/icons/link-active.png") },
  unlink: { default: require("../assets/icons/unlink.png"), active: require("../assets/icons/unlink-active.png") },
  "read-context": { default: require("../assets/icons/read-context.png"), active: require("../assets/icons/read-context-active.png") }
};

export default function LitIcon({ name, active = false, size = 24, style }) {
  const icon = ICONS[name] || ICONS.chain;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={active ? icon.active : icon.default}
        resizeMode="contain"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
