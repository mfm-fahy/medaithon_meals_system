const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const XLSX = require('xlsx');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017') + '/medaithon-2026-barcode-system';

const participantSchema = new mongoose.Schema({
  registrationId: String,
  teamId: String,
  inviteCode: String,
  teamName: String,
  projectTitle: String,
  selectedChallenge: String,
  college: String,
  department: String,
  yearOfStudy: String,
  name: String,
  email: String,
  phone: String,
  role: String,
  skills: String,
  linkedin: String,
  isLeader: Boolean,
  status: String,
  barcode: { type: String, unique: true },
  isInside: { type: Boolean, default: false },
  lastEntryTime: Date,
  lastExitTime: Date,
  entryExitLogs: [{
    type: { type: String, enum: ['entry', 'exit'] },
    timestamp: { type: Date, default: Date.now },
    method: { type: String, enum: ['barcode', 'manual'] }
  }],
  foodServings: [{
    mealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal' },
    mealType: String,
    date: Date,
    servedAt: { type: Date, default: Date.now },
    method: { type: String, enum: ['barcode', 'manual'] }
  }]
}, { timestamps: true });

const mealSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner'], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Participant = mongoose.model('Participant', participantSchema);
const Meal = mongoose.model('Meal', mealSchema);

function generateBarcode() {
  return 'MDT' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

async function importExcelData() {
  try {
    const workbook = XLSX.readFile(path.join(__dirname, '../Downloads/MEDAITHON 2026.xlsx'));
    let totalImported = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      for (const row of data) {
        const members = [
          { prefix: 'Member 1', isLeader: row['Member 1 Is Leader?'] === 'Yes' },
          { prefix: 'Member 2', isLeader: row['Member 2 Is Leader?'] === 'Yes' },
          { prefix: 'Member 3', isLeader: row['Member 3 Is Leader?'] === 'Yes' },
          { prefix: 'Member 4', isLeader: row['Member 4 Is Leader?'] === 'Yes' }
        ];

        for (const member of members) {
          const name = row[`${member.prefix} Name`];
          if (!name || name.toString().trim() === '') continue;

          const email = row[`${member.prefix} Email`] || '';
          const existing = await Participant.findOne({ email: email.toLowerCase().trim() });
          if (existing) continue;

          const participant = new Participant({
            registrationId: row['Registration ID'],
            teamId: row['Team ID'],
            inviteCode: row['Invite Code'],
            teamName: row['Team Name'],
            projectTitle: row['Project Title'],
            selectedChallenge: row['Selected Challenge'],
            college: row['College / University'],
            department: row['Department'],
            yearOfStudy: row['Year of Study'],
            name: name.toString().trim(),
            email: email.toString().trim().toLowerCase(),
            phone: row[`${member.prefix} Phone Number`]?.toString().trim() || '',
            role: row[`${member.prefix} Role / Designation`]?.toString().trim() || '',
            skills: row[`${member.prefix} Skills`]?.toString().trim() || '',
            linkedin: row[`${member.prefix} LinkedIn Profile`]?.toString().trim() || '',
            isLeader: member.isLeader,
            status: row[`${member.prefix} Status`]?.toString().trim() || 'active',
            barcode: generateBarcode()
          });

          await participant.save();
          totalImported++;
        }
      }
    }
    console.log(`Imported ${totalImported} participants`);
  } catch (error) {
    console.error('Import error:', error);
  }
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/import', async (req, res) => {
  await importExcelData();
  res.json({ message: 'Import completed' });
});

app.get('/api/participants', async (req, res) => {
  const participants = await Participant.find().sort({ createdAt: -1 });
  res.json(participants);
});

app.get('/api/participants/overview', async (req, res) => {
  const total = await Participant.countDocuments();
  const inside = await Participant.countDocuments({ isInside: true });
  const outside = total - inside;
  res.json({ total, inside, outside });
});

function generateZPL(participant) {
  const { teamId, teamName, barcode, name } = participant;
  return `^XA
^PW406
^LL200
^FO20,20^A0N,25,25^FD${teamId || 'N/A'}^FS
^FO20,55^A0N,25,25^FD${teamName || 'N/A'}^FS
^FO20,90^BY2
^BCN,50,N,N
^FD${barcode}^FS
^FO20,160^A0N,20,20^FD${name}^FS
^XZ`;
}

app.get('/api/participants/:id/zpl', async (req, res) => {
  const participant = await Participant.findById(req.params.id);
  if (!participant) return res.status(404).json({ error: 'Not found' });
  const zpl = generateZPL(participant);
  res.set('Content-Type', 'application/zpl');
  res.send(zpl);
});

app.post('/api/participants/print-batch', async (req, res) => {
  const { participantIds } = req.body;
  if (!participantIds || !Array.isArray(participantIds)) {
    return res.status(400).json({ error: 'participantIds array required' });
  }
  const participants = await Participant.find({ _id: { $in: participantIds } });
  const zpl = participants.map(generateZPL).join('\n');
  res.set('Content-Type', 'application/zpl');
  res.send(zpl);
});

app.post('/api/print-raw', async (req, res) => {
  const { zpl, printerIp, printerPort } = req.body;
  if (!zpl) {
    return res.status(400).json({ error: 'ZPL data required' });
  }
  const ip = printerIp || process.env.ZEBRA_PRINTER_IP;
  const port = printerPort || (process.env.ZEBRA_PRINTER_PORT || 9100);
  if (!ip) {
    return res.status(400).json({ error: 'Printer IP not configured. Set ZEBRA_PRINTER_IP env var or pass printerIp in request.' });
  }
  const net = require('net');
  const client = new net.Socket();
  client.setTimeout(5000);
  client.connect(port, ip, () => {
    client.write(zpl);
    client.end();
  });
  client.on('error', (err) => {
    res.status(500).json({ error: `Printer connection failed: ${err.message}` });
  });
  client.on('timeout', () => {
    client.destroy();
    res.status(500).json({ error: 'Printer connection timeout' });
  });
  client.on('close', () => {
    if (!res.headersSent) {
      res.json({ success: true, message: 'Sent to printer' });
    }
  });
});

app.get('/api/participants/:id/barcode', async (req, res) => {
  const participant = await Participant.findById(req.params.id);
  if (!participant) return res.status(404).json({ error: 'Not found' });
  res.json({ barcode: participant.barcode, name: participant.name });
});

app.delete('/api/participants/:id', async (req, res) => {
  const participant = await Participant.findByIdAndDelete(req.params.id);
  if (!participant) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Participant deleted' });
});

app.get('/api/participants/:barcode', async (req, res) => {
  const participant = await Participant.findOne({ barcode: req.params.barcode });
  if (!participant) return res.status(404).json({ error: 'Not found' });
  res.json(participant);
});

app.post('/api/participants/:barcode/scan', async (req, res) => {
  const { type } = req.body;
  if (!['entry', 'exit'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  const participant = await Participant.findOne({ barcode: req.params.barcode });
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
  res.json(participant);
});

app.post('/api/participants/manual', async (req, res) => {
  const { email, type } = req.body;
  if (!email || !['entry', 'exit'].includes(type)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const participant = await Participant.findOne({ email: email.toLowerCase().trim() });
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
    method: 'manual'
  });

  await participant.save();
  res.json(participant);
});

app.get('/api/participants/:id/barcode', async (req, res) => {
  const participant = await Participant.findById(req.params.id);
  if (!participant) return res.status(404).json({ error: 'Not found' });
  res.json({ barcode: participant.barcode, name: participant.name });
});

app.post('/api/participants', async (req, res) => {
  const { name, email, phone, role, college, teamName, skills, linkedin, isLeader } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  const existing = await Participant.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(400).json({ error: 'Participant with this email already exists' });
  }
  const participant = new Participant({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone?.trim() || '',
    role: role?.trim() || '',
    college: college?.trim() || '',
    teamName: teamName?.trim() || '',
    skills: skills?.trim() || '',
    linkedin: linkedin?.trim() || '',
    isLeader: isLeader || false,
    status: 'active',
    barcode: generateBarcode()
  });
  await participant.save();
  res.status(201).json(participant);
});

app.delete('/api/participants/:id', async (req, res) => {
  const participant = await Participant.findByIdAndDelete(req.params.id);
  if (!participant) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Participant deleted' });
});

app.get('/api/meals', async (req, res) => {
  const meals = await Meal.find().sort({ date: 1, mealType: 1 });
  res.json(meals);
});

app.get('/api/meals/active', async (req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const meals = await Meal.find({ 
    date: { $gte: today },
    isActive: true 
  }).sort({ date: 1, mealType: 1 });
  res.json(meals);
});

app.get('/api/meals/:id', async (req, res) => {
  const meal = await Meal.findById(req.params.id);
  if (!meal) return res.status(404).json({ error: 'Not found' });
  res.json(meal);
});

app.post('/api/meals', async (req, res) => {
  const { date, mealType, startTime, endTime } = req.body;
  if (!date || !mealType || !startTime || !endTime) {
    return res.status(400).json({ error: 'Date, mealType, startTime, and endTime are required' });
  }
  const meal = new Meal({
    date: new Date(date),
    mealType,
    startTime,
    endTime
  });
  await meal.save();
  res.status(201).json(meal);
});

app.post('/api/meals/seed', async (req, res) => {
  const meals = [
    { date: '2026-10-26', mealType: 'Lunch', startTime: '12:30 PM', endTime: '1:30 PM' },
    { date: '2026-10-26', mealType: 'Dinner', startTime: '7:00 PM', endTime: '8:00 PM' },
    { date: '2026-10-27', mealType: 'Breakfast', startTime: '7:00 AM', endTime: '8:00 AM' },
    { date: '2026-10-27', mealType: 'Lunch', startTime: '12:30 PM', endTime: '1:30 PM' },
    { date: '2026-10-27', mealType: 'Dinner', startTime: '7:00 PM', endTime: '8:00 PM' },
    { date: '2026-10-28', mealType: 'Breakfast', startTime: '7:00 AM', endTime: '8:00 AM' }
  ];

  const created = [];
  for (const meal of meals) {
    const existing = await Meal.findOne({ date: new Date(meal.date), mealType: meal.mealType });
    if (!existing) {
      const m = new Meal({ ...meal, date: new Date(meal.date) });
      await m.save();
      created.push(m);
    }
  }
  res.json({ message: 'Meals seeded', created: created.length });
});

app.put('/api/meals/:id', async (req, res) => {
  const { date, mealType, startTime, endTime, isActive } = req.body;
  const meal = await Meal.findByIdAndUpdate(
    req.params.id,
    { 
      date: date ? new Date(date) : undefined,
      mealType,
      startTime,
      endTime,
      isActive
    },
    { new: true, runValidators: true }
  );
  if (!meal) return res.status(404).json({ error: 'Not found' });
  res.json(meal);
});

app.delete('/api/meals/:id', async (req, res) => {
  const meal = await Meal.findByIdAndDelete(req.params.id);
  if (!meal) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Meal deleted' });
});

app.post('/api/participants/:barcode/serve-food', async (req, res) => {
  const { mealId, method } = req.body;
  if (!mealId) {
    return res.status(400).json({ error: 'Meal ID is required' });
  }

  const meal = await Meal.findById(mealId);
  if (!meal) return res.status(404).json({ error: 'Meal not found' });

  const participant = await Participant.findOne({ barcode: req.params.barcode });
  if (!participant) return res.status(404).json({ error: 'Participant not found' });

  const alreadyServed = participant.foodServings.some(
    fs => fs.mealId.toString() === mealId
  );
  if (alreadyServed) {
    return res.status(400).json({ error: 'Food already served for this meal' });
  }

  participant.foodServings.push({
    mealId: meal._id,
    mealType: meal.mealType,
    date: meal.date,
    servedAt: new Date(),
    method: method || 'barcode'
  });

  await participant.save();
  res.json({ participant, meal });
});

app.post('/api/participants/manual/serve-food', async (req, res) => {
  const { email, mealId } = req.body;
  if (!email || !mealId) {
    return res.status(400).json({ error: 'Email and Meal ID are required' });
  }

  const meal = await Meal.findById(mealId);
  if (!meal) return res.status(404).json({ error: 'Meal not found' });

  const participant = await Participant.findOne({ email: email.toLowerCase().trim() });
  if (!participant) return res.status(404).json({ error: 'Participant not found' });

  const alreadyServed = participant.foodServings.some(
    fs => fs.mealId.toString() === mealId
  );
  if (alreadyServed) {
    return res.status(400).json({ error: 'Food already served for this meal' });
  }

  participant.foodServings.push({
    mealId: meal._id,
    mealType: meal.mealType,
    date: meal.date,
    servedAt: new Date(),
    method: 'manual'
  });

  await participant.save();
  res.json({ participant, meal });
});

app.get('/api/participants/overview', async (req, res) => {
  const total = await Participant.countDocuments();
  const inside = await Participant.countDocuments({ isInside: true });
  const outside = total - inside;

  const meals = await Meal.find({ isActive: true }).sort({ date: 1, mealType: 1 });
  const mealStats = await Promise.all(meals.map(async (meal) => {
    const servedCount = await Participant.countDocuments({ 'foodServings.mealId': meal._id });
    const medaithonServed = await Participant.countDocuments({ 
      'foodServings.mealId': meal._id,
      teamName: { $regex: /medaithon/i }
    });
    const totalStudents = await Participant.countDocuments({ status: 'active' });
    const medaithonStudents = await Participant.countDocuments({ status: 'active', teamName: { $regex: /medaithon/i } });
    return {
      mealId: meal._id,
      date: meal.date,
      mealType: meal.mealType,
      startTime: meal.startTime,
      endTime: meal.endTime,
      totalServed: servedCount,
      medaithonServed,
      totalStudents,
      medaithonStudents
    };
  }));

  res.json({ total, inside, outside, mealStats });
});

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(3001, () => console.log('Server running on port 3001'));
  })
  .catch(err => console.error('MongoDB connection error:', err));