import { db } from '../db/index.js';
import { hashPassword } from '../utils/crypto.js';

export function getNextBeekeeperId() {
  const beekeepers = db.prepare('SELECT id FROM beekeepers').all();
  const maxIdNumber = beekeepers.reduce((max, bk) => {
    const match = /^BK(\d+)$/.exec(bk.id || '');
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `BK${String(maxIdNumber + 1).padStart(3, '0')}`;
}

export function getBeekeepers(req, res, next) {
  try {
    const rows = db.prepare('SELECT * FROM beekeepers ORDER BY id ASC').all();
    const beekeepers = rows.map(b => {
      let hives = [];
      try {
        hives = JSON.parse(b.hives);
      } catch {
        hives = typeof b.hives === 'string' ? b.hives.split(',').map(s => s.trim()).filter(Boolean) : [];
      }

      // Live batch count from batches table
      const batchCount = db.prepare('SELECT COUNT(*) as count FROM batches WHERE beekeeper_id = ? AND block_index > 0').get(b.id).count;

      return {
        id: b.id,
        name: b.name,
        location: b.location,
        hives,
        registrationDate: b.registration_date,
        totalBatches: batchCount,
        rating: b.rating,
        createdAt: b.created_at,
      };
    });

    return res.status(200).json({
      success: true,
      data: beekeepers,
    });
  } catch (error) {
    next(error);
  }
}

export function getBeekeeperById(req, res, next) {
  try {
    const { id } = req.params;
    const b = db.prepare('SELECT * FROM beekeepers WHERE id = ?').get(id);
    if (!b) {
      return res.status(404).json({
        success: false,
        error: `Beekeeper with ID ${id} not found.`,
      });
    }

    let hives = [];
    try {
      hives = JSON.parse(b.hives);
    } catch {
      hives = typeof b.hives === 'string' ? b.hives.split(',').map(s => s.trim()).filter(Boolean) : [];
    }

    const batches = db.prepare('SELECT * FROM batches WHERE beekeeper_id = ? AND block_index > 0 ORDER BY block_index DESC').all(id);

    return res.status(200).json({
      success: true,
      data: {
        id: b.id,
        name: b.name,
        location: b.location,
        hives,
        registrationDate: b.registration_date,
        totalBatches: batches.length,
        rating: b.rating,
        batches,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createBeekeeper(req, res, next) {
  try {
    const { name, location, hives, rating, registrationDate } = req.body;

    const hiveList = Array.isArray(hives)
      ? hives.map(h => String(h).trim()).filter(Boolean)
      : typeof hives === 'string'
        ? hives.split(',').map(h => h.trim()).filter(Boolean)
        : [];

    const newId = getNextBeekeeperId();
    const regDate = registrationDate || new Date().toISOString().slice(0, 10);
    const bkRating = Math.min(Math.max(parseFloat(rating) || 4.5, 1), 5);

    const insert = db.prepare(`
      INSERT INTO beekeepers (id, name, location, hives, registration_date, total_batches, rating)
      VALUES (@id, @name, @location, @hives, @registration_date, @total_batches, @rating)
    `);

    insert.run({
      id: newId,
      name: name.trim(),
      location: location.trim(),
      hives: JSON.stringify(hiveList),
      registration_date: regDate,
      total_batches: 0,
      rating: bkRating,
    });

    // Also ensure a corresponding user record exists for portal login
    const existingUser = db.prepare('SELECT id FROM users WHERE identifier = ?').get(newId);
    if (!existingUser) {
      const email = `${newId.toLowerCase()}@honeychain.in`;
      const passHash = await hashPassword('Beekeeper123!');
      db.prepare(`
        INSERT INTO users (name, email, identifier, password_hash, role)
        VALUES (?, ?, ?, ?, 'beekeeper')
      `).run(name.trim(), email, newId, passHash);
    }

    db.prepare('INSERT INTO audit_logs (action, actor_role, actor_id, details) VALUES (?, ?, ?, ?)').run(
      'ADMIN_CREATE_BEEKEEPER',
      req.user?.role || 'admin',
      String(req.user?.id || 'admin'),
      `Created beekeeper ${newId} (${name.trim()}) with assigned hives: ${hiveList.join(', ')}`
    );

    return res.status(201).json({
      success: true,
      message: `Beekeeper ${newId} registered successfully by Admin`,
      data: {
        id: newId,
        name: name.trim(),
        location: location.trim(),
        hives: hiveList,
        registrationDate: regDate,
        totalBatches: 0,
        rating: bkRating,
      },
    });
  } catch (error) {
    next(error);
  }
}

export function updateBeekeeper(req, res, next) {
  try {
    const { id } = req.params;
    const { name, location, hives, rating, registrationDate } = req.body;

    const existing = db.prepare('SELECT * FROM beekeepers WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Beekeeper ${id} not found.`,
      });
    }

    const hiveList = Array.isArray(hives)
      ? hives.map(h => String(h).trim()).filter(Boolean)
      : typeof hives === 'string'
        ? hives.split(',').map(h => h.trim()).filter(Boolean)
        : JSON.parse(existing.hives);

    const updateStmt = db.prepare(`
      UPDATE beekeepers
      SET name = @name, location = @location, hives = @hives, rating = @rating, registration_date = @registration_date
      WHERE id = @id
    `);

    updateStmt.run({
      id,
      name: (name || existing.name).trim(),
      location: (location || existing.location).trim(),
      hives: JSON.stringify(hiveList),
      rating: rating ? Math.min(Math.max(parseFloat(rating), 1), 5) : existing.rating,
      registration_date: registrationDate || existing.registration_date,
    });

    db.prepare('INSERT INTO audit_logs (action, actor_role, actor_id, details) VALUES (?, ?, ?, ?)').run(
      'ADMIN_UPDATE_BEEKEEPER',
      req.user?.role || 'admin',
      String(req.user?.id || 'admin'),
      `Updated beekeeper ${id} profile and hive mappings`
    );

    return res.status(200).json({
      success: true,
      message: `Beekeeper ${id} updated successfully`,
    });
  } catch (error) {
    next(error);
  }
}

export function deleteBeekeeper(req, res, next) {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM beekeepers WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Beekeeper ${id} not found.`,
      });
    }

    // Remove beekeeper batches and certificates
    db.prepare('DELETE FROM lab_certificates WHERE beekeeper_id = ?').run(id);
    db.prepare('DELETE FROM batches WHERE beekeeper_id = ?').run(id);
    db.prepare('DELETE FROM beekeepers WHERE id = ?').run(id);
    db.prepare('DELETE FROM users WHERE identifier = ?').run(id);

    db.prepare('INSERT INTO audit_logs (action, actor_role, actor_id, details) VALUES (?, ?, ?, ?)').run(
      'ADMIN_DELETE_BEEKEEPER',
      req.user?.role || 'admin',
      String(req.user?.id || 'admin'),
      `Deleted beekeeper ${id} (${existing.name}) and all associated batches`
    );

    return res.status(200).json({
      success: true,
      message: `Beekeeper ${id} and associated batches deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
}
