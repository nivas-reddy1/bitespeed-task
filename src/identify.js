const { pool } = require('./db');

async function createContact(email, phoneNumber, linkedId, linkPrecedence) {
  const result = await pool.query(
    `INSERT INTO contacts (email, "phoneNumber", "linkedId", "linkPrecedence", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [email || null, phoneNumber || null, linkedId || null, linkPrecedence]
  );
  return result.rows[0];
}

function buildResponse(allContacts) {
  const primary = allContacts.find(c => c.linkPrecedence === 'primary');
  const secondaries = allContacts.filter(c => c.linkPrecedence === 'secondary');

  const emails = [];
  if (primary.email) emails.push(primary.email);
  for (const c of secondaries) {
    if (c.email && !emails.includes(c.email)) emails.push(c.email);
  }

  const phoneNumbers = [];
  if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);
  for (const c of secondaries) {
    if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber)) phoneNumbers.push(c.phoneNumber);
  }

  return {
    contact: {
      primaryContatactId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaries.map(c => c.id),
    },
  };
}

async function identifyContact(email, phoneNumber) {
  const newContact = await createContact(email, phoneNumber, null, 'primary');
  

  return buildResponse([newContact]);
}

module.exports = { identifyContact };