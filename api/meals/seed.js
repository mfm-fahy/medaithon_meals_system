const { connectDB, getMeal } = require('../lib/db');

module.exports = async (req, res) => {
  await connectDB();
  const Meal = getMeal();
  
  if (req.method === 'POST') {
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
    return res.json({ message: 'Meals seeded', created: created.length });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};