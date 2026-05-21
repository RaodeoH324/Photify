import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const QueueToast = ({ visible, message, onHide, onPress }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide && onHide();
        });
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity 
        style={styles.inner} 
        activeOpacity={0.8}
        onPress={() => {
          onPress && onPress();
          onHide && onHide();
        }}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.text} numberOfLines={1}>
            {message || 'Added to queue'}
          </Text>
          <Text style={styles.tapHint}>Tap to view queue</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
        <View style={styles.glowAccent} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a0a2e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.5)',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(138, 43, 226, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tapHint: {
    color: 'rgba(187,134,252,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  glowAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#8A2BE2',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
});

export default QueueToast;
