import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, ScrollView, Modal, Animated, RefreshControl, Dimensions, TextInput, Alert } from 'react-native';
import { fetchPlaylists, fetchPlaylistTracks, fetchTracksFromDrive } from '../api';
import { AudioContext } from '../AudioContext';
import { AuthContext } from '../AuthContext';
import { Ionicons } from '@expo/vector-icons';
import SwipeableRow from '../components/SwipeableRow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

// Artist images map - add require() entries as images are saved to assets/artists/
// To add an image: save it as .jpg to assets/artists/ and uncomment the line below
const ARTIST_IMAGES = {
  // 'Shreya Ghoshal': require('../../assets/artists/shreya_ghoshal.jpg'),
  // 'Arijit Singh': require('../../assets/artists/arijit_singh.jpg'),
  // 'Pritam': require('../../assets/artists/pritam.jpg'),
  // 'Atif Aslam': require('../../assets/artists/atif_aslam.jpg'),
  // 'A.R. Rahman': require('../../assets/artists/ar_rahman.jpg'),
};

const POPULAR_ARTISTS = [
  { name: 'Shreya Ghoshal', color: '#E91E63', initials: 'SG' },
  { name: 'Arijit Singh', color: '#9C27B0', initials: 'AS' },
  { name: 'Sonu Nigam', color: '#2196F3', initials: 'SN' },
  { name: 'Atif Aslam', color: '#FF5722', initials: 'AA' },
  { name: 'Ajay Atul', color: '#4CAF50', initials: 'AJ' },
  { name: 'Nusrat Fateh Ali Khan', color: '#FF9800', initials: 'NK' },
  { name: 'A.R. Rahman', color: '#00BCD4', initials: 'AR' },
  { name: 'Pritam', color: '#8BC34A', initials: 'P' },
  { name: 'Vishal Dadlani', color: '#3F51B5', initials: 'VD' },
  { name: 'Kailash Kher', color: '#F44336', initials: 'KK' },
  { name: 'Shankar Mahadevan', color: '#009688', initials: 'SM' },
  { name: 'Sunidhi Chauhan', color: '#FF4081', initials: 'SC' },
  { name: 'Yo Yo Honey Singh', color: '#FFD600', initials: 'YS' },
  { name: 'Badshah', color: '#E040FB', initials: 'B' },
];

const PlayingIndicator = ({ isPlaying }) => {
  const bar1 = React.useRef(new Animated.Value(0.3)).current;
  const bar2 = React.useRef(new Animated.Value(0.6)).current;
  const bar3 = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    // Stop any active animations instantly
    bar1.stopAnimation();
    bar2.stopAnimation();
    bar3.stopAnimation();

    if (isPlaying) {
      const createAnim = (val, to, duration) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(val, { toValue: to, duration, useNativeDriver: false }),
            Animated.timing(val, { toValue: 0.2, duration, useNativeDriver: false })
          ])
        );
      };

      const anim1 = createAnim(bar1, 1, 400);
      const anim2 = createAnim(bar2, 0.8, 500);
      const anim3 = createAnim(bar3, 0.9, 450);

      anim1.start();
      anim2.start();
      anim3.start();

      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
      };
    } else {
      bar1.setValue(0.3);
      bar2.setValue(0.6);
      bar3.setValue(0.4);
    }
  }, [isPlaying]);

  return (
    <View style={styles.indicatorContainer}>
      <Animated.View style={[styles.bar, { height: bar1.interpolate({ inputRange: [0, 1], outputRange: ['20%', '100%'] }) }]} />
      <Animated.View style={[styles.bar, { height: bar2.interpolate({ inputRange: [0, 1], outputRange: ['20%', '100%'] }) }]} />
      <Animated.View style={[styles.bar, { height: bar3.interpolate({ inputRange: [0, 1], outputRange: ['20%', '100%'] }) }]} />
    </View>
  );
};

export default function HomeScreen({ navigation }) {
  const [playlists, setPlaylists] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isPlaylistSelectVisible, setPlaylistSelectVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isNotifModalVisible, setNotifModalVisible] = useState(false);
  const [isSleepTimerVisible, setSleepTimerVisible] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isAllArtistsVisible, setAllArtistsVisible] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const { 
    playTrack, addToQueue, addToPlaylist, userPlaylists, getTrackColor, 
    activePlaylistId, isPlaying, notifications, clearNotifications,
    setSleepTimer, cancelSleepTimer, sleepTimerEnd
  } = useContext(AudioContext);
  const { user, logout } = useContext(AuthContext);

  // Sleep timer countdown
  const [timerRemaining, setTimerRemaining] = useState(null);
  
  useEffect(() => {
    let interval;
    if (sleepTimerEnd) {
      interval = setInterval(() => {
        const remaining = Math.max(0, sleepTimerEnd - Date.now());
        if (remaining <= 0) {
          setTimerRemaining(null);
          clearInterval(interval);
        } else {
          setTimerRemaining(remaining);
        }
      }, 1000);
    } else {
      setTimerRemaining(null);
    }
    return () => interval && clearInterval(interval);
  }, [sleepTimerEnd]);

  const formatTimerRemaining = (ms) => {
    if (!ms) return '';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  useEffect(() => {
    loadData();
  }, [userPlaylists]);

  const loadData = async (forceRefresh = false) => {
    try {
      const p = await fetchPlaylists();
      // Filter out system playlists from fetched list and use the ones from context for interactivity
      const contextSystemPlaylists = userPlaylists.filter(up => up.isSystem);
      const otherPlaylists = p.filter(fp => !contextSystemPlaylists.find(cp => cp.name === fp.name));
      
      setPlaylists([...contextSystemPlaylists, ...otherPlaylists]);
      
      const t = await fetchTracksFromDrive(forceRefresh);
      setRecentTracks(t.slice(0, 10));
    } catch (e) {
      console.log('Error loading data', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const openPlaylist = async (playlistId, playlistName) => {
    try {
      // Check if it's a local playlist (system or user-created)
      const localPlaylist = userPlaylists.find(p => p.id === playlistId);
      let tracks;
      
      if (localPlaylist && localPlaylist.tracks && localPlaylist.tracks.length > 0) {
        tracks = localPlaylist.tracks;
      } else {
        tracks = await fetchPlaylistTracks(playlistId);
      }

      navigation.navigate('PlaylistDetail', {
        playlist: localPlaylist || { id: playlistId, name: playlistName },
        title: playlistName,
        tracks: tracks || []
      });
    } catch (e) {
      console.log('Error opening playlist', e);
    }
  };

  const openArtistPlaylist = async (artistName) => {
    try {
      const allTracks = await fetchTracksFromDrive();
      const artistTracks = allTracks.filter(t => t.artist && t.artist.toLowerCase().includes(artistName.toLowerCase()));
      
      navigation.navigate('PlaylistDetail', {
        playlist: { id: `artist-${artistName}`, name: artistName },
        title: artistName,
        tracks: artistTracks
      });
    } catch (e) {
      console.log('Error opening artist playlist', e);
    }
  };

  const getArtist = (track) => {
    return track.artist;
  };

  const handleTrackMenu = (track) => {
    setSelectedTrack(track);
    setMenuVisible(true);
  };

  const handleAddToQueue = () => {
    addToQueue(selectedTrack);
    setMenuVisible(false);
  };

  const handleAddToPlaylist = (playlistId) => {
    addToPlaylist(playlistId, selectedTrack);
    setPlaylistSelectVisible(false);
    setMenuVisible(false);
  };

  const cleanTitle = (title) => {
    return title.replace(/_-_/g, ' - ').replace(/_\(mp3\.pm\)/gi, '').replace(/_/g, ' ');
  };

  const handleLogout = () => {
    closeDrawer();
    logout();
  };

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerOpen(false));
  };

  const handleSetTimer = (minutes) => {
    setSleepTimer(minutes);
    setSleepTimerVisible(false);
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'like': return 'heart';
      case 'unlike': return 'heart-dislike';
      case 'queue': return 'list';
      case 'playlist': return 'musical-notes';
      case 'timer': return 'timer';
      default: return 'notifications';
    }
  };

  const getNotifColor = (type) => {
    switch (type) {
      case 'like': return '#1DB954';
      case 'unlike': return '#ff4444';
      case 'queue': return '#8A2BE2';
      case 'playlist': return '#BB86FC';
      case 'timer': return '#FFA726';
      default: return '#fff';
    }
  };

  const renderTrackItem = ({ item, index }) => {
    const displayArtist = getArtist(item);
    return (
      <SwipeableRow onSwipeRight={() => addToQueue(item)}>
        <TouchableOpacity 
          style={styles.trackItem}
          onPress={() => playTrack(item, recentTracks, index)}
        >
          <Image 
            source={item.coverUrl ? { uri: item.coverUrl } : require('../../assets/icon.png')} 
            style={styles.trackCover} 
          />
          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle} numberOfLines={1}>{cleanTitle(item.title)}</Text>
            <Text style={styles.trackArtist} numberOfLines={1}>{displayArtist}</Text>
          </View>
          <TouchableOpacity onPress={() => handleTrackMenu(item)} style={styles.dotsBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color="#b3b3b3" />
          </TouchableOpacity>
        </TouchableOpacity>
      </SwipeableRow>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1DB954" />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={openDrawer} style={styles.profileCircle}>
            <Text style={styles.profileInitial}>{user?.name?.[0] || 'U'}</Text>
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => setNotifModalVisible(true)}>
              <View>
                <Ionicons name="notifications-outline" size={24} color="#fff" style={styles.icon} />
                {notifications.length > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{Math.min(notifications.length, 99)}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Queue')}>
              <Ionicons name="list-outline" size={24} color="#fff" style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Contact')}>
              <Ionicons name="mail-outline" size={24} color="#fff" style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSleepTimerVisible(true)}>
              <View>
                <Ionicons name="time-outline" size={24} color={sleepTimerEnd ? '#FFA726' : '#fff'} style={styles.icon} />
                {timerRemaining && (
                  <View style={styles.timerBadge}>
                    <Text style={styles.timerBadgeText}>{formatTimerRemaining(timerRemaining)}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={24} color="#fff" style={styles.icon} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.gridContainer}>
          {playlists.slice(1, 7).map((p, index) => {
            const isActive = activePlaylistId === p.id;
            return (
              <TouchableOpacity key={p.id} style={styles.gridItem} onPress={() => openPlaylist(p.id, p.name)} activeOpacity={0.8}>
                <View style={[styles.gridImgPlaceholder, { backgroundColor: '#1a1a1a' }]}>
                  <Text style={styles.gridImgNumber}>{index + 1}</Text>
                  <View style={styles.playlistIconBg}>
                    <Ionicons name="musical-notes" size={14} color="#8A2BE2" />
                  </View>
                </View>
                <Text style={[styles.gridTitle, isActive && { color: '#1DB954' }]} numberOfLines={2}>{p.name}</Text>
                {isActive && (
                  <View style={{ marginRight: 12 }}>
                    <PlayingIndicator isPlaying={isPlaying} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Artists</Text>
          <TouchableOpacity onPress={() => setAllArtistsVisible(true)}>
            <Text style={styles.showAllText}>Show all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.artistScroll}>
          {POPULAR_ARTISTS.map((artist, index) => (
            <TouchableOpacity key={index} style={styles.artistItem} onPress={() => openArtistPlaylist(artist.name)}>
              <View style={[styles.artistImageBorder, { borderColor: artist.color }]}>
                {ARTIST_IMAGES[artist.name] ? (
                  <Image source={ARTIST_IMAGES[artist.name]} style={styles.artistPhoto} />
                ) : (
                  <View style={[styles.artistImage, { backgroundColor: artist.color }]}>
                    <Text style={styles.artistInitials}>{artist.initials}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.artistName} numberOfLines={2}>{artist.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Recently Played</Text>
        <FlatList
          data={recentTracks}
          renderItem={renderTrackItem}
          keyExtractor={item => item.id.toString()}
          scrollEnabled={false}
        />
      </ScrollView>

      {/* Track Options Modal */}
      <Modal visible={isMenuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.bottomMenu}>
            <View style={styles.menuHandle} />
            {selectedTrack?.coverUrl && (
              <Image source={{ uri: selectedTrack.coverUrl }} style={styles.menuTrackCover} />
            )}
            <Text style={styles.menuTitle}>{selectedTrack?.title}</Text>
            <Text style={styles.menuSubtitle}>{selectedTrack?.artist}</Text>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleAddToQueue}>
              <View style={[styles.menuIconBg, { backgroundColor: 'rgba(138,43,226,0.15)' }]}>
                <Ionicons name="list" size={20} color="#BB86FC" />
              </View>
              <Text style={styles.menuText}>Add to queue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setPlaylistSelectVisible(true)}>
              <View style={[styles.menuIconBg, { backgroundColor: 'rgba(29,185,84,0.15)' }]}>
                <Ionicons name="add-circle-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.menuText}>Add to playlist</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Playlist Select Modal */}
      <Modal visible={isPlaylistSelectVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.playlistSelectBox}>
            <View style={styles.playlistSelectHeader}>
              <Ionicons name="musical-notes" size={24} color="#BB86FC" />
              <Text style={styles.playlistSelectTitle}>Select Playlist</Text>
            </View>
            <View style={styles.menuDivider} />
            {(userPlaylists || []).map(p => (
              <TouchableOpacity key={p.id} style={styles.playlistSelectItem} onPress={() => handleAddToPlaylist(p.id)}>
                <View style={[styles.menuIconBg, { backgroundColor: 'rgba(138,43,226,0.15)' }]}>
                  <Ionicons name="musical-notes" size={18} color="#BB86FC" />
                </View>
                <Text style={styles.menuText}>{p.name}</Text>
                <Ionicons name="chevron-forward" size={18} color="#444" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setPlaylistSelectVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Slide-in Profile Drawer */}
      {isDrawerOpen && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View 
            style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View 
            style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}
          >
            <SafeAreaView style={styles.drawerInner}>
              {/* Profile header */}
              <View style={styles.drawerProfileSection}>
                <View style={styles.drawerProfileCircle}>
                  <Text style={styles.drawerProfileInitial}>{user?.name?.[0] || 'U'}</Text>
                </View>
                <Text style={styles.drawerProfileName}>{user?.name || 'User'}</Text>
                <Text style={styles.drawerProfileEmail}>{user?.email || ''}</Text>
              </View>

              <View style={styles.drawerDivider} />

              {/* Menu items */}
              <TouchableOpacity style={styles.drawerItem} onPress={() => { closeDrawer(); }}>
                <Ionicons name="sparkles-outline" size={22} color="#BB86FC" />
                <Text style={styles.drawerItemText}>What's New</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => { closeDrawer(); }}>
                <Ionicons name="time-outline" size={22} color="#fff" />
                <Text style={styles.drawerItemText}>Recents</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => { closeDrawer(); navigation.navigate('Settings'); }}>
                <Ionicons name="settings-outline" size={22} color="#fff" />
                <Text style={styles.drawerItemText}>Settings</Text>
              </TouchableOpacity>

              <View style={styles.drawerDivider} />

              <TouchableOpacity style={styles.drawerItem} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={22} color="#ff4444" />
                <Text style={[styles.drawerItemText, { color: '#ff4444' }]}>Log out</Text>
              </TouchableOpacity>

              {/* App branding at bottom */}
              <View style={styles.drawerFooter}>
                <Text style={styles.drawerFooterText}>Photify v1.0.0</Text>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      )}

      {/* Notifications Modal */}
      <Modal visible={isNotifModalVisible} transparent animationType="slide">
        <View style={styles.notifModalOverlay}>
          <View style={styles.notifModal}>
            <View style={styles.notifModalHeader}>
              <Text style={styles.notifModalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {notifications.length > 0 && (
              <TouchableOpacity style={styles.clearNotifBtn} onPress={() => { clearNotifications(); }}>
                <Text style={styles.clearNotifText}>Clear all</Text>
              </TouchableOpacity>
            )}
            <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotif}>
                  <Ionicons name="notifications-off-outline" size={48} color="#333" />
                  <Text style={styles.emptyNotifText}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map(notif => (
                  <View key={notif.id} style={styles.notifItem}>
                    <View style={[styles.notifIconBg, { backgroundColor: `${getNotifColor(notif.type)}20` }]}>
                      <Ionicons name={getNotifIcon(notif.type)} size={18} color={getNotifColor(notif.type)} />
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={styles.notifMessage} numberOfLines={2}>{notif.message}</Text>
                      <Text style={styles.notifTime}>{notif.time}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sleep Timer Modal */}
      <Modal visible={isSleepTimerVisible} transparent animationType="fade">
        <View style={styles.timerModalOverlay}>
          <View style={styles.timerModal}>
            <View style={styles.timerHandle} />
            <Text style={styles.timerTitle}>Sleep Timer</Text>
            <Text style={styles.timerSubtitle}>
              {sleepTimerEnd 
                ? `Timer active: ${formatTimerRemaining(timerRemaining)} remaining` 
                : 'Stop playing music after a set time'}
            </Text>
            
            {[
              { label: '5 minutes', value: 5 },
              { label: '10 minutes', value: 10 },
              { label: '15 minutes', value: 15 },
              { label: '30 minutes', value: 30 },
              { label: '45 minutes', value: 45 },
              { label: '1 hour', value: 60 },
            ].map(option => (
              <TouchableOpacity 
                key={option.value} 
                style={styles.timerOption}
                onPress={() => handleSetTimer(option.value)}
              >
                <Ionicons name="time-outline" size={20} color="#BB86FC" />
                <Text style={styles.timerOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.customTimerContainer}>
              <TextInput
                style={styles.customTimerInput}
                value={customMinutes}
                onChangeText={setCustomMinutes}
                placeholder="Custom minutes (e.g., 2)"
                placeholderTextColor="#555"
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.customTimerBtn}
                onPress={() => {
                  const mins = parseInt(customMinutes);
                  if (mins && mins > 0) {
                    handleSetTimer(mins);
                    setCustomMinutes('');
                  } else {
                    Alert.alert("Invalid Input", "Please enter a valid number of minutes.");
                  }
                }}
              >
                <Text style={styles.customTimerBtnText}>Set</Text>
              </TouchableOpacity>
            </View>

            {sleepTimerEnd && (
              <TouchableOpacity 
                style={[styles.timerOption, styles.cancelTimerOption]}
                onPress={() => { cancelSleepTimer(); setSleepTimerVisible(false); }}
              >
                <Ionicons name="close-circle" size={20} color="#ff4444" />
                <Text style={[styles.timerOptionText, { color: '#ff4444' }]}>Cancel Timer</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.timerCloseBtn} onPress={() => setSleepTimerVisible(false)}>
              <Text style={styles.timerCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* All Artists Modal */}
      <Modal visible={isAllArtistsVisible} transparent animationType="slide">
        <View style={styles.allArtistsOverlay}>
          <View style={styles.allArtistsModal}>
            <View style={styles.allArtistsHeader}>
              <Text style={styles.allArtistsTitle}>All Artists</Text>
              <TouchableOpacity onPress={() => setAllArtistsVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.allArtistsGrid}>
              {POPULAR_ARTISTS.map((artist, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.allArtistGridItem} 
                  onPress={() => { setAllArtistsVisible(false); openArtistPlaylist(artist.name); }}
                >
                  <View style={[styles.allArtistImageBorder, { borderColor: artist.color }]}>
                    {ARTIST_IMAGES[artist.name] ? (
                      <Image source={ARTIST_IMAGES[artist.name]} style={styles.allArtistPhoto} />
                    ) : (
                      <View style={[styles.allArtistCircle, { backgroundColor: artist.color }]}>
                        <Text style={styles.allArtistInitials}>{artist.initials}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.allArtistName} numberOfLines={2}>{artist.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#8A2BE2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginLeft: 16,
  },
  notifBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#8A2BE2',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  timerBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#FFA726',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  timerBadgeText: {
    color: '#000',
    fontSize: 8,
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  gridItem: {
    width: '48.5%',
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  gridImgPlaceholder: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  gridImgNumber: {
    color: '#8A2BE2',
    fontSize: 24,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  playlistIconBg: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    padding: 2,
  },
  gridTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
    paddingRight: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  showAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#282828',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  artistScroll: {
    marginBottom: 30,
  },
  artistItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  artistImageBorder: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  artistPhoto: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  artistImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistInitials: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  artistName: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  // All Artists Modal
  allArtistsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'flex-end',
  },
  allArtistsModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  allArtistsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  allArtistsTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  allArtistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  allArtistGridItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 24,
  },
  allArtistImageBorder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  allArtistPhoto: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  allArtistCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allArtistInitials: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  allArtistName: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: 2,
  },
  trackInfo: {
    marginLeft: 12,
    flex: 1,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 2,
  },
  trackArtist: {
    color: '#b3b3b3',
    fontSize: 13,
  },
  trackDots: {
    color: '#b3b3b3',
    fontSize: 20,
    paddingHorizontal: 10,
  },
  dotsBtn: {
    padding: 10,
  },
  bottomMenu: {
    backgroundColor: '#1e1e1e',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    marginBottom: 16,
  },
  menuTrackCover: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginBottom: 12,
  },
  menuSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  menuDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 12,
  },
  menuIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  playlistSelectBox: {
    backgroundColor: '#1e1e1e',
    width: '85%',
    borderRadius: 20,
    padding: 24,
    maxHeight: '60%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  playlistSelectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  playlistSelectTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  playlistSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  menuTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  closeBtn: {
    marginTop: 16,
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  closeBtnText: {
    color: '#b3b3b3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Slide-in drawer styles
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 998,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#1a1a1a',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 30,
  },
  drawerInner: {
    flex: 1,
    paddingTop: 20,
  },
  drawerProfileSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 20,
  },
  drawerProfileCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8A2BE2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  drawerProfileInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 28,
  },
  drawerProfileName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  drawerProfileEmail: {
    color: '#888',
    fontSize: 13,
    marginTop: 3,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 24,
    marginVertical: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  drawerItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
  drawerFooter: {
    position: 'absolute',
    bottom: 30,
    left: 24,
  },
  drawerFooterText: {
    color: '#444',
    fontSize: 12,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: 14,
    height: 14,
  },
  bar: {
    width: 3,
    backgroundColor: '#1DB954',
    borderRadius: 1,
  },
  // Notification modal
  notifModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  notifModal: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    padding: 20,
    paddingBottom: 40,
  },
  notifModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notifModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  clearNotifBtn: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  clearNotifText: {
    color: '#8A2BE2',
    fontSize: 13,
    fontWeight: '600',
  },
  notifList: {
    flex: 1,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  notifIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    color: '#fff',
    fontSize: 14,
  },
  notifTime: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  emptyNotif: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyNotifText: {
    color: '#555',
    fontSize: 14,
    marginTop: 12,
  },
  // Sleep Timer modal
  timerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerModal: {
    backgroundColor: '#1e1e1e',
    width: '85%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  timerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#555',
    borderRadius: 2,
    marginBottom: 16,
  },
  timerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  timerSubtitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  timerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#282828',
    marginBottom: 8,
  },
  cancelTimerOption: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    marginTop: 8,
  },
  timerOptionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  timerCloseBtn: {
    marginTop: 16,
    padding: 10,
  },
  timerCloseBtnText: {
    color: '#8A2BE2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
    marginTop: 8,
  },
  customTimerInput: {
    flex: 1,
    backgroundColor: '#282828',
    color: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  customTimerBtn: {
    backgroundColor: '#8A2BE2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customTimerBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
