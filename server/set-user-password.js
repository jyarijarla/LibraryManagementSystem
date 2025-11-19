#!/usr/bin/env node
require('dotenv').config()
const db = require('./db')
const bcrypt = require('bcryptjs')

async function usage() {
  console.log('Usage: node set-user-password.js <identifier> <newPassword>')
  console.log('  <identifier> can be a numeric User_ID, a username, or an email')
  process.exit(1)
}

async function main() {
  const [,, identifier, newPassword] = process.argv
  if (!identifier || !newPassword) return usage()

  // Determine if identifier is numeric id
  const isId = /^\d+$/.test(identifier)

  try {
    const hashed = await bcrypt.hash(newPassword, 10)

    const query = isId
      ? 'UPDATE user SET Password = ? WHERE User_ID = ?'
      : 'UPDATE user SET Password = ? WHERE Username = ? OR User_Email = ?'

    const params = isId ? [hashed, Number(identifier)] : [hashed, identifier, identifier]

    db.query(query, params, (err, result) => {
      if (err) {
        console.error('Error updating password:', err.message)
        process.exit(1)
      }
      if (result.affectedRows === 0) {
        console.warn('No user matched that identifier. No changes made.')
        process.exit(2)
      }
      console.log('Password updated for', result.affectedRows, 'user(s).')
      process.exit(0)
    })
  } catch (err) {
    console.error('Unexpected error:', err.message)
    process.exit(1)
  }
}

main()
