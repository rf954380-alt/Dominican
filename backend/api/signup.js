import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import db from '../db.js';

const requestTimestamps = new Map();
const suspiciousIPs = new Map();

function getClientIP(req) {
  let ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.connection?.remoteAddress || null;
  if (ip && typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip && ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip || 'unknown';
}

function validateRequest(req, body) {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  const contentType = req.headers['content-type'] || '';

  if (body.website && body.website.trim() !== '') return false;
  if (!userAgent || userAgent.length < 10) return false;

  const botPatterns = [/curl|wget|python-requests|java\/|go-http|libwww-perl|scrapy/i];
  if (botPatterns.some((p) => p.test(userAgent))) return false;

  if (!contentType.includes('application/json')) return false;

  const now = Date.now();
  const ipKey = `signup_${ip}`;
  const lastRequest = requestTimestamps.get(ipKey) || 0;

  if (now - lastRequest < 2000) {
    const count = suspiciousIPs.get(ip) || 0;
    suspiciousIPs.set(ip, count + 1);
    if (count > 5) return false;
  }

  requestTimestamps.set(ipKey, now);
  setTimeout(() => requestTimestamps.delete(ipKey), 60000);
  return true;
}

export async function signupHandler(req, res) {
  const { email, password, school, age, website } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email address.' });

  if (!validateRequest(req, { website })) {
    return res.status(400).json({ error: 'Signup failed. Please try again.' });
  }

  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) return res.status(400).json({ error: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    const now = Date.now();
    const ip = getClientIP(req);

    const isFirstUser = db.prepare('SELECT COUNT(*) AS count FROM users').get().count === 0;
    const isAdmin = isFirstUser || email === process.env.ADMIN_EMAIL;

    db.prepare(`
      INSERT INTO users (id, email, password_hash, created_at, updated_at, is_admin, email_verified, school, age, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email, passwordHash, now, now, isAdmin ? 1 : 0, 1, school || null, age || null, ip);

    res.status(201).json({
      message: isFirstUser ? 'Admin account created!' : 'Account created! You can now sign in.'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
}