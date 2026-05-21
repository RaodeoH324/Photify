import React, { useContext, useRef } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, View, ActivityIndicator } from 'react-native';

import { AudioProvider, AudioContext } from './src/AudioContext';
import { AuthProvider, AuthContext } from './src/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import LoginScreen from './src/screens/LoginScreen';
import PlaylistDetailScreen from './src/screens/PlaylistDetailScreen';
import ContactScreen from './src/screens/ContactScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LegalScreen from './src/screens/LegalScreen';
import QueueScreen from './src/screens/QueueScreen';
import MiniPlayer from './src/components/MiniPlayer';
import QueueToast from './src/components/QueueToast';


import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#000',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#b3b3b3',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Library') {
            iconName = focused ? 'library' : 'library-outline';
          }
          return <Ionicons name={iconName} size={28} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
    </Tab.Navigator>
  );
}

function GlobalToast() {
  const { toastVisible, toastMessage, hideToast } = useContext(AudioContext);
  const navigation = useNavigation();
  
  return (
    <QueueToast 
      visible={toastVisible} 
      message={toastMessage} 
      onHide={hideToast}
      onPress={() => navigation.navigate('Queue')}
    />
  );
}

function Navigation() {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Stack.Navigator screenOptions={{ headerShown: false, presentation: 'modal' }}>
          {!user ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="Player" component={PlayerScreen} />
              <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
              <Stack.Screen name="Contact" component={ContactScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Legal" component={LegalScreen} />
              <Stack.Screen name="Queue" component={QueueScreen} />
            </>
          )}
        </Stack.Navigator>
        {user && <MiniPlayer />}
        {user && <GlobalToast />}
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AudioProvider>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <Navigation />
      </AudioProvider>
    </AuthProvider>
  );
}
