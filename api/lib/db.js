const mongoose = require('mongoose');

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

let Participant, Meal;
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI not set');
  await mongoose.connect(MONGODB_URI);
  isConnected = true;
  Participant = mongoose.models.Participant || mongoose.model('Participant', participantSchema);
  Meal = mongoose.models.Meal || mongoose.model('Meal', mealSchema);
}

function generateBarcode() {
  return 'MDT' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

module.exports = { connectDB, getParticipant: () => Participant, getMeal: () => Meal, generateBarcode };