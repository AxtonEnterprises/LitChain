import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { router } from "expo-router";

import BottomNav from "../components/BottomNav";
import { BRAND } from "../../shared/brand";

import {
  PLATFORM_ROLES,
  applyNativePlatformEnforcement,
  clearNativePlatformEnforcement,
  getMyNativePlatformRole,
  getNativePlatformEnforcements,
  getNativePlatformReports,
  getNativePlatformRoleRecords,
  resolveNativePlatformReport,
  searchNativePlatformRoleCandidates,
  setNativePlatformRole
} from "../services/platformModeration";

function personName(profile, fallback = "Reader") {
  return (
    profile?.displayName ||
    profile?.username ||
    profile?.name ||
    fallback
  );
}

export default function ModerationScreen() {
  const [role, setRole] = useState(null);
  const [tab, setTab] = useState("reports");
  const [reports, setReports] = useState([]);
  const [enforcements, setEnforcements] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setStatus("");

      const myRole = await getMyNativePlatformRole();
      setRole(myRole);

      if (!myRole.isPlatformModerator) {
        setStatus("You do not have platform moderation access.");
        return;
      }

      const nextReports = await getNativePlatformReports();
      setReports(nextReports);

      if (myRole.isPlatformAdmin) {
        setEnforcements(
          await getNativePlatformEnforcements()
        );
      } else {
        setEnforcements([]);
      }

      if (myRole.isFoundationAdmin) {
        setRoles(
          await getNativePlatformRoleRecords()
        );
      } else {
        setRoles([]);
      }
    } catch (error) {
      setStatus(
        error?.message ||
        "Could not load moderation."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(report, resolution) {
    try {
      await resolveNativePlatformReport(
        report.id,
        resolution
      );
      await load();
    } catch (error) {
      Alert.alert(
        "Moderation",
        error?.message || "Could not update report."
      );
    }
  }

  async function enforce(item, action) {
    const targetUserId =
      item.targetUserId ||
      item.userId ||
      item.id;

    if (!targetUserId) return;

    const cleanReason = reason.trim();
    if (!cleanReason) {
      Alert.alert(
        "Reason required",
        "Enter a moderation reason first."
      );
      return;
    }

    try {
      if (action === "clear") {
        await clearNativePlatformEnforcement(
          targetUserId
        );
      } else {
        await applyNativePlatformEnforcement({
          targetUserId,
          status: action,
          reason: cleanReason,
          durationHours: 24
        });
      }

      setReason("");
      await load();
    } catch (error) {
      Alert.alert(
        "Moderation",
        error?.message || "Could not apply action."
      );
    }
  }

  async function searchRoles() {
    try {
      setCandidates(
        await searchNativePlatformRoleCandidates(
          searchText
        )
      );
    } catch (error) {
      setStatus(
        error?.message || "Could not search accounts."
      );
    }
  }

  async function changeRole(item, nextRole) {
    const cleanReason =
      reason.trim() ||
      "Platform role updated from native moderation.";

    try {
      await setNativePlatformRole({
        targetUserId:
          item.userId || item.id,
        role: nextRole,
        reason: cleanReason
      });

      setReason("");
      setCandidates([]);
      setSearchText("");
      await load();
    } catch (error) {
      Alert.alert(
        "Platform role",
        error?.message || "Could not change role."
      );
    }
  }

  const tabs = useMemo(() => {
    const values = [{ id: "reports", label: "Reports" }];

    if (role?.isPlatformAdmin) {
      values.push({
        id: "enforcement",
        label: "Enforcement"
      });
    }

    if (role?.isFoundationAdmin) {
      values.push({
        id: "roles",
        label: "Roles"
      });
    }

    return values;
  }, [role]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>
          Platform Moderation
        </Text>

        <Text style={styles.role}>
          {role?.role || "user"}
        </Text>
      </View>

      {!!status && (
        <Text style={styles.status}>
          {status}
        </Text>
      )}

      {role?.isPlatformModerator && (
        <>
          <View style={styles.tabs}>
            {tabs.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                style={[
                  styles.tab,
                  tab === item.id &&
                    styles.tabActive
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === item.id &&
                      styles.tabTextActive
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === "reports" && (
            <FlatList
              data={reports}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  No open reports.
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {item.title ||
                      item.targetType ||
                      "Report"}
                  </Text>

                  <Text style={styles.muted}>
                    Reported:{" "}
                    {personName(
                      item.targetProfile,
                      item.targetUserId
                    )}
                  </Text>

                  <Text style={styles.body}>
                    {item.reason || "No reason supplied"}
                  </Text>

                  {!!item.details && (
                    <Text style={styles.quote}>
                      {item.details}
                    </Text>
                  )}

                  {item.targetUserId && role?.userId === item.targetUserId ? (
                    <Text style={styles.hierarchyNotice}>
                      Reports involving your own account must be reviewed by a higher-ranked moderator.
                    </Text>
                  ) : (
                  <View style={styles.row}>
                    <Pressable
                      onPress={() =>
                        resolve(item, "dismissed")
                      }
                      style={styles.secondary}
                    >
                      <Text style={styles.secondaryText}>
                        Dismiss
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        resolve(item, "resolved")
                      }
                      style={styles.primary}
                    >
                      <Text style={styles.primaryText}>
                        Resolve
                      </Text>
                    </Pressable>
                  </View>
                  )}

                  {role.isPlatformAdmin && item.targetUserId !== role?.userId && (
                    <>
                      <TextInput
                        value={reason}
                        onChangeText={setReason}
                        placeholder="Reason for warning/suspension/ban"
                        style={styles.input}
                      />

                      <View style={styles.row}>
                        <Pressable
                          onPress={() =>
                            enforce(item, "warning")
                          }
                          style={styles.secondary}
                        >
                          <Text style={styles.secondaryText}>
                            Warn
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            enforce(item, "suspended")
                          }
                          style={styles.secondary}
                        >
                          <Text style={styles.secondaryText}>
                            Suspend 24h
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            enforce(item, "banned")
                          }
                          style={styles.danger}
                        >
                          <Text style={styles.dangerText}>
                            Ban
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              )}
            />
          )}

          {tab === "enforcement" && (
            <FlatList
              data={enforcements}
              keyExtractor={(item) =>
                String(item.userId || item.id)
              }
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  No active enforcement.
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {personName(
                      item.targetProfile,
                      item.userId || item.id
                    )}
                  </Text>

                  <Text style={styles.body}>
                    {item.status}
                  </Text>

                  <Text style={styles.muted}>
                    {item.reason || ""}
                  </Text>

                  <Pressable
                    onPress={() =>
                      enforce(item, "clear")
                    }
                    style={styles.secondary}
                  >
                    <Text style={styles.secondaryText}>
                      Clear Enforcement
                    </Text>
                  </Pressable>
                </View>
              )}
            />
          )}

          {tab === "roles" && (
            <ScrollView
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search username or display name"
                style={styles.input}
              />

              <Pressable
                onPress={searchRoles}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>
                  Search
                </Text>
              </Pressable>

              {!!candidates.length && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Search results
                  </Text>

                  {candidates.map((item) => (
                    <View
                      key={item.userId || item.id}
                      style={styles.card}
                    >
                      <Text style={styles.cardTitle}>
                        {personName(item)}
                      </Text>

                      <View style={styles.row}>
                        <Pressable
                          onPress={() =>
                            changeRole(
                              item,
                              PLATFORM_ROLES.MODERATOR
                            )
                          }
                          style={styles.secondary}
                        >
                          <Text style={styles.secondaryText}>
                            Moderator
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            changeRole(
                              item,
                              PLATFORM_ROLES.ADMIN
                            )
                          }
                          style={styles.secondary}
                        >
                          <Text style={styles.secondaryText}>
                            Admin
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Current roles
                </Text>

                {roles.map((item) => (
                  <View
                    key={item.userId || item.id}
                    style={styles.card}
                  >
                    <Text style={styles.cardTitle}>
                      {personName(
                        item.targetProfile,
                        item.userId || item.id
                      )}
                    </Text>

                    <Text style={styles.muted}>
                      {item.role}
                    </Text>

                    {item.role !==
                      PLATFORM_ROLES.FOUNDATION_ADMIN && (
                      <Pressable
                        onPress={() =>
                          changeRole(item, "user")
                        }
                        style={styles.danger}
                      >
                        <Text style={styles.dangerText}>
                          Remove Platform Role
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </>
      )}

      <BottomNav active="library" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  header: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    backgroundColor: BRAND.surface
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  title: {
    color: BRAND.ink,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 10
  },
  role: {
    color: BRAND.muted,
    marginTop: 3
  },
  status: {
    color: BRAND.danger,
    padding: 12,
    textAlign: "center"
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    backgroundColor: BRAND.surface
  },
  tab: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal
  },
  tabText: {
    color: BRAND.muted,
    fontWeight: "800"
  },
  tabTextActive: {
    color: "#FFF"
  },
  list: {
    padding: 14,
    paddingBottom: 110
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  empty: {
    color: BRAND.muted,
    textAlign: "center",
    padding: 30
  },
  card: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12
  },
  cardTitle: {
    color: BRAND.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  hierarchyNotice: {
    color: BRAND.muted,
    lineHeight: 19,
    marginTop: 10,
    fontWeight: "700"
  },
  muted: {
    color: BRAND.muted,
    marginTop: 4
  },
  body: {
    color: BRAND.ink,
    marginTop: 8
  },
  quote: {
    color: BRAND.muted,
    fontStyle: "italic",
    marginTop: 8
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  primary: {
    backgroundColor: BRAND.teal,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 10
  },
  primaryText: {
    color: "#FFF",
    fontWeight: "900",
    textAlign: "center"
  },
  secondary: {
    borderWidth: 1,
    borderColor: BRAND.teal,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 10
  },
  secondaryText: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  danger: {
    borderWidth: 1,
    borderColor: BRAND.danger,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 10
  },
  dangerText: {
    color: BRAND.danger,
    fontWeight: "900"
  },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 11,
    backgroundColor: BRAND.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: BRAND.ink
  },
  section: {
    marginTop: 20
  },
  sectionTitle: {
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10
  }
});
