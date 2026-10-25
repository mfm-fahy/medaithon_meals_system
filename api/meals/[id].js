const { connectDB, getMeal } = require('../lib/db');

module.exports = async (req, res) => {
  await connectDB();
  const Meal = getMeal();
  const { id } = req.query;
  
  if (req.method === 'GET') {
    const meal = await Meal.findById(id);
    if (!meal) return res.status(404).json({ error: 'Not found' });
    return res.json(meal);
  }
  
  if (req.method === 'PUT') {
    const { date, mealType, startTime, endTime, isActive } = req.body;
    const meal = await Meal.findByIdAndUpdate(
      id,
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
    return res.json(meal);
  }
  
  if (req.method === 'DELETE') {
    const meal = await Meal.findByIdAndDelete(id);
    if (!meal) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Meal deleted' });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};