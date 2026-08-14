const Token = require('../models/Token');
const DoctorConfig = require('../models/DoctorConfig');
const User = require('../models/User');

// Helper function to get start and end of day
const getDayBounds = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

exports.getDashboard = async (req, res) => {
  try {
    const { shift } = req.query;
    const today = new Date();
    const { start, end } = getDayBounds(today);

    const filter = {
      date: { $gte: start, $lte: end }
    };

    if (shift && ['morning', 'evening'].includes(shift)) {
      filter.shift = shift;
    }

    // Get all tokens, sorted by priority (emergency first, then by number)
    const tokens = await Token.find(filter)
      .populate('patientId', 'name email phone')
      .sort({ isEmergency: -1, emergencyNumber: 1, tokenNumber: 1, createdAt: 1 });

    // Get config
    const config = await DoctorConfig.getConfig();

    // Get current serving token
    const currentServing = tokens.find(t => t.status === 'serving');

    res.json({
      tokens,
      config,
      currentServing,
      stats: {
        total: tokens.length,
        pending: tokens.filter(t => t.status === 'pending').length,
        serving: tokens.filter(t => t.status === 'serving').length,
        completed: tokens.filter(t => t.status === 'completed').length,
        missed: tokens.filter(t => t.status === 'missed').length,
        emergency: tokens.filter(t => t.isEmergency).length
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.markComplete = async (req, res) => {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({ message: 'Token ID is required' });
    }

    const token = await Token.findById(tokenId);
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    if (token.status === 'completed') {
      return res.status(400).json({ message: 'Token already completed' });
    }

    // Mark current token as completed
    token.status = 'completed';
    token.servedAt = new Date();
    await token.save();

    // Check for missed tokens - mark all pending tokens before this one as missed
    const today = new Date();
    const { start, end } = getDayBounds(today);

    const allTokens = await Token.find({
      date: { $gte: start, $lte: end },
      shift: token.shift
    }).sort({ isEmergency: -1, emergencyNumber: 1, tokenNumber: 1, createdAt: 1 });

    const currentIndex = allTokens.findIndex(t => t._id.toString() === tokenId);
    
    // Mark all pending tokens before the completed one as missed
    for (let i = 0; i < currentIndex; i++) {
      if (allTokens[i].status === 'pending') {
        allTokens[i].status = 'missed';
        allTokens[i].missedAt = new Date();
        await allTokens[i].save();
      }
    }

    // Get next token to serve
    const nextToken = allTokens.find((t, index) => 
      index > currentIndex && (t.status === 'pending' || t.status === 'serving')
    );

    // Update config
    const config = await DoctorConfig.getConfig();
    config.currentTokenId = nextToken ? nextToken._id : null;
    config.lastUpdated = new Date();
    await config.save();

    // If there's a next token, mark it as serving
    if (nextToken) {
      nextToken.status = 'serving';
      await nextToken.save();
    } else {
      // No more tokens, clear current
      config.currentTokenId = null;
      await config.save();
    }

    // Emit real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('tokenCompleted', { token, nextToken });
      const queueStatus = await calculateQueueStatus(token.shift);
      io.emit('queueUpdate', queueStatus);
    }

    res.json({ 
      message: 'Token marked as completed',
      token,
      nextToken
    });
  } catch (error) {
    console.error('Mark complete error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.pauseResume = async (req, res) => {
  try {
    const config = await DoctorConfig.getConfig();
    config.isPaused = !config.isPaused;
    config.lastUpdated = new Date();
    await config.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('doctorStatus', { 
        isPaused: config.isPaused,
        message: config.isPaused ? 'Doctor has paused checkups' : 'Doctor has resumed checkups'
      });
    }

    res.json({ 
      message: config.isPaused ? 'Checkups paused' : 'Checkups resumed',
      isPaused: config.isPaused
    });
  } catch (error) {
    console.error('Pause/resume error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const { maxTokensMorning, maxTokensEvening } = req.body;

    const config = await DoctorConfig.getConfig();

    if (maxTokensMorning !== undefined) {
      if (maxTokensMorning < 1) {
        return res.status(400).json({ message: 'Max tokens must be at least 1' });
      }
      config.maxTokensMorning = maxTokensMorning;
    }

    if (maxTokensEvening !== undefined) {
      if (maxTokensEvening < 1) {
        return res.status(400).json({ message: 'Max tokens must be at least 1' });
      }
      config.maxTokensEvening = maxTokensEvening;
    }

    config.lastUpdated = new Date();
    await config.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('configUpdated', config);
    }

    res.json({ 
      message: 'Configuration updated',
      config
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to get queue status (same as in tokenController)
const calculateQueueStatus = async (shift) => {
  const today = new Date();
  const { start, end } = getDayBounds(today);

  const allTokens = await Token.find({
    date: { $gte: start, $lte: end },
    shift
  }).sort({ isEmergency: -1, emergencyNumber: 1, tokenNumber: 1 });

  const currentServing = allTokens.find(t => t.status === 'serving') || 
                         allTokens.find(t => t.status === 'pending' && t.isEmergency) || 
                         allTokens.find(t => t.status === 'pending');

  return {
    currentServing: currentServing ? {
      tokenNumber: currentServing.tokenNumber,
      isEmergency: currentServing.isEmergency
    } : null,
    totalTokens: allTokens.length
  };
};

