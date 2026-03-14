const socialService = require('../../services/public/socialService');

/**
 * Social Controller
 * Thin controller — delegates all logic to socialService
 */

// ==================== GET USER'S OWN FEED ====================
exports.getUserFeed = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.uid;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    if (userId !== requesterId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const feed = await socialService.getUserFeed(userId, limit);

    res.status(200).json({
      success: true,
      count: feed.length,
      feed
    });

  } catch (error) {
    console.error('Error getting user feed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET FRIENDS' FEED ====================
exports.getFriendsFeed = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.uid;
    const limit = Math.min(parseInt(req.query.limit) || 30, 50);

    if (userId !== requesterId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const feed = await socialService.getFriendsFeed(userId, limit);

    res.status(200).json({
      success: true,
      count: feed.length,
      feed
    });

  } catch (error) {
    console.error('Error getting friends feed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== FOLLOW USER ====================
exports.followUser = async (req, res) => {
  try {
    const followerId = req.user.uid;
    const { followingId } = req.body;

    if (!followingId) {
      return res.status(400).json({
        success: false,
        error: 'followingId is required'
      });
    }

    const result = await socialService.followUser(followerId, followingId);

    res.status(200).json({
      success: true,
      message: 'Now following user',
      ...result
    });

  } catch (error) {
    console.error('Error following user:', error);
    const status = error.message.includes('not found') ? 404
      : error.message.includes('Already') || error.message.includes('Cannot') ? 400
      : 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// ==================== UNFOLLOW USER ====================
exports.unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.uid;
    const { targetId } = req.params;

    const result = await socialService.unfollowUser(followerId, targetId);

    res.status(200).json({
      success: true,
      message: 'Unfollowed user',
      ...result
    });

  } catch (error) {
    console.error('Error unfollowing user:', error);
    const status = error.message.includes('Not following') ? 400 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// ==================== GET FOLLOWING LIST ====================
exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.uid;

    if (userId !== requesterId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const following = await socialService.getFollowing(userId);

    res.status(200).json({
      success: true,
      count: following.length,
      following
    });

  } catch (error) {
    console.error('Error getting following list:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
