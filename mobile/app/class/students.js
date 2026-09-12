import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";

import BottomNav from "../../components/BottomNav";
import { BRAND } from "../../../shared/brand";
import { auth, db } from "../../lib/firebase";
import {
  searchNativeReadersByUsername
} from "../../services/librarySocial";
import {
  canManageClass,
  classRoleLabel,
  getNativeClass,
  getNativeClassFriends,
  getNativeClassMembers,
  inviteNativeClassFriend,
  removeNativeClassMember,
  setNativeClassRole
} from "../../services/classFoundation";

export default function ClassStudents() {
  const params = useLocalSearchParams();
  const classId = String(params.classId || "");

  const [classData, setClassData] = useState(null);
  const [members, setMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [status, setStatus] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [studentSearching, setStudentSearching] = useState(false);

  async function loadJoinRequests(canManage) {
    if (!canManage) {
      setJoinRequests([]);
      return;
    }

    const snapshot = await getDocs(
      collection(
        db,
        "groups",
        classId,
        "joinRequests"
      )
    );

    const pending = snapshot.docs
      .map((requestDoc) => ({
        id: requestDoc.id,
        ...requestDoc.data()
      }))
      .filter(
        (request) =>
          !request.status ||
          request.status === "pending"
      );

    const hydrated = await Promise.all(
      pending.map(async (request) => {
        const userId = String(
          request.userId ||
          request.id ||
          ""
        );

        if (!userId) {
          return request;
        }

        try {
          const profile = await getDoc(
            doc(
              db,
              "publicProfiles",
              userId
            )
          );

          return {
            ...request,
            userId,
            profile: profile.exists()
              ? profile.data()
              : null
          };
        } catch {
          return {
            ...request,
            userId
          };
        }
      })
    );

    setJoinRequests(hydrated);
  }

  async function load() {
    try {
      setLoading(true);
      const loadedClass =
        await getNativeClass(classId);
      const loadedMembers =
        await getNativeClassMembers(classId);

      setClassData(loadedClass);
      setMembers(loadedMembers);

      const canManage =
        canManageClass(
          loadedClass.membership?.role
        );

      if (canManage) {
        const [
          loadedFriends
        ] = await Promise.all([
          getNativeClassFriends(classId),
          loadJoinRequests(true)
        ]);

        setFriends(loadedFriends);
      } else {
        setFriends([]);
        await loadJoinRequests(false);
      }
    } catch (error) {
      setStatus(
        error?.message ||
        "Could not load students."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [classId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [classId])
  );

  const role =
    classData?.membership?.role ||
    "member";
  const isOwner = role === "owner";
  const canManage =
    canManageClass(role);

  const orderedMembers = useMemo(() => {
    const rank = {
      owner: 0,
      admin: 1,
      moderator: 2,
      member: 3
    };

    return [...members].sort((a, b) => {
      const roleDiff =
        (rank[a.role] ?? 9) -
        (rank[b.role] ?? 9);

      if (roleDiff) {
        return roleDiff;
      }

      return memberName(a).localeCompare(
        memberName(b)
      );
    });
  }, [members]);

  async function changeRole(
    member,
    next
  ) {
    try {
      setBusyId(
        String(member.userId)
      );
      setStatus("");
      await setNativeClassRole(
        classId,
        member.userId,
        next
      );
      await load();
    } catch (error) {
      setStatus(
        error?.message ||
        "Could not update classroom role."
      );
    } finally {
      setBusyId("");
    }
  }

  async function remove(member) {
    try {
      setBusyId(
        String(member.userId)
      );
      setStatus("");
      await removeNativeClassMember(
        classId,
        member.userId
      );
      await load();
    } catch (error) {
      setStatus(
        error?.message ||
        "Could not remove this member."
      );
    } finally {
      setBusyId("");
    }
  }

  async function respondToJoinRequest(
    request,
    accept
  ) {
    const userId = String(
      request?.userId ||
      request?.id ||
      ""
    );

    if (!userId) {
      return;
    }

    try {
      setBusyId(userId);
      setStatus("");

      const now =
        new Date().toISOString();
      const batch =
        writeBatch(db);

      const requestRef = doc(
        db,
        "groups",
        classId,
        "joinRequests",
        userId
      );

      if (accept) {
        batch.set(
          doc(
            db,
            "groups",
            classId,
            "members",
            userId
          ),
          {
            userId,
            groupId: classId,
            role: "member",
            status: "active",
            joinedAtISO: now,
            updatedAtISO: now,
            joinedAt:
              serverTimestamp(),
            updatedAt:
              serverTimestamp()
          }
        );
      }

      batch.update(
        requestRef,
        {
          status:
            accept
              ? "accepted"
              : "declined",
          respondedAtISO: now,
          updatedAtISO: now,
          respondedAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp()
        }
      );

      await batch.commit();
      await load();

      setStatus(
        accept
          ? "Student added to class."
          : "Join request declined."
      );
    } catch (error) {
      setStatus(
        error?.message ||
        "Could not update the join request."
      );
    } finally {
      setBusyId("");
    }
  }

  function leaveClass() {
    Alert.alert(
      "Leave Class",
      "Leave this class? You will lose access to its assignments, discussions, grades, and class progress until you join again.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Leave Class",
          style: "destructive",
          onPress: async () => {
            try {
              const userId =
                auth.currentUser?.uid ||
                "";

              if (!userId) {
                throw new Error(
                  "You must be logged in."
                );
              }

              await removeNativeClassMember(
                classId,
                userId
              );

              router.replace(
                "/groups"
              );
            } catch (error) {
              setStatus(
                error?.message ||
                "Could not leave this class."
              );
            }
          }
        }
      ]
    );
  }

  async function searchStudent() {
    const term =
      studentQuery.trim();

    if (term.length < 2) {
      setStatus(
        "Enter at least 2 characters."
      );
      setStudentResults([]);
      return;
    }

    try {
      setStudentSearching(true);
      setStatus("");

      const results =
        await searchNativeReadersByUsername(
          term,
          12
        );

      const memberIds = new Set(
        members.map((member) =>
          String(
            member.userId ||
            member.id
          )
        )
      );

      const filtered =
        results.filter(
          (reader) =>
            !memberIds.has(
              String(
                reader.userId ||
                reader.id
              )
            )
        );

      setStudentResults(filtered);

      if (!filtered.length) {
        setStatus(
          "No matching readers found outside this class."
        );
      }
    } catch (error) {
      setStatus(
        error?.message ||
        "Could not search for readers."
      );
    } finally {
      setStudentSearching(false);
    }
  }

  async function invite(reader) {
    const userId = String(
      reader.userId ||
      reader.otherUserId ||
      reader.id ||
      ""
    );

    try {
      setBusyId(userId);
      setStatus("");
      await inviteNativeClassFriend(
        classId,
        userId
      );
      setStatus(
        `Invitation sent to ${memberName(
          reader
        )}.`
      );
      setStudentResults(
        (current) =>
          current.filter(
            (item) =>
              String(
                item.userId ||
                item.id
              ) !== userId
          )
      );
    } catch (error) {
      setStatus(
        error?.message ||
        "Could not send the invitation."
      );
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.content
        }
      >
        <Pressable
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.back}>
            ‹ Class
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Students & Staff
        </Text>
        <Text style={styles.subtitle}>
          Primary Teacher · Teacher ·
          Aide · Student
        </Text>

        {!!status && (
          <Text style={styles.status}>
            {status}
          </Text>
        )}

        {canManage &&
          joinRequests.length > 0 && (
          <>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Join Requests (
              {joinRequests.length})
            </Text>

            {joinRequests.map(
              (request) => {
                const userId =
                  String(
                    request.userId ||
                    request.id ||
                    ""
                  );

                return (
                  <View
                    key={userId}
                    style={
                      styles.requestCard
                    }
                  >
                    <View
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={
                          styles.memberName
                        }
                      >
                        {memberName(
                          request.profile ||
                          request
                        )}
                      </Text>
                      {!!request.profile
                        ?.username && (
                        <Text
                          style={
                            styles.username
                          }
                        >
                          @
                          {
                            request
                              .profile
                              .username
                          }
                        </Text>
                      )}
                    </View>

                    <View
                      style={
                        styles.requestActions
                      }
                    >
                      <Pressable
                        disabled={
                          busyId ===
                          userId
                        }
                        onPress={() =>
                          respondToJoinRequest(
                            request,
                            true
                          )
                        }
                        style={
                          styles.acceptButton
                        }
                      >
                        <Text
                          style={
                            styles.acceptText
                          }
                        >
                          Accept
                        </Text>
                      </Pressable>

                      <Pressable
                        disabled={
                          busyId ===
                          userId
                        }
                        onPress={() =>
                          respondToJoinRequest(
                            request,
                            false
                          )
                        }
                        style={
                          styles.declineButton
                        }
                      >
                        <Text
                          style={
                            styles.declineText
                          }
                        >
                          Decline
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }
            )}
          </>
        )}

        {orderedMembers.map(
          (member) => {
            const userId =
              String(
                member.userId ||
                member.id
              );
            const busy =
              busyId === userId;
            const canEditRole =
              isOwner &&
              member.role !==
                "owner";
            const canRemove =
              canManage &&
              member.role !==
                "owner";

            return (
              <View
                key={userId}
                style={
                  styles.memberCard
                }
              >
                <View
                  style={styles.memberTop}
                >
                  <View
                    style={{ flex: 1 }}
                  >
                    <Text
                      style={
                        styles.memberName
                      }
                    >
                      {memberName(
                        member
                      )}
                    </Text>
                    {!!member.username && (
                      <Text
                        style={
                          styles.username
                        }
                      >
                        @{member.username}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={styles.role}
                  >
                    {classRoleLabel(
                      member.role
                    )}
                  </Text>
                </View>

                {canEditRole && (
                  <View
                    style={
                      styles.roleButtons
                    }
                  >
                    {[
                      [
                        "admin",
                        "Teacher"
                      ],
                      [
                        "moderator",
                        "Aide"
                      ],
                      [
                        "member",
                        "Student"
                      ]
                    ].map(
                      ([
                        value,
                        label
                      ]) => (
                        <Pressable
                          key={value}
                          disabled={busy}
                          onPress={() =>
                            changeRole(
                              member,
                              value
                            )
                          }
                          style={[
                            styles.roleButton,
                            member.role ===
                              value &&
                              styles.roleButtonActive
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleButtonText,
                              member.role ===
                                value &&
                                styles.roleButtonTextActive
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                )}

                {canRemove && (
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      remove(member)
                    }
                    style={
                      styles.removeButton
                    }
                  >
                    <Text
                      style={
                        styles.removeText
                      }
                    >
                      Remove from class
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          }
        )}

        {role === "member" && (
          <View
            style={
              styles.studentControls
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Class Membership
            </Text>
            <Text
              style={
                styles.sectionHelp
              }
            >
              Leaving removes you from
              this class. You can only
              return through the class's
              normal join process.
            </Text>

            <Pressable
              onPress={leaveClass}
              style={
                styles.leaveButton
              }
            >
              <Text
                style={
                  styles.leaveText
                }
              >
                Leave Class
              </Text>
            </Pressable>
          </View>
        )}

        {canManage && (
          <>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Find Student
            </Text>
            <Text
              style={
                styles.sectionHelp
              }
            >
              Search by partial or full
              Lit Chain username.
              Students do not need to
              already be friends.
            </Text>

            <View
              style={styles.searchRow}
            >
              <TextInput
                value={studentQuery}
                onChangeText={
                  setStudentQuery
                }
                onSubmitEditing={
                  searchStudent
                }
                placeholder="Username"
                autoCapitalize="none"
                autoCorrect={false}
                style={
                  styles.searchInput
                }
              />

              <Pressable
                disabled={
                  studentSearching ||
                  studentQuery
                    .trim()
                    .length < 2
                }
                onPress={
                  searchStudent
                }
                style={[
                  styles.searchButton,
                  (
                    studentSearching ||
                    studentQuery
                      .trim()
                      .length < 2
                  ) &&
                    styles.disabledButton
                ]}
              >
                <Text
                  style={
                    styles.searchButtonText
                  }
                >
                  {studentSearching
                    ? "…"
                    : "Search"}
                </Text>
              </Pressable>
            </View>

            {studentResults.map(
              (reader) => {
                const userId =
                  String(
                    reader.userId ||
                    reader.id
                  );

                return (
                  <View
                    key={userId}
                    style={
                      styles.searchResult
                    }
                  >
                    <View
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={
                          styles.memberName
                        }
                      >
                        {memberName(
                          reader
                        )}
                      </Text>
                      {!!reader.username && (
                        <Text
                          style={
                            styles.username
                          }
                        >
                          @{reader.username}
                        </Text>
                      )}
                    </View>

                    <Pressable
                      disabled={
                        busyId ===
                        userId
                      }
                      onPress={() =>
                        invite(reader)
                      }
                      style={
                        styles.inviteButton
                      }
                    >
                      <Text
                        style={
                          styles.inviteText
                        }
                      >
                        Invite
                      </Text>
                    </Pressable>
                  </View>
                );
              }
            )}

            <Text
              style={
                styles.sectionTitle
              }
            >
              Invite Friends
            </Text>

            {!friends.length ? (
              <Text
                style={styles.empty}
              >
                No uninvited friends
                available.
              </Text>
            ) : (
              friends.map((friend) => {
                const userId =
                  String(
                    friend.otherUserId ||
                    friend.id ||
                    ""
                  );

                return (
                  <View
                    key={userId}
                    style={
                      styles.inviteRow
                    }
                  >
                    <Text
                      style={
                        styles.inviteName
                      }
                    >
                      {memberName(
                        friend
                      )}
                    </Text>

                    <Pressable
                      disabled={
                        busyId ===
                        userId
                      }
                      onPress={() =>
                        invite(friend)
                      }
                      style={
                        styles.inviteButton
                      }
                    >
                      <Text
                        style={
                          styles.inviteText
                        }
                      >
                        Invite
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

function memberName(member) {
  return (
    member?.displayName ||
    member?.username ||
    member?.name ||
    member?.profile?.displayName ||
    member?.profile?.username ||
    member?.userId ||
    "Reader"
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor:
      BRAND.background
  },
  content: {
    padding: 18,
    paddingBottom: 100
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900",
    marginBottom: 18
  },
  title: {
    color: BRAND.ink,
    fontSize: 28,
    fontWeight: "900"
  },
  subtitle: {
    color: BRAND.muted,
    marginTop: 4,
    marginBottom: 18
  },
  status: {
    color: BRAND.tealDark,
    backgroundColor: "#FFF8DF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12
  },
  memberCard: {
    backgroundColor:
      BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10
  },
  memberTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  memberName: {
    color: BRAND.ink,
    fontWeight: "900",
    fontSize: 16
  },
  username: {
    color: BRAND.muted,
    marginTop: 2
  },
  role: {
    color: BRAND.tealDark,
    fontWeight: "900",
    fontSize: 12
  },
  roleButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12
  },
  roleButton: {
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  roleButtonActive: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal
  },
  roleButtonText: {
    color: BRAND.ink,
    fontWeight: "800",
    fontSize: 12
  },
  roleButtonTextActive: {
    color: "#FFF"
  },
  removeButton: {
    marginTop: 12
  },
  removeText: {
    color: BRAND.danger,
    fontWeight: "800"
  },
  sectionTitle: {
    color: BRAND.ink,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 22,
    marginBottom: 10
  },
  sectionHelp: {
    color: BRAND.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 10
  },
  empty: {
    color: BRAND.muted
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor:
      BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.yellow,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8
  },
  requestActions: {
    flexDirection: "row",
    gap: 7
  },
  acceptButton: {
    backgroundColor:
      BRAND.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  acceptText: {
    color: "#FFF",
    fontWeight: "900"
  },
  declineButton: {
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  declineText: {
    color: BRAND.danger,
    fontWeight: "900"
  },
  studentControls: {
    marginTop: 8
  },
  leaveButton: {
    borderWidth: 1,
    borderColor: "#E4CACA",
    backgroundColor:
      BRAND.surface,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46
  },
  leaveText: {
    color: BRAND.danger,
    fontWeight: "900"
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    backgroundColor:
      BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: BRAND.ink
  },
  searchButton: {
    minWidth: 92,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor:
      BRAND.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  searchButtonText: {
    color: "#FFF",
    fontWeight: "900"
  },
  disabledButton: {
    opacity: 0.45
  },
  searchResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor:
      BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.teal,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor:
      BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8
  },
  inviteName: {
    flex: 1,
    color: BRAND.ink,
    fontWeight: "800"
  },
  inviteButton: {
    backgroundColor:
      BRAND.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  inviteText: {
    color: "#FFF",
    fontWeight: "900"
  }
});
