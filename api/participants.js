const { connectDB, getParticipant, generateBarcode } = require('./lib/db');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  await connectDB();
  const Participant = getParticipant();
  
  if (req.method === 'GET') {
    const participants = await Participant.find().sort({ createdAt: -1 });
    return res.json(participants);
  }
  
  if (req.method === 'POST') {
    const filePath = path.join(__dirname, '../../Downloads/MEDAITHON 2026.xlsx');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Excel file not found' });
    }
    
    const workbook = XLSX.readFile(filePath);
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
    return res.json({ message: 'Import completed', imported: totalImported });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};