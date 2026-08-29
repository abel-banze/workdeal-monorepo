const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:202604@localhost:5432/workdeeal_monorepo' });
(async () => {
  const res = await pool.query(`
    SELECT status, type,
      count(*) AS total,
      count(latitude) AS with_lat,
      count(longitude) AS with_lng,
      count(geom) AS with_geom
    FROM profile
    GROUP BY status, type
    ORDER BY type, status
  `);
  console.log('--- profile geo cols by status/type ---');
  console.table(res.rows);
  const noLat = await pool.query(`SELECT count(*) AS c FROM profile WHERE latitude IS NULL AND status='active'`);
  console.log('active profiles with NULL lat:', noLat.rows[0].c);
  const sample = await pool.query(`
    SELECT id, name, status, type, latitude, longitude, geom IS NOT NULL AS has_geom
    FROM profile
    WHERE latitude IS NOT NULL
    ORDER BY updated_at DESC LIMIT 10
  `);
  console.log('--- sample with lat ---');
  console.table(sample.rows);
  await pool.end();
})();
