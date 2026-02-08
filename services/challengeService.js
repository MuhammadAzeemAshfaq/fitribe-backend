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
  
  const leaderboard = [];
  
  for (const doc of participantsSnapshot.docs) {
    const data = doc.data();
    const userDoc = await db.collection('users').doc(data.userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    
    leaderboard.push({
      userId: data.userId,
      userName: userData.name || 'Unknown',
      profilePicUrl: userData.profilePicUrl || '',
      progress: data.progress,
      status: data.status,
      rank: leaderboard.length + 1,
      completedAt: data.completedAt?.toDate(),
      joinedAt: data.createdAt?.toDate()
    });
  }
  
  return leaderboard;
}

async function joinChallenge(userId, challengeId) {
  const challengeDoc = await db.collection('challenges').doc(challengeId).get();
  
  if (!challengeDoc.exists) {
    throw new Error('Challenge not found');
  }
  
  const challenge = challengeDoc.data();
  
  if (challenge.status !== 'active') {
    throw new Error('Challenge is not active');
  }
  
  const existing = await db.collection('challengeParticipants')
    .where('userId', '==', userId)
    .where('challengeId', '==', challengeId)
    .get();
  
  if (!existing.empty) {
    throw new Error('Already joined this challenge');
  }
  
  const participantRef = await db.collection('challengeParticipants').add({
    userId,
    challengeId,
    progress: 0,
    status: 'in_progress',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  await db.collection('challenges').doc(challengeId).update({
    participantCount: admin.firestore.FieldValue.increment(1)
  });
  
  return {
    participantId: participantRef.id,
    challenge: {
      id: challengeId,
      ...challenge
    }
  };
}

async function leaveChallenge(userId, challengeId) {
  const participantSnapshot = await db.collection('challengeParticipants')
    .where('userId', '==', userId)
    .where('challengeId', '==', challengeId)
    .limit(1)
    .get();
  
  if (participantSnapshot.empty) {
    throw new Error('Not participating in this challenge');
  }
  
  const participantDoc = participantSnapshot.docs[0];
  const participant = participantDoc.data();
  
  if (participant.status === 'completed') {
    throw new Error('Cannot leave a completed challenge');
  }
  
  await participantDoc.ref.update({
    status: 'abandoned',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  await db.collection('challenges').doc(challengeId).update({
    participantCount: admin.firestore.FieldValue.increment(-1)
  });
  
  return { success: true };
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
  
  const challenges = [];
  
  for (const doc of participantsSnapshot.docs) {
    const participant = doc.data();
    const challengeDoc = await db.collection('challenges').doc(participant.challengeId).get();
    
    if (challengeDoc.exists) {
      const challengeData = challengeDoc.data();
      challenges.push({
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
      });
    }
  }
  
  return challenges;
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