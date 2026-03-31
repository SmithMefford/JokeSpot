const bcrypt = require('bcryptjs');

async function generateHash() {
  const hash = await bcrypt.hash('administrator1', 10);
  console.log(hash);
}

generateHash();