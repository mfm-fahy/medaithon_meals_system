const { connectDB, getParticipant, getMeal } = require('../lib/db');

module.exports = async (req, res) => {
  await connectDB();
  const Participant = getParticipant();
  const Meal = getMeal();
  
  if (req.method === 'POST') {
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
    return res.json({ participant, meal });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};