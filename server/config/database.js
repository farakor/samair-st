const { Pool } = require('pg');

// Конфигурация базы данных
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'samair_db',
  user: process.env.DB_USER || 'samair_user',
  password: process.env.DB_PASSWORD || 'samair_password',
  max: 20, // максимальное количество подключений в пуле
  idleTimeoutMillis: 30000, // закрыть подключения после 30 секунд бездействия
  connectionTimeoutMillis: 2000, // время ожидания подключения
};

// Создаем пул подключений
const pool = new Pool(dbConfig);

// Обработчик ошибок
pool.on('error', (err) => {
  console.error('Неожиданная ошибка PostgreSQL:', err);
});

// Функция для выполнения запросов
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Ошибка выполнения запроса:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Функция для инициализации базы данных
const initDatabase = async () => {
  try {
    console.log('🚀 Инициализация базы данных...');
    
    // Проверяем подключение
    console.log('🔍 Проверяем подключение к PostgreSQL...');
    const connectionTest = await query('SELECT NOW()');
    console.log('✅ Подключение к PostgreSQL успешно:', connectionTest.rows[0]);
    
    console.log('📋 Создание таблицы uploaded_files...');
    // Создаем таблицу для файлов
    await query(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id SERIAL PRIMARY KEY,
        file_id VARCHAR(255) UNIQUE NOT NULL,
        date VARCHAR(50),
        file_name VARCHAR(255) NOT NULL,
        size VARCHAR(50),
        author VARCHAR(255),
        uploaded_at BIGINT,
        status VARCHAR(50) DEFAULT 'processing',
        flights_count INTEGER DEFAULT 0,
        error_message TEXT,
        source VARCHAR(50) DEFAULT 'manual',
        file_info JSONB,
        email_subject TEXT,
        email_date VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Таблица uploaded_files создана/проверена');

    console.log('🔧 Добавление новых колонок в uploaded_files...');
    // Добавляем новые колонки если они не существуют (миграция)
    await query(`
      ALTER TABLE uploaded_files 
      ADD COLUMN IF NOT EXISTS email_subject TEXT,
      ADD COLUMN IF NOT EXISTS email_date VARCHAR(50)
    `);
    console.log('✅ Колонки email_subject и email_date добавлены/проверены');

    console.log('📋 Создание таблицы flight_data...');
    // Создаем таблицу для данных рейсов
    await query(`
      CREATE TABLE IF NOT EXISTS flight_data (
        id SERIAL PRIMARY KEY,
        flight_id VARCHAR(255) UNIQUE NOT NULL,
        number VARCHAR(100),
        date VARCHAR(50),
        aircraft_type VARCHAR(100),
        departure VARCHAR(100),
        arrival VARCHAR(100),
        departure_time VARCHAR(50),
        arrival_time VARCHAR(50),
        flight_time VARCHAR(50),
        configuration VARCHAR(200),
        passengers VARCHAR(100),
        pax_percentage VARCHAR(50),
        baggage VARCHAR(100),
        crew TEXT,
        source_file VARCHAR(255),
        uploaded_at BIGINT,
        source VARCHAR(50) DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Таблица flight_data создана/проверена');

    console.log('🔧 Обновление колонок в flight_data...');
    // Обновляем существующие колонки если они слишком маленькие (миграция)
    await query(`
      ALTER TABLE flight_data 
      ALTER COLUMN configuration TYPE VARCHAR(200),
      ALTER COLUMN passengers TYPE VARCHAR(100),
      ALTER COLUMN baggage TYPE VARCHAR(100),
      ALTER COLUMN crew TYPE TEXT
    `);
    console.log('✅ Колонки в flight_data обновлены');

    console.log('📂 Создание индексов...');
    // Создаем индексы для оптимизации запросов
    await query(`
      CREATE INDEX IF NOT EXISTS idx_flight_data_date ON flight_data(date);
      CREATE INDEX IF NOT EXISTS idx_flight_data_aircraft_type ON flight_data(aircraft_type);
      CREATE INDEX IF NOT EXISTS idx_flight_data_departure ON flight_data(departure);
      CREATE INDEX IF NOT EXISTS idx_flight_data_arrival ON flight_data(arrival);
      CREATE INDEX IF NOT EXISTS idx_flight_data_source_file ON flight_data(source_file);
      CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_id ON uploaded_files(file_id);
    `);
    console.log('✅ Индексы созданы/проверены');

    // Проверяем, что таблицы действительно существуют
    console.log('🔍 Проверяем существование таблиц...');
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('uploaded_files', 'flight_data')
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    console.log('📋 Существующие таблицы:', existingTables);
    
    if (existingTables.includes('uploaded_files') && existingTables.includes('flight_data')) {
      console.log('✅ Все необходимые таблицы присутствуют');
    } else {
      console.error('❌ Некоторые таблицы отсутствуют!');
    }

    // Проверяем количество записей в таблицах
    const filesCount = await query('SELECT COUNT(*) as count FROM uploaded_files');
    const flightsCount = await query('SELECT COUNT(*) as count FROM flight_data');
    
    console.log(`📊 Статистика базы данных:`);
    console.log(`   - Файлов в базе: ${filesCount.rows[0].count}`);
    console.log(`   - Рейсов в базе: ${flightsCount.rows[0].count}`);

    console.log('🎉 База данных инициализирована успешно');
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
    console.error('❌ Стек ошибки:', error.stack);
    throw error;
  }
};

// Функция для проверки подключения
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    console.log('Подключение к PostgreSQL успешно:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Ошибка подключения к PostgreSQL:', error);
    return false;
  }
};

module.exports = {
  pool,
  query,
  initDatabase,
  testConnection
}; 