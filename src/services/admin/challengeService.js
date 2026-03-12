const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Admin Challenge Service
 * Business logic for admin challenge operations
 */

// ==================== GET ALL CHALLENGES ====================
async function getAllChallenges(options = {}) {
  const { status, page, limit } = options;
  
  let query = db.collection('challenges');
  
  // Filter by status if not 'all'
  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }
  
  // Order by creation date
  query = query.orderBy('createdAt', 'desc');
  
  // Pagination
  const offset = (page - 1) * limit;
  query = query.limit(limit).offset(offset);
  
  const snapshot = await query.get();
  
  const challenges = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    startDate: doc.data().startDate?.toDate(),
    endDate: doc.data().endDate?.toDate(),
    createdAt: doc.data().createdAt?.toDate()
  }));
  
  // Get total count for pagination
  const totalQuery = status && status !== 'all' 
    ? db.collection('challenges').where('status', '==', status)
    : db.collection('challenges');
  
  const totalSnapshot = await totalQuery.count().get();
  const totalCount = totalSnapshot.data().count;
  
  return {
    challenges,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    }
  };
}

// ==================== GET CHALLENGE DETAILS ====================
async function getChallengeDetails(challengeId) {
  const challengeDoc = await db.collection('challenges').doc(challengeId).get();
  
  if (!challengeDoc.exists) {
    return null;
  }
  
  const challengeData = challengeDoc.data();
  
  // Get participant count
  const participantsSnapshot = await db.collection('challengeParticipants')
    .where('challengeId', '==', challengeId)
    .count()
    .get();
  
  // Get completion count
  const completedSnapshot = await db.collection('challengeParticipants')
    .where('challengeId', '==', challengeId)
    .where('status', '==', 'completed')
    .count()
    .get();
  
  return {
    challenge: {
      id: challengeDoc.id,
      ...challengeData,
      startDate: challengeData.startDate?.toDate(),
      endDate: challengeData.endDate?.toDate(),
      createdAt: challengeData.createdAt?.toDate()
    },
    statistics: {
      totalParticipants: participantsSnapshot.data().count,
      completedCount: completedSnapshot.data().count,
      completionRate: participantsSnapshot.data().count > 0 
        ? (completedSnapshot.data().count / participantsSnapshot.data().count * 100).toFixed(2) 
        : 0
    }
  };
}

// ==================== CREATE CHALLENGE ====================
async function createChallenge(challengeData) {
  // Validate dates
  const startDate = new Date(challengeData.startDate);
  const endDate = new Date(challengeData.endDate);
  
  if (startDate >= endDate) {
    throw new Error('End date must be after start date');
  }
  
  // Create challenge document
  const challengeRef = await db.collection('challenges').add({
    name: challengeData.name,
    description: challengeData.description,
    type: challengeData.type,
    goal: challengeData.goal,
    status: 'active',
    startDate: admin.firestore.Timestamp.fromDate(startDate),
    endDate: admin.firestore.Timestamp.fromDate(endDate),
    participants: 0,
    rewards: challengeData.rewards || { points: 100 },
    imageUrl: challengeData.imageUrl || '',
    createdBy: challengeData.createdBy,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return {
    challengeId: challengeRef.id,
    challenge: {
      id: challengeRef.id,
      ...challengeData,
      status: 'active',
      participants: 0,
      createdAt: new Date()
    }
  };
}

// ==================== UPDATE CHALLENGE ====================
async function updateChallenge(challengeId, updateData, adminId) {
  const challengeRef = db.collection('challenges').doc(challengeId);
  const challengeDoc = await challengeRef.get();
  
  if (!challengeDoc.exists) {
    throw new Error('Challenge not found');
  }
  
  // Prepare update object
  const updates = {
    ...updateData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminId
  };
  
  // Convert dates if provided
  if (updateData.startDate) {
    updates.startDate = admin.firestore.Timestamp.fromDate(new Date(updateData.startDate));
  }
  if (updateData.endDate) {
    updates.endDate = admin.firestore.Timestamp.fromDate(new Date(updateData.endDate));
  }
  
  // Validate dates if both are being updated
  if (updates.startDate && updates.endDate) {
    if (updates.startDate.toDate() >= updates.endDate.toDate()) {
      throw new Error('End date must be after start date');
    }
  }
  
  await challengeRef.update(updates);
  
  return {
    challengeId,
    updated: true
  };
}

// ==================== DELETE CHALLENGE ====================
async function deleteChallenge(challengeId, force = false) {
  const challengeRef = db.collection('challenges').doc(challengeId);
  const challengeDoc = await challengeRef.get();
  
  if (!challengeDoc.exists) {
    throw new Error('Challenge not found');
  }
  
  // Check for active participants
  const participantsSnapshot = await db.collection('challengeParticipants')
    .where('challengeId', '==', challengeId)
    .where('status', '==', 'in_progress')
    .count()
    .get();
  
  const activeParticipants = participantsSnapshot.data().count;
  
  if (activeParticipants > 0 && !force) {
    throw new Error(
      `Cannot delete challenge with ${activeParticipants} active participants. ` +
      `Use ?force=true to force delete, or set status to 'cancelled' instead.`
    );
  }
  
  // Soft delete: Mark as deleted instead of actually deleting
  await challengeRef.update({
    status: 'deleted',
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return {
    challengeId,
    deleted: true,
    message: force 
      ? `Challenge deleted (${activeParticipants} participants affected)`
      : 'Challenge deleted successfully'
  };
}

// ==================== UPDATE CHALLENGE STATUS ====================
async function updateChallengeStatus(challengeId, status) {
  const challengeRef = db.collection('challenges').doc(challengeId);
  const challengeDoc = await challengeRef.get();
  
  if (!challengeDoc.exists) {
    throw new Error('Challenge not found');
  }
  
  await challengeRef.update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return {
    challengeId,
    status,
    updated: true
  };
}

// ==================== GET CHALLENGE STATISTICS ====================
async function getChallengeStatistics(challengeId) {
  // Get challenge details
  const challengeDoc = await db.collection('challenges').doc(challengeId).get();
  
  if (!challengeDoc.exists) {
    throw new Error('Challenge not found');
  }
  
  // Get all participants
  const participantsSnapshot = await db.collection('challengeParticipants')
    .where('challengeId', '==', challengeId)
    .get();
  
  const stats = {
    totalParticipants: participantsSnapshot.size,
    inProgress: 0,
    completed: 0,
    abandoned: 0,
    averageProgress: 0,
    topPerformers: []
  };
  
  let totalProgress = 0;
  const participants = [];
  
  for (const doc of participantsSnapshot.docs) {
    const data = doc.data();
    
    // Count by status
    if (data.status === 'in_progress') stats.inProgress++;
    if (data.status === 'completed') stats.completed++;
    if (data.status === 'abandoned') stats.abandoned++;
    
    totalProgress += data.progress || 0;
    
    participants.push({
      userId: data.userId,
      progress: data.progress || 0,
      status: data.status
    });
  }
  
  // Calculate average progress
  if (stats.totalParticipants > 0) {
    stats.averageProgress = (totalProgress / stats.totalParticipants).toFixed(2);
  }
  
  // Get top 5 performers
  stats.topPerformers = participants
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5)
    .map(p => ({
      userId: p.userId,
      progress: p.progress,
      status: p.status
    }));
  
  return stats;
}

module.exports = {
  getAllChallenges,
  getChallengeDetails,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  updateChallengeStatus,
  getChallengeStatistics
};