import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { AudioContext } from '../AudioContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const { width } = Dimensions.get('window');

export default function MiniPlayer() {
  const { 
    currentTrack, isPlaying, togglePlay, position, duration, 
    nextTrack, prevTrack, seek, getTrackColor, isFullPlayerVisible 
  } = useContext(AudioContext);

  const navigation = useNavigation();

  if (!currentTrack || isFullPlayerVisible) return null;

  const bgColor = getTrackColor(currentTrack);

  return (
    <View style={styles.outerContainer}>
      <TouchableOpacity 
        style={[styles.container, { backgroundColor: bgColor }]} 
        activeOpacity={0.9} 
        onPress={() => navigation.navigate('Player')}
      >
        <View style={styles.content}>
          <Image 
            source={currentTrack.coverUrl ? { uri: currentTrack.coverUrl } : require('../../assets/icon.png')} 
            style={styles.cover}
          />

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlBtn} onPress={prevTrack}>
              <Ionicons name="play-skip-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={nextTrack}>
              <Ionicons name="play-skip-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={position}
          onSlidingComplete={seek}
          minimumTrackTintColor="#fff"
          maximumTrackTintColor="rgba(255,255,255,0.3)"
          thumbTintColor="#fff"
        />

      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 65, // Just above the Tab Bar (60 height + padding)
    width: width,
    zIndex: 100,
    paddingHorizontal: 8,
  },
  container: {
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    flex: 1,
  },
  cover: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  artist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlBtn: {
    marginLeft: 15,
  },
  playBtn: {
    marginLeft: 10,
  },
  slider: {
    height: 2,
    marginTop: -2,
    width: '100%',
  }
});

