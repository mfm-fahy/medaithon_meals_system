const { connectDB, getMeal } = require('./lib/db');

module.exports = async (req, res) => {
  await connectDB();
  const Meal = getMeal();
  
  if (req.method === 'GET') {
    const meals = await Meal.find().sort({ date: 1, mealType: 1 });
    return res.json(meals);
  }
  
  if (req.method === 'POST') {
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
    return res.status(201).json(meal);
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};