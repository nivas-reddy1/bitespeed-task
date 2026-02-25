const { pool } = require('./db');

async function findMatchingContacts(email, phoneNumber) {
  const conditions = [];
  const values = [];

  if (email) {
    values.push(email);
    conditions.push(`email = $${values.length}`);
  }
  if (phoneNumber) {
    values.push(phoneNumber);
    conditions.push(`"phoneNumber" = $${values.length}`);
  }

  if (conditions.length === 0) return [];

  const query = `
    SELECT * FROM contacts
    WHERE (${conditions.join(' OR ')})
    AND "deletedAt" IS NULL
    ORDER BY "createdAt" ASC
  `;
  const result = await pool.query(query, values);
  return result.rows;
}

function getPrimaryIds(contacts) {
  const primaryIds = new Set();
  for (const c of contacts) {
    if (c.linkPrecedence === 'primary') {
      primaryIds.add(c.id);
    } else if (c.linkedId) {
      primaryIds.add(c.linkedId);
    }
  }
  return [...primaryIds];
}

async function fetchCluster(primaryIds) {
  const result = await pool.query(
    `SELECT * FROM contacts
     WHERE (id = ANY($1) OR "linkedId" = ANY($1))
     AND "deletedAt" IS NULL
     ORDER BY "createdAt" ASC`,
    [primaryIds]
  );
  return result.rows;
}

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
      primaryContactId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaries.map(c => c.id),
    },
  };
}

async function identifyContact(email, phoneNumber) {
  const matched = await findMatchingContacts(email, phoneNumber);

  if (matched.length === 0) {
    const newContact = await createContact(email, phoneNumber, null, 'primary');
    return buildResponse([newContact]);
  }

  const primaryIds = getPrimaryIds(matched);
  let allContacts = await fetchCluster(primaryIds);

  const truePrimary = allContacts.find(c => c.linkPrecedence === 'primary');
  
  const emailIsNew = email && !allContacts.some(c => c.email === email);
  const phoneIsNew = phoneNumber && !allContacts.some(c => c.phoneNumber === phoneNumber);

  if (emailIsNew || phoneIsNew) {
    await createContact(email, phoneNumber, truePrimary.id, 'secondary');

    allContacts = await fetchCluster([truePrimary.id]);
  }

  return buildResponse(allContacts);
}

module.exports = { identifyContact };