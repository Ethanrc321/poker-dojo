import React, { useState, useRef, useCallback } from 'react';
import {
  View, Pressable, TouchableWithoutFeedback,
  StyleSheet, Dimensions, Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AcesIcon from './AcesIcon.js';
import { C, Colors } from '../theme.js';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const ITEM_COUNT  = 8;
const ARC_RADIUS  = 140;
const TRIGGER_D   = 64;
const TRIGGER_R   = TRIGGER_D / 2;
const ITEM_SIZE   = 52;
const ITEM_WRAP_W = ITEM_SIZE;
const BOTTOM_PAD  = 24;

function polar(deg, r) {
  const rad = (deg * Math.PI) / 180;
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}

function buildArcPositions() {
  return Array.from({ length: ITEM_COUNT }, (_, i) => {
    const deg = 180 + (i * 180) / (ITEM_COUNT - 1);
    const { x, y } = polar(deg, ARC_RADIUS);
    return { tx: x, ty: y };
  });
}

const ARC_POSITIONS = buildArcPositions();

export default function SpadeMenu({ tabs, currentScreen, onNavigate }) {
  const insets  = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  const cx = SCREEN_W / 2;
  const cy = SCREEN_H - insets.bottom - TRIGGER_R - BOTTOM_PAD;

  const itemAnims   = useRef(Array.from({ length: ITEM_COUNT }, () => new Animated.Value(0))).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(1)).current;

  const open = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(rotateAnim,  { toValue: 1, duration: 280, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.stagger(35,
        itemAnims.map(a => Animated.spring(a, { toValue: 1, tension: 90, friction: 9, useNativeDriver: true }))
      ),
    ]).start();
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(rotateAnim,  { toValue: 0, duration: 220, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      Animated.stagger(25,
        [...itemAnims].reverse().map(a =>
          Animated.timing(a, { toValue: 0, duration: 160, easing: Easing.in(Easing.ease), useNativeDriver: true })
        )
      ),
    ]).start();
  }, []);

  const onTriggerPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 70, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
    ]).start();
    isOpen ? close() : open();
  }, [isOpen, open, close]);

  const triggerRotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={styles.root} pointerEvents="box-none">

      {/* ── Blur overlay ────────────────────────────────────────────────── */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: overlayAnim }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <TouchableWithoutFeedback onPress={close} accessibilityLabel="Close menu" accessibilityRole="button">
          <BlurView style={StyleSheet.absoluteFill} intensity={50} tint="dark" />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* ── Arc items ───────────────────────────────────────────────────── */}
      {ARC_POSITIONS.map((pos, i) => {
        const tab      = tabs[i];
        if (!tab) return null;
        const anim     = itemAnims[i];
        const isActive = currentScreen === tab.id;

        const txAnim = anim.interpolate({ inputRange: [0, 1], outputRange: [0, pos.tx] });
        const tyAnim = anim.interpolate({ inputRange: [0, 1], outputRange: [0, pos.ty] });

        return (
          <Animated.View
            key={tab.id}
            pointerEvents={isOpen ? 'box-none' : 'none'}
            style={[
              styles.arcWrap,
              {
                left: cx - ITEM_WRAP_W / 2,
                top:  cy - ITEM_SIZE / 2,
                opacity: anim,
                transform: [{ translateX: txAnim }, { translateY: tyAnim }, { scale: anim }],
              },
            ]}
          >
            <Pressable
              onPress={() => { onNavigate(tab.id); close(); }}
              style={[styles.arcCircle, isActive && styles.arcCircleActive]}
              accessibilityLabel={tab.label}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {tab.id === 'Preflop' ? (
                <AcesIcon
                  size={26}
                  color={isActive ? '#050a07' : '#fff'}
                  bgColor={isActive ? C.green : 'rgba(25,25,25,0.95)'}
                />
              ) : (
                <Ionicons name={tab.icon} size={26} color={isActive ? '#050a07' : '#fff'} />
              )}
            </Pressable>
          </Animated.View>
        );
      })}

      {/* ── Trigger button ──────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.triggerWrap,
          {
            left: cx - TRIGGER_R,
            top:  cy - TRIGGER_R,
            transform: [{ rotate: triggerRotate }, { scale: scaleAnim }],
          },
        ]}
      >
        <Pressable
          onPress={onTriggerPress}
          style={styles.trigger}
          accessibilityLabel={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="cards-spade" size={30} color="#fff" />
        </Pressable>

      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },

  arcWrap: {
    position: 'absolute',
    width: ITEM_WRAP_W,
    alignItems: 'center',
  },

  arcCircle: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  arcCircleActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },

  triggerWrap: {
    position: 'absolute',
    width: TRIGGER_D,
    height: TRIGGER_D,
  },
  trigger: {
    width: TRIGGER_D,
    height: TRIGGER_D,
    borderRadius: TRIGGER_R,
    backgroundColor: Colors.bg1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },

  activeDot: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
  },
});
