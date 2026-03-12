const admin = require('firebase-admin');
const db = admin.firestore();

// ==================== GET ALL EXERCISES ====================
async function getAllExercises({ category, difficulty, limit = 20, offset = 0 }) {
  let query = db.collection('exercises');

  if (category) {
    query = query.where('category', '==', category);
  }
  if (difficulty) {
    query = query.where('difficulty', '==', difficulty);
  }

  const snap = await query.orderBy('index').get();

  const paginated = snap.docs.slice(offset, offset + limit);

  const exercises = paginated.map(doc => ({
    exerciseId: doc.id,
    name: doc.data().name,
    category: doc.data().category,
    difficulty: doc.data().difficulty,
    desc: doc.data().desc,
    equipmentRequired: doc.data().equipmentRequired,
    aiModelIntegrated: doc.data().aiModelIntegrated,
    index: doc.data().index
    // correctPoseData NOT included in list view - only in single exercise view
  }));

  return {
    exercises,
    total: snap.size,
    limit,
    offset
  };
}

// ==================== GET EXERCISE BY ID ====================
async function getExerciseById(exerciseId) {
  const doc = await db.collection('exercises').doc(exerciseId).get();

  if (!doc.exists) return null;

  return {
    exerciseId: doc.id,
    ...doc.data()
  };
}

// ==================== GET EXERCISE BY NAME ====================
// Used by Hamza to fetch pose data when starting an exercise from a workout plan
async function getExerciseByName(name) {
  // Case-insensitive: try exact match first, then lowercase fallback
  const snap = await db.collection('exercises')
    .where('name', '==', name)
    .limit(1)
    .get();

  if (!snap.empty) {
    const doc = snap.docs[0];
    return { exerciseId: doc.id, ...doc.data() };
  }

  // Fallback: try with first letter capitalised
  const capitalised = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const fallbackSnap = await db.collection('exercises')
    .where('name', '==', capitalised)
    .limit(1)
    .get();

  if (!fallbackSnap.empty) {
    const doc = fallbackSnap.docs[0];
    return { exerciseId: doc.id, ...doc.data() };
  }

  return null;
}

// ==================== GET DISTINCT CATEGORIES ====================
async function getCategories() {
  const snap = await db.collection('exercises').get();
  const categories = [...new Set(snap.docs.map(doc => doc.data().category).filter(Boolean))];
  return categories.sort();
}

module.exports = {
  getAllExercises,
  getExerciseById,
  getExerciseByName,
  getCategories
};