const userService = require('../../services/public/userService');
const { logger } = require('../../utils/logger');

// ==================== REGISTER USER ====================
async function registerUser(req, res) {
  try {
    const uid = req.user.uid;
    const email = req.user.email;
    const { name, profilePicUrl, bio, fitnessLevel } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    const result = await userService.registerUser(uid, {
      name: name.trim(),
      email,
      profilePicUrl,
      bio,
      fitnessLevel
    });

    if (result.alreadyExists) {
      return res.status(200).json({
        success: true,
        message: 'User already registered',
        data: result.user
      });
    }

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result.user
    });

  } catch (error) {
    logger.error(`registerUser error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to register user' });
  }
}

// ==================== GET USER PROFILE ====================
async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;

    const profile = await userService.getUserProfile(userId);

    if (!profile) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if the requester follows this user (if authenticated)
    let isFollowing = false;
    if (req.user && req.user.uid !== userId) {
      isFollowing = await userService.isFollowing(req.user.uid, userId);
    }

    return res.status(200).json({
      success: true,
      data: { ...profile, isFollowing }
    });

  } catch (error) {
    logger.error(`getUserProfile error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
}

// ==================== UPDATE USER PROFILE ====================
async function updateUserProfile(req, res) {
  try {
    const { userId } = req.params;

    const updatedProfile = await userService.updateUserProfile(userId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });

  } catch (error) {
    logger.error(`updateUserProfile error: ${error.message}`);

    if (error.message === 'No valid fields provided for update') {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
}

// ==================== FOLLOW USER ====================
async function followUser(req, res) {
  try {
    const { followingId } = req.body;
    const followerId = req.user.uid;

    const result = await userService.followUser(followerId, followingId);

    return res.status(200).json({ success: true, message: result.message });

  } catch (error) {
    logger.error(`followUser error: ${error.message}`);

    const clientErrors = [
      'You cannot follow yourself',
      'Already following this user',
      'Follower user not found',
      'User to follow not found'
    ];

    if (clientErrors.includes(error.message)) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: 'Failed to follow user' });
  }
}

// ==================== UNFOLLOW USER ====================
async function unfollowUser(req, res) {
  try {
    const { followingId } = req.body;
    const followerId = req.user.uid;

    const result = await userService.unfollowUser(followerId, followingId);

    return res.status(200).json({ success: true, message: result.message });

  } catch (error) {
    logger.error(`unfollowUser error: ${error.message}`);

    if (error.message === 'You are not following this user') {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: 'Failed to unfollow user' });
  }
}

// ==================== GET FOLLOWERS ====================
async function getFollowers(req, res) {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await userService.getFollowers(userId, limit, offset);

    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    logger.error(`getFollowers error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to fetch followers' });
  }
}

// ==================== GET FOLLOWING ====================
async function getFollowing(req, res) {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await userService.getFollowing(userId, limit, offset);

    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    logger.error(`getFollowing error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to fetch following' });
  }
}

module.exports = {
  registerUser,
  getUserProfile,
  updateUserProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing
};