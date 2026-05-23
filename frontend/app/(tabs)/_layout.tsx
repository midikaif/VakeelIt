import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { View } from "react-native";
import StatusBar from "@/components/ui/StatusBar";

export default function TabLayout() {
  const { user } = useAuth();

  const isLawyer = user?.user_type === "lawyer";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: "#9CA3AF",
        headerShown: true,
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            <StatusBar />
          </View>
        ),
        headerStyle: {
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "600",
          color: "#1F2937",
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contract"
        options={{
          title: "Contract",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="case"
        options={{
          title: "Case",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lawyers"
        options={{
          title: "Lawyers",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          tabBarItemStyle: isLawyer ? { display: "none" } : {},
          href: isLawyer ? null : "/(tabs)/lawyers",
        }}
      />

      <Tabs.Screen
        name="draft"
        options={{
          title: "Draft",
          // href: '/(tabs)/draft',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create" size={size} color={color} />
          ),
          href: isLawyer ? "/(tabs)/draft" : null,
          tabBarItemStyle: isLawyer ? {} : { display: "none" },
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
