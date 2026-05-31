import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { PermissionDef } from "../hooks/usePermissionGuard";

type Props = {
  missingPermissions: PermissionDef[];
  onRequest: (def: PermissionDef) => Promise<void>;
  onDismiss: () => void;
};

export function PermissionGuardDialog({
  missingPermissions,
  onRequest,
  onDismiss,
}: Props): React.JSX.Element | null {
  if (missingPermissions.length === 0) return null;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 标题 */}
          <Text style={styles.title}>需要以下权限</Text>
          <Text style={styles.subtitle}>
            部分权限未开启，对应功能将无法使用
          </Text>

          {/* 权限列表 */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          >
            {missingPermissions.map((def) => (
              <View key={def.key} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.icon}>{def.icon}</Text>
                  <View style={styles.rowText}>
                    <Text style={styles.permLabel}>{def.label}</Text>
                    <Text style={styles.permDesc}>{def.description}</Text>
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.grantBtn,
                    def.isSpecial && styles.grantBtnSpecial,
                    pressed && styles.grantBtnPressed,
                  ]}
                  onPress={() => void onRequest(def)}
                >
                  <Text
                    style={[
                      styles.grantBtnText,
                      def.isSpecial && styles.grantBtnTextSpecial,
                    ]}
                  >
                    {def.isSpecial ? "去设置" : "授权"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {/* 底部提示 */}
          <Text style={styles.note}>
            授权后所有功能即可正常使用；特殊权限需在系统设置中手动开启
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.dismissBtn,
              pressed && styles.dismissBtnPressed,
            ]}
            onPress={onDismiss}
          >
            <Text style={styles.dismissBtnText}>我知道了，暂时忽略</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#181426",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 20,
    marginBottom: 20,
  },
  list: {
    maxHeight: 300,
  },
  listContent: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 14,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    fontSize: 24,
  },
  rowText: {
    flex: 1,
  },
  permLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  permDesc: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 17,
  },
  grantBtn: {
    backgroundColor: "#6C3CE1",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 56,
    alignItems: "center",
  },
  grantBtnSpecial: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#A78BFA",
  },
  grantBtnPressed: {
    opacity: 0.7,
  },
  grantBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  grantBtnTextSpecial: {
    color: "#A78BFA",
  },
  note: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 17,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 14,
  },
  dismissBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  dismissBtnPressed: {
    opacity: 0.6,
  },
  dismissBtnText: {
    fontSize: 13,
    color: "#64748B",
  },
});
