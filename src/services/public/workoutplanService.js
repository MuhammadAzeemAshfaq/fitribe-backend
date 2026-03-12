const admin = require('firebase-admin');
const db = admin.firestore();

// ==================== GET ALL WORKOUT PLANS ====================
async function getAllWorkoutPlans({ category, difficulty, limit = 20, offset = 0 }) {
  let query = db.collection('workoutPlans');

  // Apply filters if provided
  if (category) {
    query = query.where('category', '==', category);
  }
  if (difficulty) {
    query = query.where('difficulty', '==', difficulty);
  }

  const snap = await query.get();

  // Paginate in memory (Firestore offset workaround)
  const allDocs = snap.docs.slice(offset, offset + limit);

  const plans = allDocs.map(doc => ({
    planId: doc.id,
    name: doc.data().name,
    category: doc.data().category,
    description: doc.data().description,
    difficulty: doc.data().difficulty,
    durationMinutes: doc.data().durationMinutes,
    goal: doc.data().goal,
    equipmentRequired: doc.data().equipmentRequired,
    aiModelIntegrated: doc.data().aiModelIntegrated,
    exerciseCount: (doc.data().exercises || []).length
    // Note: exercises array NOT included in list view - only in single plan view
  }));

  return {
    plans,
    total: snap.size,
    limit,
    offset
  };
}

// ==================== GET SINGLE WORKOUT PLAN ====================
async function getWorkoutPlanById(planId) {
  const planDoc = await db.collection('workoutPlans').doc(planId).get();

  if (!planDoc.exists) return null;

  const data = planDoc.data();

  return {
    planId: planDoc.id,
    name: data.name,
    category: data.category,
    description: data.description,
    difficulty: data.difficulty,
    durationMinutes: data.durationMinutes,
    goal: data.goal,
    equipmentRequired: data.equipmentRequired,
    aiModelIntegrated: data.aiModelIntegrated,
    exercises: data.exercises || []  // Full embedded exercises array
  };
}

// ==================== GET DISTINCT CATEGORIES ====================
// Useful for Hamza to populate filter dropdowns in the app
async function getCategories() {
  const snap = await db.collection('workoutPlans').get();
  const categories = [...new Set(snap.docs.map(doc => doc.data().category).filter(Boolean))];
  return categories.sort();
}

module.exports = {
  getAllWorkoutPlans,
  getWorkoutPlanById,
  getCategories
};