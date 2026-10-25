const { connectDB, getParticipant } = require('../../lib/db');

module.exports = async (req, res) => {
  await connectDB();
  const Participant = getParticipant();
  
  const { barcode } = req.query;
  
  if (req.method === 'GET') {
    const participant = await Participant.findOne({ barcode });
    if (!participant) return res.status(404).json({ error: 'Not found' });
    return res.json(participant);
  }
  
  if (req.method === 'POST') {
    const { type } = req.body;
    if (!['entry', 'exit'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const participant = await Participant.findOne({ barcode });
    if (!participant) return res.status(404).json({ error: 'Not found' });

    if (type === 'entry' && participant.isInside) {
      return res.status(400).json({ error: 'Already inside' });
    }
    if (type === 'exit' && !participant.isInside) {
      return res.status(400).json({ error: 'Not inside' });
    }

    participant.isInside = type === 'entry';
    if (type === 'entry') participant.lastEntryTime = new Date();
    else participant.lastExitTime = new Date();

    participant.entryExitLogs.push({
      type,
      timestamp: new Date(),
      method: 'barcode'
    });

    await participant.save();
    return res.json(participant);
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};