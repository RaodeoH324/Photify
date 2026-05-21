import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SWIPE_THRESHOLD = 80;
const { width } = Dimensions.get('window');

const SwipeableRow = ({ children, onSwipeRight }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes (right direction)
        return gestureState.dx > 10 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
          // Animate background opacity based on swipe distance
          const progress = Math.min(gestureState.dx / SWIPE_THRESHOLD, 1);
          bgOpacity.setValue(progress);
          iconScale.setValue(0.5 + progress * 0.5);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= SWIPE_THRESHOLD) {
          // Threshold reached — trigger add to queue
          Animated.timing(translateX, {
            toValue: width * 0.3,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            onSwipeRight && onSwipeRight();
            // Snap back
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 40,
              friction: 8,
            }).start();
            bgOpacity.setValue(0);
            iconScale.setValue(0.5);
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 8,
          }).start();
          Animated.timing(bgOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
          Animated.timing(iconScale, {
            toValue: 0.5,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        bgOpacity.setValue(0);
        iconScale.setValue(0.5);
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      {/* Purple background revealed on swipe */}
      <Animated.View style={[styles.swipeBackground, { opacity: bgOpacity }]}>
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale: iconScale }] }]}>
          <Ionicons name="add-circle" size={28} color="#fff" />
          <Text style={styles.swipeText}>Queue</Text>
        </Animated.View>
      </Animated.View>

      {/* Foreground content */}
      <Animated.View
        style={[styles.foreground, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#6A1B9A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    borderRadius: 8,
    backgroundGradient: 'linear-gradient(90deg, #8A2BE2, #6A1B9A)',
  },
  iconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  foreground: {
    backgroundColor: 'transparent',
  },
});

export default SwipeableRow;
