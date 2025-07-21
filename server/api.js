const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq, sql } = require('drizzle-orm');

// Configurar la base de datos
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// Esquemas de base de datos (versión JS)
const visitors = {
  id: 'serial',
  ip: 'varchar',
  country: 'varchar',
  countryCode: 'varchar',
  region: 'varchar',
  city: 'varchar',
  timezone: 'varchar',
  org: 'text',
  userAgent: 'text',
  firstVisit: 'timestamp',
  lastVisit: 'timestamp',
  visitCount: 'integer',
};

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Crear tablas si no existen
async function initDatabase() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        country VARCHAR(100),
        country_code VARCHAR(2),
        region VARCHAR(100),
        city VARCHAR(100),
        timezone VARCHAR(100),
        org TEXT,
        user_agent TEXT,
        first_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        visit_count INTEGER DEFAULT 1
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS country_stats (
        id SERIAL PRIMARY KEY,
        country VARCHAR(100) UNIQUE NOT NULL,
        country_code VARCHAR(2),
        total_visitors INTEGER DEFAULT 0,
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS global_stats (
        id SERIAL PRIMARY KEY,
        total_visitors INTEGER DEFAULT 0,
        total_countries INTEGER DEFAULT 0,
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insertar estadísticas globales iniciales si no existen
    const existingGlobalStats = await db.execute(sql`SELECT * FROM global_stats LIMIT 1`);
    if (existingGlobalStats.rows.length === 0) {
      await db.execute(sql`INSERT INTO global_stats (total_visitors, total_countries) VALUES (0, 0)`);
    }

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  }
}

// Función para obtener IP real del cliente
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip;
}

// API: Registrar nueva visita
app.post('/api/visit', async (req, res) => {
  try {
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const { 
      country, 
      countryCode, 
      region, 
      city, 
      timezone, 
      org 
    } = req.body;

    // Verificar si ya existe este visitante (por IP)
    const existingVisitor = await db.execute(
      sql`SELECT * FROM visitors WHERE ip = ${clientIP} LIMIT 1`
    );

    let visitorData;

    if (existingVisitor.rows.length > 0) {
      // Actualizar visitante existente
      await db.execute(sql`
        UPDATE visitors 
        SET last_visit = CURRENT_TIMESTAMP, 
            visit_count = visit_count + 1,
            country = ${country},
            country_code = ${countryCode},
            region = ${region},
            city = ${city},
            timezone = ${timezone},
            org = ${org}
        WHERE ip = ${clientIP}
      `);
      
      const updatedVisitor = await db.execute(
        sql`SELECT * FROM visitors WHERE ip = ${clientIP} LIMIT 1`
      );
      visitorData = updatedVisitor.rows[0];
    } else {
      // Insertar nuevo visitante
      const newVisitor = await db.execute(sql`
        INSERT INTO visitors (ip, country, country_code, region, city, timezone, org, user_agent) 
        VALUES (${clientIP}, ${country}, ${countryCode}, ${region}, ${city}, ${timezone}, ${org}, ${userAgent})
        RETURNING *
      `);
      visitorData = newVisitor.rows[0];

      // Actualizar estadísticas globales (nuevo visitante único)
      await db.execute(sql`
        UPDATE global_stats 
        SET total_visitors = total_visitors + 1, 
            last_update = CURRENT_TIMESTAMP
        WHERE id = 1
      `);
    }

    // Actualizar estadísticas por país
    if (country && country !== 'Desconocido') {
      const existingCountry = await db.execute(
        sql`SELECT * FROM country_stats WHERE country = ${country} LIMIT 1`
      );

      if (existingCountry.rows.length > 0) {
        // Solo incrementar si es un nuevo visitante único (no una visita repetida)
        if (existingVisitor.rows.length === 0) {
          await db.execute(sql`
            UPDATE country_stats 
            SET total_visitors = total_visitors + 1, 
                last_update = CURRENT_TIMESTAMP
            WHERE country = ${country}
          `);
        }
      } else {
        await db.execute(sql`
          INSERT INTO country_stats (country, country_code, total_visitors) 
          VALUES (${country}, ${countryCode}, 1)
        `);

        // Actualizar contador de países
        await db.execute(sql`
          UPDATE global_stats 
          SET total_countries = total_countries + 1, 
              last_update = CURRENT_TIMESTAMP
          WHERE id = 1
        `);
      }
    }

    res.json({
      success: true,
      visitor: visitorData,
      isNewVisitor: existingVisitor.rows.length === 0
    });

  } catch (error) {
    console.error('Error registrando visita:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// API: Obtener estadísticas globales
app.get('/api/stats', async (req, res) => {
  try {
    // Estadísticas globales
    const globalStats = await db.execute(sql`SELECT * FROM global_stats LIMIT 1`);
    
    // Estadísticas por país (top 10)
    const countryStats = await db.execute(sql`
      SELECT * FROM country_stats 
      ORDER BY total_visitors DESC 
      LIMIT 10
    `);

    // Total de visitas (incluyendo repetidas)
    const totalVisits = await db.execute(sql`
      SELECT COALESCE(SUM(visit_count), 0) as total FROM visitors
    `);

    res.json({
      success: true,
      data: {
        totalVisitors: globalStats.rows[0]?.total_visitors || 0,
        totalCountries: globalStats.rows[0]?.total_countries || 0,
        totalVisits: totalVisits.rows[0]?.total || 0,
        countryStats: countryStats.rows || [],
        lastUpdate: globalStats.rows[0]?.last_update || new Date()
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// API: Resetear estadísticas (solo para desarrollo)
app.post('/api/reset', async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM visitors`);
    await db.execute(sql`DELETE FROM country_stats`);
    await db.execute(sql`UPDATE global_stats SET total_visitors = 0, total_countries = 0`);
    
    res.json({ success: true, message: 'Estadísticas reseteadas' });
  } catch (error) {
    console.error('Error reseteando estadísticas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Servir archivos estáticos
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Inicializar servidor
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📊 API de estadísticas disponible en /api/stats`);
    console.log(`📝 Registro de visitas en /api/visit`);
  });
}

startServer().catch(console.error);