import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuthStore } from "../store/authStore";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";
import PendingScreen from "../screens/PendingScreen";

const Root = createStackNavigator();

export function AppNavigator() {
  const { user } = useAuthStore();

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Root.Screen name="Auth" component={AuthStack} />
        ) : user.role === "pending" ? (
          <Root.Screen name="Pending" component={PendingScreen} />
        ) : (
          <Root.Screen name="Main" component={MainTabs} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
