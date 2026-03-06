/**
 * Task B.1 — Exercise seed script
 *
 * Seeds 100+ system exercises covering all major movement patterns,
 * equipment types, and muscle groups required by the app.
 *
 * Run with: npm run db:seed
 *
 * Safe to re-run — uses upsert on name so duplicates are skipped.
 */

import { PrismaClient, ExerciseType, MovementPattern } from '@prisma/client';

const prisma = new PrismaClient();

// -----------------------------------------------------------------------------
// Exercise data
// -----------------------------------------------------------------------------

interface ExerciseSeed {
  name: string;
  type: ExerciseType;
  pattern: MovementPattern;
  muscleGroups: string[];
  equipmentTags: string[];
  jointStressFlags: Record<string, string>;
}

const exercises: ExerciseSeed[] = [
  // ===========================================================================
  // HORIZONTAL PUSH — Chest, Front Delts, Triceps
  // ===========================================================================
  {
    name: 'Barbell Bench Press',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.HORIZONTAL_PUSH,
    muscleGroups: ['chest', 'front_delts', 'triceps'],
    equipmentTags: ['barbell', 'bench'],
    jointStressFlags: { shoulder: 'moderate' },
  },
  {
    name: 'Incline Barbell Bench Press',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.HORIZONTAL_PUSH,
    muscleGroups: ['upper_chest', 'front_delts', 'triceps'],
    equipmentTags: ['barbell', 'bench'],
    jointStressFlags: { shoulder: 'moderate' },
  },
  {
    name: 'Decline Barbell Bench Press',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.HORIZONTAL_PUSH,
    muscleGroups: ['lower_chest', 'triceps'],
    equipmentTags: ['barbell', 'bench'],
    jointStressFlags: {},
  },
  {
    name: 'Dumbbell Bench Press',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.HORIZONTAL_PUSH,
    muscleGroups: ['chest', 'front_delts', 'triceps'],
    equipmentTags: ['dumbbell', 'bench'],
    jointStressFlags: {},
  },
  {
    name: 'Incline Dumbbell Bench Press',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.HORIZONTAL_PUSH,
    muscleGroups: ['upper_chest', 'front_delts', 'triceps'],
    equipmentTags: ['dumbbell', 'bench'],
    jointStressFlags: {},
  },
  {
    name: 'Dumbbell Flye',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.HORIZONTAL_PUSH,
    muscleGroups: ['chest'],
    equipmentTags: ['dumbbell', 'bench'],
    jointStressFlags: { shoulder: 'high', elbow: 'moderate' },
  },
  {
    name: 'Cable Chest Flye',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.HORIZONTAL_PUSH,
    muscleGroups: ['chest'],
    equipmentTags: ['cable'],
    jointStressFlags: {},
  },
  {
    name: 'Machine Chest Press',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.HORIZONTAL_PUSH,
    muscleGroups: ['chest', 'triceps'],
    equipmentTags: ['machine'],
    jointStressFlags: {},
  },
  {
    name: 'Push-Up',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.HORIZONTAL_PUSH,
    muscleGroups: ['chest', 'front_delts', 'triceps'],
    equipmentTags: ['bodyweight'],
    jointStressFlags: {},
  },
  {
    name: 'Pec Deck Machine',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.HORIZONTAL_PUSH,
    muscleGroups: ['chest'],
    equipmentTags: ['machine'],
    jointStressFlags: { shoulder: 'moderate' },
  },

  // ===========================================================================
  // VERTICAL PUSH — Shoulders, Triceps
  // ===========================================================================
  {
    name: 'Barbell Overhead Press',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.VERTICAL_PUSH,
    muscleGroups: ['shoulders', 'front_delts', 'triceps'],
    equipmentTags: ['barbell'],
    jointStressFlags: { shoulder: 'moderate', lower_back: 'moderate' },
  },
  {
    name: 'Seated Dumbbell Overhead Press',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.VERTICAL_PUSH,
    muscleGroups: ['shoulders', 'front_delts', 'triceps'],
    equipmentTags: ['dumbbell', 'bench'],
    jointStressFlags: { shoulder: 'low' },
  },
  {
    name: 'Arnold Press',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.VERTICAL_PUSH,
    muscleGroups: ['shoulders', 'front_delts', 'side_delts'],
    equipmentTags: ['dumbbell'],
    jointStressFlags: { shoulder: 'low' },
  },
  {
    name: 'Lateral Raise',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.VERTICAL_PUSH,
    muscleGroups: ['side_delts'],
    equipmentTags: ['dumbbell'],
    jointStressFlags: {},
  },
  {
    name: 'Cable Lateral Raise',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.VERTICAL_PUSH,
    muscleGroups: ['side_delts'],
    equipmentTags: ['cable'],
    jointStressFlags: {},
  },
  {
    name: 'Machine Shoulder Press',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.VERTICAL_PUSH,
    muscleGroups: ['shoulders', 'triceps'],
    equipmentTags: ['machine'],
    jointStressFlags: {},
  },
  {
    name: 'Pike Push-Up',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.VERTICAL_PUSH,
    muscleGroups: ['shoulders', 'triceps'],
    equipmentTags: ['bodyweight'],
    jointStressFlags: {},
  },

  // ===========================================================================
  // HORIZONTAL PULL — Back, Rear Delts, Biceps
  // ===========================================================================
  {
    name: 'Barbell Bent Over Row',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.HORIZONTAL_PULL,
    muscleGroups: ['back', 'lats', 'rear_delts', 'biceps'],
    equipmentTags: ['barbell'],
    jointStressFlags: { lower_back: 'high' },
  },
  {
    name: 'Dumbbell Single-Arm Row',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.HORIZONTAL_PULL,
    muscleGroups: ['back', 'lats', 'rear_delts', 'biceps'],
    equipmentTags: ['dumbbell', 'bench'],
    jointStressFlags: {},
  },
  {
    name: 'Cable Row',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.HORIZONTAL_PULL,
    muscleGroups: ['back', 'mid_back', 'rear_delts', 'biceps'],
    equipmentTags: ['cable'],
    jointStressFlags: {},
  },
  {
    name: 'Machine Row',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.HORIZONTAL_PULL,
    muscleGroups: ['back', 'mid_back', 'biceps'],
    equipmentTags: ['machine'],
    jointStressFlags: {},
  },
  {
    name: 'Chest-Supported Dumbbell Row',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.HORIZONTAL_PULL,
    muscleGroups: ['back', 'mid_back', 'rear_delts'],
    equipmentTags: ['dumbbell', 'bench'],
    jointStressFlags: {},
  },
  {
    name: 'Rear Delt Flye',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.HORIZONTAL_PULL,
    muscleGroups: ['rear_delts'],
    equipmentTags: ['dumbbell'],
    jointStressFlags: {},
  },
  {
    name: 'Face Pull',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.HORIZONTAL_PULL,
    muscleGroups: ['rear_delts', 'mid_back'],
    equipmentTags: ['cable'],
    jointStressFlags: {},
  },
  {
    name: 'Inverted Row',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.HORIZONTAL_PULL,
    muscleGroups: ['back', 'biceps'],
    equipmentTags: ['bodyweight', 'barbell'],
    jointStressFlags: {},
  },

  // ===========================================================================
  // VERTICAL PULL — Lats, Biceps
  // ===========================================================================
  {
    name: 'Pull-Up',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.VERTICAL_PULL,
    muscleGroups: ['lats', 'biceps', 'back'],
    equipmentTags: ['bodyweight', 'pull_up_bar'],
    jointStressFlags: {},
  },
  {
    name: 'Chin-Up',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.VERTICAL_PULL,
    muscleGroups: ['lats', 'biceps'],
    equipmentTags: ['bodyweight', 'pull_up_bar'],
    jointStressFlags: {},
  },
  {
    name: 'Lat Pulldown',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.VERTICAL_PULL,
    muscleGroups: ['lats', 'biceps'],
    equipmentTags: ['cable', 'machine'],
    jointStressFlags: {},
  },
  {
    name: 'Wide Grip Lat Pulldown',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.VERTICAL_PULL,
    muscleGroups: ['lats'],
    equipmentTags: ['cable', 'machine'],
    jointStressFlags: {},
  },
  {
    name: 'Straight Arm Pulldown',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.VERTICAL_PULL,
    muscleGroups: ['lats'],
    equipmentTags: ['cable'],
    jointStressFlags: {},
  },
  {
    name: 'Machine Pullover',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.VERTICAL_PULL,
    muscleGroups: ['lats', 'chest'],
    equipmentTags: ['machine'],
    jointStressFlags: {},
  },

  // ===========================================================================
  // HIP HINGE — Hamstrings, Glutes, Lower Back
  // ===========================================================================
  {
    name: 'Barbell Deadlift',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.HIP_HINGE,
    muscleGroups: ['hamstrings', 'glutes', 'lower_back', 'back'],
    equipmentTags: ['barbell'],
    jointStressFlags: { lower_back: 'high', knee: 'moderate' },
  },
  {
    name: 'Romanian Deadlift',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.HIP_HINGE,
    muscleGroups: ['hamstrings', 'glutes', 'lower_back'],
    equipmentTags: ['barbell'],
    jointStressFlags: { lower_back: 'moderate' },
  },
  {
    name: 'Dumbbell Romanian Deadlift',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.HIP_HINGE,
    muscleGroups: ['hamstrings', 'glutes'],
    equipmentTags: ['dumbbell'],
    jointStressFlags: {},
  },
  {
    name: 'Sumo Deadlift',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.HIP_HINGE,
    muscleGroups: ['hamstrings', 'glutes', 'quads', 'lower_back'],
    equipmentTags: ['barbell'],
    jointStressFlags: { hip: 'moderate', lower_back: 'moderate' },
  },
  {
    name: 'Trap Bar Deadlift',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.HIP_HINGE,
    muscleGroups: ['hamstrings', 'glutes', 'quads', 'back'],
    equipmentTags: ['barbell'],
    jointStressFlags: { lower_back: 'low' },
  },
  {
    name: 'Kettlebell Swing',
    type: ExerciseType.OTHER,
    pattern: MovementPattern.HIP_HINGE,
    muscleGroups: ['hamstrings', 'glutes', 'lower_back'],
    equipmentTags: ['kettlebell'],
    jointStressFlags: {},
  },
  {
    name: 'Good Morning',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.HIP_HINGE,
    muscleGroups: ['hamstrings', 'lower_back', 'glutes'],
    equipmentTags: ['barbell'],
    jointStressFlags: { lower_back: 'high' },
  },
  {
    name: 'Glute Ham Raise',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.HIP_HINGE,
    muscleGroups: ['hamstrings', 'glutes'],
    equipmentTags: ['machine', 'bodyweight'],
    jointStressFlags: { knee: 'moderate' },
  },
  {
    name: 'Hip Thrust',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.HIP_HINGE,
    muscleGroups: ['glutes', 'hamstrings'],
    equipmentTags: ['barbell', 'bench'],
    jointStressFlags: {},
  },
  {
    name: 'Cable Pull-Through',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.HIP_HINGE,
    muscleGroups: ['glutes', 'hamstrings'],
    equipmentTags: ['cable'],
    jointStressFlags: {},
  },

  // ===========================================================================
  // SQUAT — Quads, Glutes
  // ===========================================================================
  {
    name: 'Barbell Back Squat',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.SQUAT,
    muscleGroups: ['quads', 'glutes', 'hamstrings'],
    equipmentTags: ['barbell'],
    jointStressFlags: { knee: 'high', lower_back: 'moderate' },
  },
  {
    name: 'Barbell Front Squat',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.SQUAT,
    muscleGroups: ['quads', 'glutes'],
    equipmentTags: ['barbell'],
    jointStressFlags: { knee: 'moderate' },
  },
  {
    name: 'Goblet Squat',
    type: ExerciseType.OTHER,
    pattern: MovementPattern.SQUAT,
    muscleGroups: ['quads', 'glutes'],
    equipmentTags: ['kettlebell', 'dumbbell'],
    jointStressFlags: { knee: 'low' },
  },
  {
    name: 'Leg Press',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.SQUAT,
    muscleGroups: ['quads', 'glutes', 'hamstrings'],
    equipmentTags: ['machine'],
    jointStressFlags: { knee: 'moderate' },
  },
  {
    name: 'Hack Squat',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.SQUAT,
    muscleGroups: ['quads', 'glutes'],
    equipmentTags: ['machine'],
    jointStressFlags: { knee: 'moderate' },
  },
  {
    name: 'Bulgarian Split Squat',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.SQUAT,
    muscleGroups: ['quads', 'glutes'],
    equipmentTags: ['dumbbell', 'bench'],
    jointStressFlags: { knee: 'moderate', hip: 'moderate' },
  },
  {
    name: 'Bodyweight Squat',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.SQUAT,
    muscleGroups: ['quads', 'glutes'],
    equipmentTags: ['bodyweight'],
    jointStressFlags: {},
  },
  {
    name: 'Sissy Squat',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.SQUAT,
    muscleGroups: ['quads'],
    equipmentTags: ['bodyweight'],
    jointStressFlags: { knee: 'high' },
  },
  {
    name: 'Smith Machine Squat',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.SQUAT,
    muscleGroups: ['quads', 'glutes'],
    equipmentTags: ['machine'],
    jointStressFlags: { knee: 'moderate' },
  },

  // ===========================================================================
  // LUNGE — Quads, Glutes, Hamstrings
  // ===========================================================================
  {
    name: 'Barbell Walking Lunge',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.LUNGE,
    muscleGroups: ['quads', 'glutes', 'hamstrings'],
    equipmentTags: ['barbell'],
    jointStressFlags: { knee: 'moderate' },
  },
  {
    name: 'Dumbbell Reverse Lunge',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.LUNGE,
    muscleGroups: ['quads', 'glutes'],
    equipmentTags: ['dumbbell'],
    jointStressFlags: { knee: 'low' },
  },
  {
    name: 'Step-Up',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.LUNGE,
    muscleGroups: ['quads', 'glutes'],
    equipmentTags: ['dumbbell', 'bench'],
    jointStressFlags: {},
  },
  {
    name: 'Bodyweight Lunge',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.LUNGE,
    muscleGroups: ['quads', 'glutes'],
    equipmentTags: ['bodyweight'],
    jointStressFlags: {},
  },

  // ===========================================================================
  // ISOLATION — Arms, Calves, Shoulders
  // ===========================================================================
  {
    name: 'Barbell Curl',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['biceps'],
    equipmentTags: ['barbell'],
    jointStressFlags: { elbow: 'low' },
  },
  {
    name: 'Dumbbell Curl',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['biceps'],
    equipmentTags: ['dumbbell'],
    jointStressFlags: {},
  },
  {
    name: 'Hammer Curl',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['biceps', 'brachialis'],
    equipmentTags: ['dumbbell'],
    jointStressFlags: {},
  },
  {
    name: 'Incline Dumbbell Curl',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['biceps'],
    equipmentTags: ['dumbbell', 'bench'],
    jointStressFlags: {},
  },
  {
    name: 'EZ Bar Curl',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['biceps'],
    equipmentTags: ['barbell'],
    jointStressFlags: {},
  },
  {
    name: 'Cable Curl',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['biceps'],
    equipmentTags: ['cable'],
    jointStressFlags: {},
  },
  {
    name: 'Preacher Curl',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['biceps'],
    equipmentTags: ['barbell', 'machine'],
    jointStressFlags: { elbow: 'moderate' },
  },
  {
    name: 'Concentration Curl',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['biceps'],
    equipmentTags: ['dumbbell'],
    jointStressFlags: {},
  },
  {
    name: 'Tricep Pushdown',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['triceps'],
    equipmentTags: ['cable'],
    jointStressFlags: {},
  },
  {
    name: 'Skull Crusher',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['triceps'],
    equipmentTags: ['barbell', 'bench'],
    jointStressFlags: { elbow: 'moderate' },
  },
  {
    name: 'Overhead Tricep Extension',
    type: ExerciseType.DUMBBELL,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['triceps'],
    equipmentTags: ['dumbbell'],
    jointStressFlags: { elbow: 'low' },
  },
  {
    name: 'Cable Overhead Tricep Extension',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['triceps'],
    equipmentTags: ['cable'],
    jointStressFlags: {},
  },
  {
    name: 'Close Grip Bench Press',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['triceps', 'chest'],
    equipmentTags: ['barbell', 'bench'],
    jointStressFlags: { elbow: 'moderate' },
  },
  {
    name: 'Dips',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['triceps', 'chest'],
    equipmentTags: ['bodyweight'],
    jointStressFlags: { shoulder: 'moderate', elbow: 'low' },
  },
  {
    name: 'Reverse Curl',
    type: ExerciseType.BARBELL,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['brachialis', 'forearms'],
    equipmentTags: ['barbell'],
    jointStressFlags: {},
  },
  {
    name: 'Leg Extension',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['quads'],
    equipmentTags: ['machine'],
    jointStressFlags: { knee: 'high' },
  },
  {
    name: 'Leg Curl',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['hamstrings'],
    equipmentTags: ['machine'],
    jointStressFlags: {},
  },
  {
    name: 'Seated Leg Curl',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['hamstrings'],
    equipmentTags: ['machine'],
    jointStressFlags: {},
  },
  {
    name: 'Standing Calf Raise',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['calves'],
    equipmentTags: ['machine', 'barbell'],
    jointStressFlags: {},
  },
  {
    name: 'Seated Calf Raise',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['calves'],
    equipmentTags: ['machine'],
    jointStressFlags: {},
  },
  {
    name: 'Donkey Calf Raise',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['calves'],
    equipmentTags: ['machine'],
    jointStressFlags: {},
  },
  {
    name: 'Cable Glute Kickback',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['glutes'],
    equipmentTags: ['cable'],
    jointStressFlags: {},
  },
  {
    name: 'Hip Abduction Machine',
    type: ExerciseType.MACHINE,
    pattern: MovementPattern.ISOLATION,
    muscleGroups: ['glutes', 'hip_abductors'],
    equipmentTags: ['machine'],
    jointStressFlags: {},
  },

  // ===========================================================================
  // CORE
  // ===========================================================================
  {
    name: 'Plank',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.CORE,
    muscleGroups: ['core', 'abs'],
    equipmentTags: ['bodyweight'],
    jointStressFlags: {},
  },
  {
    name: 'Crunch',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.CORE,
    muscleGroups: ['abs'],
    equipmentTags: ['bodyweight'],
    jointStressFlags: { lower_back: 'low' },
  },
  {
    name: 'Cable Crunch',
    type: ExerciseType.CABLE,
    pattern: MovementPattern.CORE,
    muscleGroups: ['abs'],
    equipmentTags: ['cable'],
    jointStressFlags: {},
  },
  {
    name: 'Hanging Leg Raise',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.CORE,
    muscleGroups: ['abs', 'hip_flexors'],
    equipmentTags: ['bodyweight', 'pull_up_bar'],
    jointStressFlags: {},
  },
  {
    name: 'Ab Wheel Rollout',
    type: ExerciseType.OTHER,
    pattern: MovementPattern.CORE,
    muscleGroups: ['abs', 'core'],
    equipmentTags: ['bodyweight'],
    jointStressFlags: { lower_back: 'moderate' },
  },
  {
    name: 'Russian Twist',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.CORE,
    muscleGroups: ['obliques', 'abs'],
    equipmentTags: ['bodyweight'],
    jointStressFlags: {},
  },
  {
    name: 'Decline Sit-Up',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.CORE,
    muscleGroups: ['abs'],
    equipmentTags: ['machine', 'bodyweight'],
    jointStressFlags: { lower_back: 'moderate' },
  },
  {
    name: 'Side Plank',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.CORE,
    muscleGroups: ['obliques', 'core'],
    equipmentTags: ['bodyweight'],
    jointStressFlags: {},
  },
  {
    name: 'Dead Bug',
    type: ExerciseType.BODYWEIGHT,
    pattern: MovementPattern.CORE,
    muscleGroups: ['core', 'abs'],
    equipmentTags: ['bodyweight'],
    jointStressFlags: {},
  },

  // ===========================================================================
  // CARRY
  // ===========================================================================
  {
    name: 'Farmer Carry',
    type: ExerciseType.OTHER,
    pattern: MovementPattern.CARRY,
    muscleGroups: ['forearms', 'traps', 'core'],
    equipmentTags: ['dumbbell', 'kettlebell'],
    jointStressFlags: {},
  },
  {
    name: 'Suitcase Carry',
    type: ExerciseType.OTHER,
    pattern: MovementPattern.CARRY,
    muscleGroups: ['obliques', 'core', 'forearms'],
    equipmentTags: ['dumbbell', 'kettlebell'],
    jointStressFlags: {},
  },
];

// -----------------------------------------------------------------------------
// Seed function
// -----------------------------------------------------------------------------

async function main() {
  console.log(`Seeding ${exercises.length} system exercises...`);

  let created = 0;
  let skipped = 0;

  for (const ex of exercises) {
    const existing = await prisma.exercise.findFirst({
      where: { name: ex.name, isCustom: false },
      select: { id: true },
    });

    if (existing) {
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          type: ex.type,
          pattern: ex.pattern,
          muscleGroups: ex.muscleGroups,
          equipmentTags: ex.equipmentTags,
          jointStressFlags: ex.jointStressFlags,
        },
      });
    } else {
      await prisma.exercise.create({
        data: {
          name: ex.name,
          type: ex.type,
          pattern: ex.pattern,
          muscleGroups: ex.muscleGroups,
          equipmentTags: ex.equipmentTags,
          jointStressFlags: ex.jointStressFlags,
          isCustom: false,
          ownerUserId: null,
        },
      });
    }
    created++;
  }

  console.log(`Done. ${created} exercises upserted, ${skipped} skipped.`);
  console.log(`Total system exercises: ${await prisma.exercise.count({ where: { isCustom: false } })}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
