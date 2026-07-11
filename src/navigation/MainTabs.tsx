import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { can } from "../lib/roles";

import DashboardScreen from "../screens/DashboardScreen";
import MembersScreen from "../screens/MembersScreen";
import MeetingsScreen from "../screens/MeetingsScreen";
import AttendanceScreen from "../screens/AttendanceScreen";
import FinanceScreen from "../screens/FinanceScreen";
import ReportsScreen from "../screens/ReportsScreen";
import AdminScreen from "../screens/AdminScreen";
import MessagesScreen from "../screens/MessagesScreen";
import BroadcastScreen from "../screens/BroadcastScreen";
import MoreScreen from "../screens/MoreScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Members" component={MembersScreen} />
      <Stack.Screen name="Finance" component={FinanceScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="Broadcast" component={BroadcastScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
    </Stack.Navigator>
  );
}

export function MainTabs() {
  const { user } = useAuthStore();
  const role = user?.role ?? "member";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#3b1f6e",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { borderTopColor: "#e5e7eb", paddingBottom: 4 },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Home: "home",
            Meetings: "calendar",
            Attendance: "checkmark-circle",
            More: "menu",
          };
          return <Ionicons name={(icons[route.name] ?? "ellipse") as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Meetings" component={MeetingsScreen} />
      {can.markAttendance(role) && (
        <Tab.Screen name="Attendance" component={AttendanceScreen} />
      )}
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
