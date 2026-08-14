const Token = require('../models/Token');
const DoctorConfig = require('../models/DoctorConfig');

// Helper: get start & end of day
const getDayBounds = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// ===============================
// GENERATE TOKEN
// ===============================
exports.generateToken = async (req, res) => {
  try {
    const { shift, isEmergency } = req.body;
    const patientId = req.user._id;

    if (!shift || !['morning', 'evening'].includes(shift)) {
      return res.status(400).json({
        message: 'Valid shift (morning/evening) is required'
      });
    }

    const today = new Date();
    const { start, end } = getDayBounds(today);

    // ❌ One token per patient per shift per day
    const existingToken = await Token.findOne({
      patientId,
      shift,
      date: { $gte: start, $lte: end }
    });

    if (existingToken) {
      if (existingToken.status === 'missed') {
        return res.status(400).json({
          message: 'You missed your token for this shift. Cannot generate a new token.'
        });
      }
      return res.status(400).json({
        message: 'You already have a token for this shift today'
      });
    }

    // ❌ Only one emergency token per day
    if (isEmergency) {
      const existingEmergency = await Token.findOne({
        patientId,
        isEmergency: true,
        date: { $gte: start, $lte: end }
      });

      if (existingEmergency) {
        return res.status(400).json({
          message: 'You already have an emergency token today'
        });
      }
    }

    // Doctor configuration
    const config = await DoctorConfig.getConfig();
    const maxTokens =
      shift === 'morning'
        ? config.maxTokensMorning
        : config.maxTokensEvening;

    const todayTokens = await Token.find({
      shift,
      isEmergency: false,
      date: { $gte: start, $lte: end }
    });

    const todayEmergencyTokens = await Token.find({
      shift,
      isEmergency: true,
      date: { $gte: start, $lte: end }
    });

    // Generate token number
    let tokenNumber;
    let emergencyNumber = null;

    if (isEmergency) {
      emergencyNumber = todayEmergencyTokens.length + 1;
      tokenNumber = `E-${emergencyNumber}`;
    } else {
      if (todayTokens.length >= maxTokens) {
        return res.status(400).json({
          message: `Maximum tokens (${maxTokens}) for ${shift} shift reached`
        });
      }
      tokenNumber = String(todayTokens.length + 1);
    }

    // Create token
    const token = await Token.create({
      patientId,
      tokenNumber,
      shift,
      date: today,
      isEmergency: !!isEmergency,
      emergencyNumber
    });

    // Auto-assign first serving token
    const allTokens = await Token.find({
      shift,
      date: { $gte: start, $lte: end }
    }).sort({
      isEmergency: -1,
      emergencyNumber: 1,
      tokenNumber: 1,
      createdAt: 1
    });

    const currentlyServing = allTokens.find(t => t.status === 'serving');

    if (!currentlyServing) {
      const firstPending = allTokens.find(t => t.status === 'pending');
      if (firstPending) {
        firstPending.status = 'serving';
        await firstPending.save();

        config.currentTokenId = firstPending._id;
        config.lastUpdated = new Date();
        await config.save();
      }
    }

    // Socket events
    const io = req.app.get('io');
    if (io) {
      io.emit('tokenGenerated', token);
      io.emit('queueUpdate', await calculateQueueStatus(shift));
    }

    res.status(201).json({
      message: 'Token generated successfully',
      token
    });
  } catch (error) {
    console.error('Generate token error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// ===============================
// GET MY TOKEN (PATIENT)
// ===============================
exports.getMyToken = async (req, res) => {
  try {
    const patientId = req.user._id;
    const today = new Date();
    const { start, end } = getDayBounds(today);

    const tokens = await Token.find({
      patientId,
      date: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 });

    if (!tokens.length) {
      return res.json({ token: null, queueStatus: null });
    }

    const currentToken = tokens[0];
    const queueStatus = await calculateQueueStatus(
      currentToken.shift,
      currentToken
    );

    res.json({
      token: currentToken,
      queueStatus
    });
  } catch (error) {
    console.error('Get my token error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// ===============================
// QUEUE STATUS LOGIC
// ===============================
const calculateQueueStatus = async (shift, patientToken = null) => {
  const today = new Date();
  const { start, end } = getDayBounds(today);
  const AVG_TIME = Number(process.env.AVG_SERVICE_MINUTES) || 5;

  const allTokens = await Token.find({
    shift,
    date: { $gte: start, $lte: end }
  }).sort({
    isEmergency: -1,
    emergencyNumber: 1,
    tokenNumber: 1,
    createdAt: 1
  });

  const currentServing =
    allTokens.find(t => t.status === 'serving') ||
    allTokens.find(t => t.status === 'pending' && t.isEmergency) ||
    allTokens.find(t => t.status === 'pending') ||
    null;

  let waitingPosition = null;
  let estimatedWait = 'Queue not started';

  if (patientToken) {
    if (patientToken.isEmergency) {
      waitingPosition = 1;
      estimatedWait = 'Immediate';
    } else {
      const patientIndex = allTokens.findIndex(
        t => t._id.toString() === patientToken._id.toString()
      );

      if (patientIndex !== -1) {
        const beforePatient = allTokens
          .slice(0, patientIndex)
          .filter(t => t.status === 'pending' || t.status === 'serving');

        waitingPosition = beforePatient.length + 1;
        estimatedWait = `${beforePatient.length * AVG_TIME} minutes`;
      }
    }
  }

  return {
    currentServing: currentServing
      ? {
          tokenNumber: currentServing.tokenNumber,
          isEmergency: currentServing.isEmergency
        }
      : null,
    totalTokens: allTokens.length,
    waitingPosition,
    estimatedWait
  };
};

// ===============================
// PUBLIC QUEUE STATUS
// ===============================
exports.getQueueStatus = async (req, res) => {
  try {
    const { shift } = req.query;

    if (!shift || !['morning', 'evening'].includes(shift)) {
      return res.status(400).json({
        message: 'Valid shift is required'
      });
    }

    const queueStatus = await calculateQueueStatus(shift);
    res.json(queueStatus);
  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};
