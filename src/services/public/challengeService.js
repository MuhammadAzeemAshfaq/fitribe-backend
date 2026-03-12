const admin = require('firebase-admin');
const db = admin.firestore();

async function getActiveChallenges() {
  const challengesSnapshot = await db.collection('challenges')
    .where('status', '==', 'active')
    .orderBy('startDate', 'desc')
    .get();
  
  return challengesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    startDate: doc.data().startDate?.toDate(),
    endDate: doc.data().endDate?.toDate(),
    createdAt: doc.data().createdAt?.toDate()
  }));
}

async function getChallengeDetails(challengeId, includeLeaderboard = true) {
  const challengeDoc = await db.collection('challenges').doc(challengeId).get();
  
  if (!challengeDoc.exists) {
    return null;
  }
  
  const challenge = {
    id: challengeDoc.id,
    ...challengeDoc.data(),
    startDate: challengeDoc.data().startDate?.toDate(),
    endDate: challengeDoc.data().endDate?.toDate(),
    createdAt: challengeDoc.data().createdAt?.toDate()
  };
  
  const result = { challenge };
  
  if (includeLeaderboard) {
    result.leaderboard = await getChallengeLeaderboard(challengeId, 10);
  }
  
  return result;
}

async function getChallengeLeaderboard(challengeId, limit = 10) {
  const participantsSnapshot = await db.collection('challengeParticipants')
    .where('challengeId', '==', challengeId)
    .orderBy('progress', 'desc')
    .limit(limit)
    .get();

  // Fetch all user docs in parallel
  const leaderboard = await Promise.all(participantsSnapshot.docs.map(async (doc, index) => {
    const data = doc.data();
    const userDoc = await db.collection('users').doc(data.userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    return {
      userId: data.userId,
      userName: userData.name || 'Unknown',
      profilePicUrl: userData.profilePicUrl || '',
      progress: data.progress,
      status: data.status,
      rank: index + 1, // ranks sequentially for now
      completedAt: data.completedAt?.toDate(),
      joinedAt: data.createdAt?.toDate()
    };
  }));

  return leaderboard;
}


async function joinChallenge(userId, challengeId) {
  const challengeRef = db.collection('challenges').doc(challengeId);
  const participantRef = db
    .collection('challengeParticipants')
    .doc(`${userId}_${challengeId}`);

  return await db.runTransaction(async (transaction) => {
    const challengeDoc = await transaction.get(challengeRef);

    if (!challengeDoc.exists) {
      throw new Error('Challenge not found');
    }

    const challenge = challengeDoc.data();

    if (challenge.status !== 'active') {
      throw new Error('Challenge is not active');
    }

    const participantDoc = await transaction.get(participantRef);

    // If participant already exists
    if (participantDoc.exists) {
      const participant = participantDoc.data();

      if (participant.status === 'in_progress') {
        throw new Error('Already participating in this challenge');
      }

      if (participant.status === 'completed') {
        throw new Error('You already completed this challenge');
      }

      if (participant.status === 'abandoned') {
        transaction.update(participantRef, {
          status: 'in_progress',
          progress: 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        transaction.update(challengeRef, {
          participants: admin.firestore.FieldValue.increment(1)
        });

        return { rejoined: true };
      }
    }

    // If no participant exists → create new
    transaction.set(participantRef, {
      userId,
      challengeId,
      progress: 0,
      status: 'in_progress',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    transaction.update(challengeRef, {
      participants: admin.firestore.FieldValue.increment(1)
    });

    return { joined: true };
  });
}


async function leaveChallenge(userId, challengeId) {
  const challengeRef = db.collection('challenges').doc(challengeId);
  const participantRef = db
    .collection('challengeParticipants')
    .doc(`${userId}_${challengeId}`);

  return await db.runTransaction(async (transaction) => {
    const participantDoc = await transaction.get(participantRef);

    if (!participantDoc.exists) {
      throw new Error('Challenge not joined');
    }

    const participant = participantDoc.data();

    if (participant.status === 'abandoned') {
      throw new Error('Challenge not joined');
    }

    if (participant.status === 'completed') {
      throw new Error('Cannot leave a completed challenge');
    }

    // Safe to abandon
    transaction.update(participantRef, {
      status: 'abandoned',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    transaction.update(challengeRef, {
      participants: admin.firestore.FieldValue.increment(-1)
    });

    return { success: true };
  });
}


async function getUserChallenges(userId, status = 'all') {
  let query = db.collection('challengeParticipants')
    .where('userId', '==', userId);

  if (status !== 'all') {
    query = query.where('status', '==', status);
  }

  const participantsSnapshot = await query
    .orderBy('createdAt', 'desc')
    .get();

  // Fetch all challenge docs in parallel
  const challenges = await Promise.all(participantsSnapshot.docs.map(async (doc) => {
    const participant = doc.data();
    const challengeDoc = await db.collection('challenges').doc(participant.challengeId).get();

    if (!challengeDoc.exists) return null;

    const challengeData = challengeDoc.data();
    return {
      id: challengeDoc.id,
      ...challengeData,
      userProgress: participant.progress,
      userStatus: participant.status,
      userRank: participant.rank,
      joinedAt: participant.createdAt?.toDate(),
      completedAt: participant.completedAt?.toDate(),
      startDate: challengeData.startDate?.toDate(),
      endDate: challengeData.endDate?.toDate(),
      createdAt: challengeData.createdAt?.toDate()
    };
  }));

  // Remove any nulls if a challenge doc didn't exist
  return challenges.filter(c => c !== null);
}

async function updateChallengeProgress(userId, exercises) {
  try {
    const participantsSnapshot = await db.collection('challengeParticipants')
      .where('userId', '==', userId)
      .where('status', '==', 'in_progress')
      .get();
    
    for (const participantDoc of participantsSnapshot.docs) {
      const participant = participantDoc.data();
      const challengeDoc = await db.collection('challenges').doc(participant.challengeId).get();
      
      if (!challengeDoc.exists) continue;
      
      const challenge = challengeDoc.data();
      let progressIncrement = 0;
      
      switch (challenge.type) {
        case 'exercise_count':
          const relevantExercises = exercises.filter(ex => 
            ex.exerciseName === challenge.goal.exerciseName
          );
          progressIncrement = relevantExercises.reduce((sum, ex) => 
            sum + (ex.totalReps || 0), 0
          );
          break;
          
        case 'calories':
          progressIncrement = exercises.reduce((sum, ex) => 
            sum + (ex.caloriesBurned || 0), 0
          );
          break;
          
        case 'duration':
          const durationExercises = exercises.filter(ex => 
            ex.exerciseName === challenge.goal.exerciseName
          );
          progressIncrement = durationExercises.reduce((sum, ex) => 
            sum + (ex.durationSeconds || 0), 0
          );
          break;
          
        case 'workout_count':
          progressIncrement = 1;
          break;
      }
      
      if (progressIncrement > 0) {
        const newProgress = participant.progress + progressIncrement;
        const isCompleted = newProgress >= challenge.goal.targetValue;
        
        await participantDoc.ref.update({
          progress: newProgress,
          status: isCompleted ? 'completed' : 'in_progress',
          completedAt: isCompleted ? admin.firestore.FieldValue.serverTimestamp() : null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        if (isCompleted && participant.status !== 'completed') {
          if (challenge.rewards && challenge.rewards.points) {
            await db.collection('userProgress').doc(userId).update({
              experiencePoints: admin.firestore.FieldValue.increment(challenge.rewards.points)
            });
          }
          
          console.log(`User ${userId} completed challenge ${challenge.name}`);
        }
      }
    }
  } catch (error) {
    console.error('Error updating challenge progress:', error);
  }
}

module.exports = {
  getActiveChallenges,
  getChallengeDetails,
  getChallengeLeaderboard,
  joinChallenge,
  leaveChallenge,
  getUserChallenges,
  updateChallengeProgress
};