const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ==================== SEED DATA ====================

const seedData = {

  // ── DUELS ──────────────────────────────────────────────────────
  duels: [
    {
      duelId: 'duel_001',
      challengerId: 'test_user_001',
      opponentId: 'test_user_002',
      exercise: 'pushup',
      metric: 'rep_count',
      status: 'completed',
      winnerId: 'test_user_001',
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      duelId: 'duel_002',
      challengerId: 'test_user_002',
      opponentId: 'test_user_001',
      exercise: 'squat',
      metric: 'form_score',
      status: 'pending',
      winnerId: null,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: null
    }
  ],

  // ── DUEL PERFORMANCE ───────────────────────────────────────────
  // Doc ID format: {duelId}_{userId}
  duelPerformance: [
    {
      docId: 'duel_001_test_user_001',
      duelId: 'duel_001',
      userId: 'test_user_001',
      reps: 35,
      formScore: 88.5,
      durationSeconds: 180,
      submittedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      docId: 'duel_001_test_user_002',
      duelId: 'duel_001',
      userId: 'test_user_002',
      reps: 28,
      formScore: 82.0,
      durationSeconds: 180,
      submittedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // ── POSTURE ANALYSIS ───────────────────────────────────────────
  postureAnalysis: [
    {
      postureId: 'posture_001',
      userId: 'test_user_001',
      workoutSessionId: null,
      exerciseCount: 2,
      overallFormScore: 87.5,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // ── EXERCISE PERFORMANCE ───────────────────────────────────────
  exercisePerformance: [
    {
      performanceId: 'perf_001',
      sessionId: 'posture_001',
      userId: 'test_user_001',
      exerciseName: 'pushup',
      classifierId: 'pushup_classifier_v1',
      totalReps: 20,
      sets: 3,
      durationSeconds: 120,
      caloriesBurned: 80,
      avgFormScore: 88.5,
      keypoints: {
        LEFT_SHOULDER: { x: 0.3, y: 0.4 },
        RIGHT_SHOULDER: { x: 0.6, y: 0.4 }
      },
      angles: {
        elbowAngle: 85,
        shoulderAngle: 172
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      performanceId: 'perf_002',
      sessionId: 'posture_001',
      userId: 'test_user_001',
      exerciseName: 'squat',
      classifierId: 'squat_classifier_v1',
      totalReps: 15,
      sets: 3,
      durationSeconds: 90,
      caloriesBurned: 60,
      avgFormScore: 86.5,
      keypoints: {
        LEFT_HIP: { x: 0.35, y: 0.55 },
        RIGHT_HIP: { x: 0.65, y: 0.55 }
      },
      angles: {
        hipAngle: 95,
        kneeAngle: 88
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // ── CORRECTION SUGGESTIONS ─────────────────────────────────────
  correctionSuggestions: [
    {
      correctionId: 'correction_001',
      sessionId: 'posture_001',
      userId: 'test_user_001',
      exerciseName: 'pushup',
      type: 'form',
      message: 'Keep your back straight',
      severity: 'medium',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      correctionId: 'correction_002',
      sessionId: 'posture_001',
      userId: 'test_user_001',
      exerciseName: 'squat',
      type: 'form',
      message: 'Lower your hips further',
      severity: 'low',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // ── SOCIAL ACTIVITY ────────────────────────────────────────────
  socialActivity: [
    {
      activityId: 'activity_001',
      userId: 'test_user_001',
      type: 'workout_completed',
      data: {
        workoutPlanId: null,
        durationMinutes: 30,
        totalCalories: 200
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      activityId: 'activity_002',
      userId: 'test_user_001',
      type: 'badge_earned',
      data: {
        badgeId: 'first_workout',
        badgeName: 'First Steps',
        badgeTier: 'bronze'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      activityId: 'activity_003',
      userId: 'test_user_001',
      type: 'duel_won',
      data: {
        duelId: 'duel_001',
        loserId: 'test_user_002',
        exercise: 'pushup'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // ── NOTIFICATIONS ──────────────────────────────────────────────
  notifications: [
    {
      notificationId: 'notif_001',
      userId: 'test_user_002',
      title: '⚔️ Duel Challenge!',
      body: 'John Doe challenged you to a pushup duel!',
      data: {
        type: 'duel_invite',
        duelId: 'duel_002'
      },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      notificationId: 'notif_002',
      userId: 'test_user_001',
      title: '🏆 You won the duel!',
      body: 'You beat your opponent in the pushup duel!',
      data: {
        type: 'duel_won',
        duelId: 'duel_001'
      },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // ── DEVICE TOKENS ──────────────────────────────────────────────
  deviceTokens: [
    {
      docId: 'test_user_001_sample_fcm_token_001',
      userId: 'test_user_001',
      token: 'sample_fcm_token_001',
      platform: 'mobile',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ]
};

// ==================== HELPERS ====================

async function seedCollection(collectionName, items, idField, useDocId = false) {
  let successCount = 0;
  let errorCount = 0;

  for (const item of items) {
    try {
      let docRef;

      if (useDocId && item.docId) {
        // Use explicit docId (for duelPerformance, deviceTokens etc.)
        const { docId, ...data } = item;
        docRef = db.collection(collectionName).doc(docId);
        await docRef.set(data);
      } else if (idField && item[idField]) {
        // Use the idField value as doc ID
        const docId = item[idField];
        docRef = db.collection(collectionName).doc(docId);
        await docRef.set(item);
      } else {
        // Auto-generate doc ID
        docRef = await db.collection(collectionName).add(item);
      }

      console.log(`   ✓ Added: ${item[idField] || item.docId || docRef.id}`);
      successCount++;
    } catch (error) {
      console.error(`   ✗ Error:`, error.message);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

// ==================== MAIN ====================

async function seedNewCollections() {
  console.log('\n🌱 Seeding NEW FiTribe Collections\n');
  console.log('='.repeat(60));
  console.log('Skipping existing collections — only adding missing ones\n');

  try {
    console.log('\n⚔️  Seeding Duels...');
    const duels = await seedCollection('duels', seedData.duels, 'duelId');
    console.log(`   → ${duels.successCount} added, ${duels.errorCount} errors`);

    console.log('\n📊 Seeding Duel Performance...');
    const duelPerf = await seedCollection('duelPerformance', seedData.duelPerformance, 'docId', true);
    console.log(`   → ${duelPerf.successCount} added, ${duelPerf.errorCount} errors`);

    console.log('\n🧘 Seeding Posture Analysis...');
    const posture = await seedCollection('postureAnalysis', seedData.postureAnalysis, 'postureId');
    console.log(`   → ${posture.successCount} added, ${posture.errorCount} errors`);

    console.log('\n💪 Seeding Exercise Performance...');
    const exPerf = await seedCollection('exercisePerformance', seedData.exercisePerformance, 'performanceId');
    console.log(`   → ${exPerf.successCount} added, ${exPerf.errorCount} errors`);

    console.log('\n📝 Seeding Correction Suggestions...');
    const corrections = await seedCollection('correctionSuggestions', seedData.correctionSuggestions, 'correctionId');
    console.log(`   → ${corrections.successCount} added, ${corrections.errorCount} errors`);

    console.log('\n📰 Seeding Social Activity...');
    const social = await seedCollection('socialActivity', seedData.socialActivity, 'activityId');
    console.log(`   → ${social.successCount} added, ${social.errorCount} errors`);

    console.log('\n🔔 Seeding Notifications...');
    const notifs = await seedCollection('notifications', seedData.notifications, 'notificationId');
    console.log(`   → ${notifs.successCount} added, ${notifs.errorCount} errors`);

    console.log('\n📱 Seeding Device Tokens...');
    const tokens = await seedCollection('deviceTokens', seedData.deviceTokens, 'docId', true);
    console.log(`   → ${tokens.successCount} added, ${tokens.errorCount} errors`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Done! New collections added:\n');
    console.log('   - duels');
    console.log('   - duelPerformance');
    console.log('   - postureAnalysis');
    console.log('   - exercisePerformance');
    console.log('   - correctionSuggestions');
    console.log('   - socialActivity');
    console.log('   - notifications');
    console.log('   - deviceTokens');
    console.log('\nNote: "follows" collection already exists — skipped.');
    console.log('='.repeat(60) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedNewCollections();