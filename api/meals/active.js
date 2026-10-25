const { connectDB, getMeal } = require('../lib/db');

module.exports = async (req, res) => {
  await connectDB();
  const Meal = getMeal();
  
  if (req.method === 'GET') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const meals = await Meal.find({ 
      date: { $gte: today },
      isActive: true 
    }).sort({ date: 1, mealType: 1 });
    return res.json(meals);
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};