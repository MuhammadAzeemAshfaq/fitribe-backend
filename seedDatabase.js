const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ==================== COMPLETE SEED DATA ====================

const seedData = {
  // 1. BADGES
  badges: [
    {
      badgeId: "first_workout",
      name: "First Steps",
      description: "Complete your first workout",
      category: "milestone",
      iconUrl: "https://res.cloudinary.com/fitribe/badges/first_workout.png",
      condition: { type: "workout_count", value: 1 },
      points: 50,
      tier: "bronze"
    },
    {
      badgeId: "week_warrior",
      name: "Week Warrior",
      description: "Maintain a 7-day workout streak",
      category: "streak",
      iconUrl: "https://res.cloudinary.com/fitribe/badges/week_warrior.png",
      condition: { type: "streak_days", value: 7 },
      points: 100,
      tier: "silver"
    },
    {
      badgeId: "month_master",
      name: "Month Master",
      description: "Complete 30 workouts",
      category: "milestone",
      iconUrl: "https://res.cloudinary.com/fitribe/badges/month_master.png",
      condition: { type: "workout_count", value: 30 },
      points: 300,
      tier: "gold"
    },
    {
      badgeId: "calorie_crusher",
      name: "Calorie Crusher",
      description: "Burn 1000 total calories",
      category: "performance",
      iconUrl: "https://res.cloudinary.com/fitribe/badges/calorie_crusher.png",
      condition: { type: "total_calories", value: 1000 },
      points: 200,
      tier: "silver"
    },
    {
      badgeId: "perfect_form",
      name: "Perfect Form",
      description: "Complete a workout with 95%+ form score",
      category: "performance",
      iconUrl: "https://res.cloudinary.com/fitribe/badges/perfect_form.png",
      condition: { type: "form_score", value: 95 },
      points: 150,
      tier: "gold"
    },
    {
      badgeId: "social_butterfly",
      name: "Social Butterfly",
      description: "Win 5 duels against friends",
      category: "social",
      iconUrl: "https://res.cloudinary.com/fitribe/badges/social_butterfly.png",
      condition: { type: "duel_wins", value: 5 },
      points: 200,
      tier: "silver"
    },
    {
      badgeId: "challenge_champion",
      name: "Challenge Champion",
      description: "Complete 5 community challenges",
      category: "challenge",
      iconUrl: "https://res.cloudinary.com/fitribe/badges/challenge_champion.png",
      condition: { type: "challenge_completions", value: 5 },
      points: 300,
      tier: "gold"
    },
    {
      badgeId: "century_club",
      name: "Century Club",
      description: "Complete 100 workouts",
      category: "milestone",
      iconUrl: "https://res.cloudinary.com/fitribe/badges/century_club.png",
      condition: { type: "workout_count", value: 100 },
      points: 1000,
      tier: "platinum"
    }
  ],

  // 2. CHALLENGES
  challenges: [
    {
      challengeId: "squat_challenge_30",
      name: "30-Day Squat Challenge",
      description: "Complete 300 squats over 30 days to build leg strength",
      type: "exercise_count",
      difficulty: "medium",
      startDate: admin.firestore.Timestamp.now(),
      endDate: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ),
      goal: {
        exerciseName: "Squat",
        targetValue: 300
      },
      rewards: {
        points: 500,
        badges: ["squat_master"]
      },
      participants: 0,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      challengeId: "pushup_power_14",
      name: "Push-Up Power Challenge",
      description: "Complete 200 push-ups in 14 days",
      type: "exercise_count",
      difficulty: "hard",
      startDate: admin.firestore.Timestamp.now(),
      endDate: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      ),
      goal: {
        exerciseName: "Push-Up",
        targetValue: 200
      },
      rewards: {
        points: 750,
        badges: ["pushup_pro"]
      },
      participants: 0,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      challengeId: "calorie_burn_7",
      name: "Calorie Burn Blast",
      description: "Burn 2000 calories in 7 days",
      type: "calories",
      difficulty: "hard",
      startDate: admin.firestore.Timestamp.now(),
      endDate: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ),
      goal: {
        targetValue: 2000
      },
      rewards: {
        points: 600,
        badges: ["calorie_crusher"]
      },
      participants: 0,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      challengeId: "plank_endurance",
      name: "Plank Endurance Challenge",
      description: "Hold plank for 10 cumulative minutes over 7 days",
      type: "duration",
      difficulty: "medium",
      startDate: admin.firestore.Timestamp.now(),
      endDate: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ),
      goal: {
        exerciseName: "Plank",
        targetValue: 600 // seconds
      },
      rewards: {
        points: 400,
        badges: ["plank_master"]
      },
      participants: 0,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      challengeId: "weekly_warrior",
      name: "Weekly Warrior",
      description: "Complete 5 workouts in 7 days",
      type: "workout_count",
      difficulty: "easy",
      startDate: admin.firestore.Timestamp.now(),
      endDate: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ),
      goal: {
        targetValue: 5
      },
      rewards: {
        points: 250,
        badges: ["week_warrior"]
      },
      participants: 0,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // 3. EQUIPMENT (Referenced by exercises)
  equipment: [
    {
      equipmentId: "dumbbells",
      name: "Dumbbells",
      type: "dumbbells",
      imageUrl: "https://res.cloudinary.com/fitribe/equipment/dumbbells.png",
      description: "Free weights for strength training"
    },
    {
      equipmentId: "resistance_bands",
      name: "Resistance Bands",
      type: "resistance_bands",
      imageUrl: "https://res.cloudinary.com/fitribe/equipment/resistance_bands.png",
      description: "Elastic bands for resistance training"
    },
    {
      equipmentId: "kettlebell",
      name: "Kettlebell",
      type: "other",
      imageUrl: "https://res.cloudinary.com/fitribe/equipment/kettlebell.png",
      description: "Cast iron weight for dynamic exercises"
    },
    {
      equipmentId: "pull_up_bar",
      name: "Pull-Up Bar",
      type: "machine",
      imageUrl: "https://res.cloudinary.com/fitribe/equipment/pull_up_bar.png",
      description: "Bar mounted for pull-up exercises"
    },
    {
      equipmentId: "yoga_mat",
      name: "Yoga Mat",
      type: "other",
      imageUrl: "https://res.cloudinary.com/fitribe/equipment/yoga_mat.png",
      description: "Non-slip mat for floor exercises"
    }
  ],

  // 4. MEDIA ASSETS (for exercises, AR challenges, etc.)
  mediaAssets: [
    {
      mediaId: "squat_demo_video",
      type: "video",
      url: "https://res.cloudinary.com/fitribe/videos/squat_demo.mp4",
      thumbnailUrl: "https://res.cloudinary.com/fitribe/thumbnails/squat_thumb.jpg",
      width: 1920,
      height: 1080,
      durationSeconds: 45,
      sizeBytes: 5242880,
      role: "demo",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      mediaId: "pushup_demo_video",
      type: "video",
      url: "https://res.cloudinary.com/fitribe/videos/pushup_demo.mp4",
      thumbnailUrl: "https://res.cloudinary.com/fitribe/thumbnails/pushup_thumb.jpg",
      width: 1920,
      height: 1080,
      durationSeconds: 30,
      sizeBytes: 4194304,
      role: "demo",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      mediaId: "plank_demo_video",
      type: "video",
      url: "https://res.cloudinary.com/fitribe/videos/plank_demo.mp4",
      thumbnailUrl: "https://res.cloudinary.com/fitribe/thumbnails/plank_thumb.jpg",
      width: 1920,
      height: 1080,
      durationSeconds: 60,
      sizeBytes: 6291456,
      role: "demo",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // 5. CLASSIFIERS (AI models for posture detection)
  classifiers: [
    {
      classifierId: "squat_classifier_v1",
      exerciseId: "squat",
      name: "Squat Posture Classifier V1",
      modelVersion: "1.0",
      accuracy: 0.92,
      keypoints: ["LEFT_HIP", "RIGHT_HIP", "LEFT_KNEE", "RIGHT_KNEE", "LEFT_ANKLE", "RIGHT_ANKLE"],
      angles: {
        hipAngle: { min: 80, max: 110 },
        kneeAngle: { min: 80, max: 100 }
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      classifierId: "pushup_classifier_v1",
      exerciseId: "pushup",
      name: "Push-Up Posture Classifier V1",
      modelVersion: "1.0",
      accuracy: 0.89,
      keypoints: ["LEFT_SHOULDER", "RIGHT_SHOULDER", "LEFT_ELBOW", "RIGHT_ELBOW", "LEFT_WRIST", "RIGHT_WRIST"],
      angles: {
        elbowAngle: { min: 70, max: 90 },
        shoulderAngle: { min: 160, max: 180 }
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      classifierId: "plank_classifier_v1",
      exerciseId: "plank",
      name: "Plank Posture Classifier V1",
      modelVersion: "1.0",
      accuracy: 0.94,
      keypoints: ["LEFT_SHOULDER", "RIGHT_SHOULDER", "LEFT_HIP", "RIGHT_HIP", "LEFT_ANKLE", "RIGHT_ANKLE"],
      angles: {
        bodyAlignment: { min: 165, max: 180 }
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // 6. SAMPLE USER (for testing - normally created via authentication)
  users: [
    {
      userId: "test_user_001",
      name: "John Doe",
      email: "john.doe@test.com",
      passwordHash: "hashed_password_placeholder", // In real app, use proper hashing
      profilePicUrl: "https://res.cloudinary.com/fitribe/profiles/default_avatar.png",
      bio: "Fitness enthusiast trying to stay consistent",
      fitnessLevel: 2.5,
      status: "Active",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      userId: "test_user_002",
      name: "Jane Smith",
      email: "jane.smith@test.com",
      passwordHash: "hashed_password_placeholder",
      profilePicUrl: "https://res.cloudinary.com/fitribe/profiles/default_avatar.png",
      bio: "Love challenging myself with new workouts",
      fitnessLevel: 3.0,
      status: "Active",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // 7. USER PROGRESS (initialized for test users)
  userProgress: [
    {
      userId: "test_user_001",
      totalWorkouts: 0,
      totalCalories: 0,
      totalMinutes: 0,
      currentStreak: 0,
      longestStreak: 0,
      level: 1,
      experiencePoints: 0,
      weeklyStats: {
        workouts: 0,
        calories: 0,
        minutes: 0
      },
      monthlyStats: {
        workouts: 0,
        calories: 0,
        minutes: 0
      },
      lastWorkoutDate: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      userId: "test_user_002",
      totalWorkouts: 0,
      totalCalories: 0,
      totalMinutes: 0,
      currentStreak: 0,
      longestStreak: 0,
      level: 1,
      experiencePoints: 0,
      weeklyStats: {
        workouts: 0,
        calories: 0,
        minutes: 0
      },
      monthlyStats: {
        workouts: 0,
        calories: 0,
        minutes: 0
      },
      lastWorkoutDate: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // 8. WORKOUT STREAKS (initialized for test users)
  workoutStreaks: [
    {
      streakId: "streak_test_user_001",
      userId: "test_user_001",
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastWorkoutDate: null,
      streakStatus: "broken",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      streakId: "streak_test_user_002",
      userId: "test_user_002",
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastWorkoutDate: null,
      streakStatus: "broken",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // 9. LEADERBOARDS (empty templates)
  leaderboards: [
    {
      leaderboardId: "weekly_calories_2024_W06",
      type: "weekly_calories",
      period: "2024-W06",
      rankings: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      leaderboardId: "monthly_workouts_2024_02",
      type: "monthly_workouts",
      period: "2024-02",
      rankings: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      leaderboardId: "all_time_streak",
      type: "all_time_streak",
      period: "all_time",
      rankings: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ]
};

// ==================== HELPER FUNCTIONS ====================

async function clearCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  
  if (snapshot.empty) {
    console.log(`   No existing documents in ${collectionName}`);
    return 0;
  }
  
  const batchSize = 500;
  let deletedCount = 0;
  
  while (true) {
    const batch = db.batch();
    const docs = await db.collection(collectionName).limit(batchSize).get();
    
    if (docs.empty) break;
    
    docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });
    
    await batch.commit();
  }
  
  return deletedCount;
}

async function seedCollection(collectionName, data, idField) {
  let successCount = 0;
  let errorCount = 0;
  
  for (const item of data) {
    try {
      const docId = item[idField];
      await db.collection(collectionName).doc(docId).set(item);
      console.log(`   ✓ ${item.name || item.title || item.type || docId}`);
      successCount++;
    } catch (error) {
      console.error(`   ✗ Error adding ${item.name || item[idField]}:`, error.message);
      errorCount++;
    }
  }
  
  return { successCount, errorCount };
}

// ==================== MAIN SEED FUNCTION ====================

async function seedDatabase() {
  console.log('\n🌱 FiTribe Database Seeding Started\n');
  console.log('=' .repeat(60));
  
  try {
    // Option to clear existing data
    const shouldClear = process.argv.includes('--clear');
    
    if (shouldClear) {
      console.log('\n🗑️  Clearing existing data...\n');
      
      const collections = [
        'badges', 'challenges', 'equipment', 'mediaAssets', 
        'classifiers', 'users', 'userProgress', 'workoutStreaks',
        'leaderboards', 'workoutSessions', 'challengeParticipants',
        'userBadges', 'duels', 'duelPerformance', 'postureAnalysis',
        'correctionSuggestions', 'exercisePerformance', 'socialActivity'
      ];
      
      for (const collectionName of collections) {
        const deleted = await clearCollection(collectionName);
        if (deleted > 0) {
          console.log(`   Deleted ${deleted} documents from ${collectionName}`);
        }
      }
      
      console.log('\n✅ Old data cleared\n');
      console.log('=' .repeat(60));
    }
    
    const results = {};
    
    // Seed all collections
    console.log('\n📛 Seeding Badges...\n');
    results.badges = await seedCollection('badges', seedData.badges, 'badgeId');
    console.log(`\n   Total: ${results.badges.successCount} added, ${results.badges.errorCount} errors`);
    
    console.log('\n🏆 Seeding Challenges...\n');
    results.challenges = await seedCollection('challenges', seedData.challenges, 'challengeId');
    console.log(`\n   Total: ${results.challenges.successCount} added, ${results.challenges.errorCount} errors`);
    
    console.log('\n🏋️ Seeding Equipment...\n');
    results.equipment = await seedCollection('equipment', seedData.equipment, 'equipmentId');
    console.log(`\n   Total: ${results.equipment.successCount} added, ${results.equipment.errorCount} errors`);
    
    console.log('\n🎬 Seeding Media Assets...\n');
    results.mediaAssets = await seedCollection('mediaAssets', seedData.mediaAssets, 'mediaId');
    console.log(`\n   Total: ${results.mediaAssets.successCount} added, ${results.mediaAssets.errorCount} errors`);
    
    console.log('\n🤖 Seeding AI Classifiers...\n');
    results.classifiers = await seedCollection('classifiers', seedData.classifiers, 'classifierId');
    console.log(`\n   Total: ${results.classifiers.successCount} added, ${results.classifiers.errorCount} errors`);
    
    console.log('\n👥 Seeding Test Users...\n');
    results.users = await seedCollection('users', seedData.users, 'userId');
    console.log(`\n   Total: ${results.users.successCount} added, ${results.users.errorCount} errors`);
    
    console.log('\n📊 Seeding User Progress...\n');
    results.userProgress = await seedCollection('userProgress', seedData.userProgress, 'userId');
    console.log(`\n   Total: ${results.userProgress.successCount} added, ${results.userProgress.errorCount} errors`);
    
    console.log('\n🔥 Seeding Workout Streaks...\n');
    results.workoutStreaks = await seedCollection('workoutStreaks', seedData.workoutStreaks, 'streakId');
    console.log(`\n   Total: ${results.workoutStreaks.successCount} added, ${results.workoutStreaks.errorCount} errors`);
    
    console.log('\n🏅 Seeding Leaderboards...\n');
    results.leaderboards = await seedCollection('leaderboards', seedData.leaderboards, 'leaderboardId');
    console.log(`\n   Total: ${results.leaderboards.successCount} added, ${results.leaderboards.errorCount} errors`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ DATABASE SEEDING COMPLETED!\n');
    console.log(`   Badges: ${results.badges.successCount}`);
    console.log(`   Challenges: ${results.challenges.successCount}`);
    console.log(`   Equipment: ${results.equipment.successCount}`);
    console.log(`   Media Assets: ${results.mediaAssets.successCount}`);
    console.log(`   AI Classifiers: ${results.classifiers.successCount}`);
    console.log(`   Test Users: ${results.users.successCount}`);
    console.log(`   User Progress: ${results.userProgress.successCount}`);
    console.log(`   Workout Streaks: ${results.workoutStreaks.successCount}`);
    console.log(`   Leaderboards: ${results.leaderboards.successCount}`);
    console.log('\n' + '='.repeat(60) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// ==================== RUN ====================

seedDatabase();