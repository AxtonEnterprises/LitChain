import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { BRAND } from "../../shared/brand";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      message: ""
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message:
        error?.message ||
        "Something unexpected happened."
    };
  }

  componentDidCatch(error, info) {
    console.error(
      "Lit Chain render error:",
      error,
      info?.componentStack || ""
    );
  }

  reset = () => {
    this.setState({
      hasError: false,
      message: ""
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.screen}>
        <Text style={styles.eyebrow}>
          LIT CHAIN
        </Text>

        <Text style={styles.title}>
          This screen hit an error
        </Text>

        <Text style={styles.body}>
          Your account data has not been deleted.
          Try reopening the screen. If the problem
          continues, restart the app.
        </Text>

        {!!this.state.message && (
          <Text style={styles.detail}>
            {this.state.message}
          </Text>
        )}

        <Pressable
          onPress={this.reset}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  eyebrow: {
    color: BRAND.tealDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  },
  title: {
    color: BRAND.ink,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 8
  },
  body: {
    color: BRAND.muted,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 420
  },
  detail: {
    color: BRAND.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
    maxWidth: 420
  },
  button: {
    marginTop: 18,
    backgroundColor: BRAND.teal,
    minHeight: 46,
    minWidth: 140,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "900"
  }
});
