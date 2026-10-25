const { connectDB, getParticipant, getMeal } = require('./lib/db');

module.exports = async (req, res) => {
  await connectDB();
  const Participant = getParticipant();
  const Meal = getMeal();
  
  if (req.method === 'GET') {
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

    return res.json({ total, inside, outside, mealStats });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};