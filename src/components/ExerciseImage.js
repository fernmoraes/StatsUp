// Mídia do exercício: GIF demonstrativo do WorkoutX (animado, empacotado localmente)
// com fallback para o pictograma vetorial (ExerciseFigure) quando não há GIF.
import React, { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import ExerciseFigure from './ExerciseFigure';
import { getExerciseGif } from '../data/exerciseMedia';
import { getExercise } from '../data/exercises';
import { colors, groupColor, hexA } from '../theme';

export default function ExerciseImage({ exerciseId, size = 56, radius, color, light, style }) {
  const [err, setErr] = useState(false);
  const ex = exerciseId ? getExercise(exerciseId) : null;
  const accent = color || (ex ? groupColor[ex.muscle_group] : colors.primary);
  const gif = getExerciseGif(exerciseId);
  const showGif = gif && !err;
  const r = radius != null ? radius : Math.round(size * 0.27);

  const onWhite = showGif || light;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: onWhite ? '#FFFFFF' : hexA(accent, 0.12),
          borderWidth: 1,
          borderColor: onWhite ? 'rgba(255,255,255,0.18)' : hexA(accent, 0.22),
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {showGif ? (
        <Image
          source={gif}
          style={{ width: '94%', height: '94%' }}
          contentFit="contain"
          transition={200}
          onError={() => setErr(true)}
        />
      ) : (
        <ExerciseFigure exerciseId={exerciseId} size={Math.round(size * 0.88)} color={accent} />
      )}
    </View>
  );
}
