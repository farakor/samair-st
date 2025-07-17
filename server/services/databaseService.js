const { query } = require('../config/database');

class DatabaseService {
  // Сохранение информации о файле
  async saveFileInfo(fileInfo) {
    try {
      const result = await query(
        `INSERT INTO uploaded_files 
         (file_id, date, file_name, size, author, uploaded_at, status, flights_count, source, file_info)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (file_id) DO UPDATE SET
         status = EXCLUDED.status,
         flights_count = EXCLUDED.flights_count,
         error_message = EXCLUDED.error_message
         RETURNING *`,
        [
          fileInfo.id,
          fileInfo.date,
          fileInfo.fileName,
          fileInfo.size,
          fileInfo.author,
          fileInfo.uploadedAt,
          fileInfo.status,
          fileInfo.flightsCount || 0,
          fileInfo.source || 'manual',
          JSON.stringify(fileInfo.fileInfo || {})
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Ошибка сохранения информации о файле:', error);
      throw error;
    }
  }

  // Получение всех файлов
  async getAllFiles() {
    try {
      const result = await query(
        `SELECT * FROM uploaded_files ORDER BY uploaded_at DESC`
      );
      return result.rows.map(row => ({
        id: row.file_id,
        date: row.date,
        fileName: row.file_name,
        size: row.size,
        author: row.author,
        uploadedAt: row.uploaded_at,
        status: row.status,
        flightsCount: row.flights_count,
        error: row.error_message,
        source: row.source,
        fileInfo: row.file_info
      }));
    } catch (error) {
      console.error('Ошибка получения файлов:', error);
      throw error;
    }
  }

  // Удаление файла
  async deleteFile(fileId) {
    try {
      await query('DELETE FROM uploaded_files WHERE file_id = $1', [fileId]);
      await query('DELETE FROM flight_data WHERE flight_id LIKE $1', [`%${fileId}%`]);
    } catch (error) {
      console.error('Ошибка удаления файла:', error);
      throw error;
    }
  }

  // Сохранение данных рейсов
  async saveFlightData(flights) {
    try {
      const values = [];
      const placeholders = [];
      
      flights.forEach((flight, index) => {
        const baseIndex = index * 17;
        placeholders.push(
          `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14}, $${baseIndex + 15}, $${baseIndex + 16}, $${baseIndex + 17})`
        );
        
        values.push(
          flight.id,
          flight.number || '',
          flight.date || '',
          flight.aircraftType || '',
          flight.departure || '',
          flight.arrival || '',
          flight.departureTime || '',
          flight.arrivalTime || '',
          flight.flightTime || '',
          flight.configuration || '',
          flight.passengers || '',
          flight.paxPercentage || '',
          flight.baggage || '',
          flight.crew || '',
          flight.sourceFile || '',
          flight.uploadedAt || Date.now(),
          flight.source || 'manual'
        );
      });

      if (values.length > 0) {
        const queryText = `
          INSERT INTO flight_data 
          (flight_id, number, date, aircraft_type, departure, arrival, departure_time, arrival_time, flight_time, configuration, passengers, pax_percentage, baggage, crew, source_file, uploaded_at, source)
          VALUES ${placeholders.join(', ')}
          ON CONFLICT (flight_id) DO NOTHING
        `;
        
        await query(queryText, values);
        console.log(`Сохранено ${flights.length} рейсов в базу данных`);
      }
    } catch (error) {
      console.error('Ошибка сохранения данных рейсов:', error);
      throw error;
    }
  }

  // Получение всех данных рейсов с фильтрацией
  async getFlightData(filters = {}) {
    try {
      let queryText = 'SELECT * FROM flight_data WHERE 1=1';
      const queryParams = [];
      let paramIndex = 1;

      // Фильтрация по дате
      if (filters.dateFrom) {
        queryText += ` AND date >= $${paramIndex}`;
        queryParams.push(filters.dateFrom);
        paramIndex++;
      }
      
      if (filters.dateTo) {
        queryText += ` AND date <= $${paramIndex}`;
        queryParams.push(filters.dateTo);
        paramIndex++;
      }

      // Фильтрация по типу ВС
      if (filters.aircraftType) {
        queryText += ` AND aircraft_type ILIKE $${paramIndex}`;
        queryParams.push(`%${filters.aircraftType}%`);
        paramIndex++;
      }

      // Фильтрация по аэропорту
      if (filters.airport) {
        queryText += ` AND (departure ILIKE $${paramIndex} OR arrival ILIKE $${paramIndex + 1})`;
        queryParams.push(`%${filters.airport}%`, `%${filters.airport}%`);
        paramIndex += 2;
      }

      // Сортировка
      queryText += ' ORDER BY date DESC, created_at DESC';

      const result = await query(queryText, queryParams);
      
      return result.rows.map(row => ({
        id: row.flight_id,
        number: row.number,
        date: row.date,
        aircraftType: row.aircraft_type,
        departure: row.departure,
        arrival: row.arrival,
        departureTime: row.departure_time,
        arrivalTime: row.arrival_time,
        flightTime: row.flight_time,
        configuration: row.configuration,
        passengers: row.passengers,
        paxPercentage: row.pax_percentage,
        baggage: row.baggage,
        crew: row.crew,
        sourceFile: row.source_file,
        uploadedAt: row.uploaded_at,
        source: row.source
      }));
    } catch (error) {
      console.error('Ошибка получения данных рейсов:', error);
      throw error;
    }
  }

  // Получение статистики
  async getFlightStats() {
    try {
      const [flightsResult, filesResult] = await Promise.all([
        query('SELECT COUNT(*) as total_flights FROM flight_data'),
        query(`
          SELECT 
            COUNT(*) as total_files,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_files,
            COUNT(CASE WHEN status = 'error' THEN 1 END) as error_files,
            COUNT(CASE WHEN source = 'email' THEN 1 END) as email_files,
            COUNT(CASE WHEN source = 'manual' THEN 1 END) as manual_files
          FROM uploaded_files
        `)
      ]);

      return {
        totalFlights: parseInt(flightsResult.rows[0].total_flights),
        totalFiles: parseInt(filesResult.rows[0].total_files),
        completedFiles: parseInt(filesResult.rows[0].completed_files),
        errorFiles: parseInt(filesResult.rows[0].error_files),
        emailFiles: parseInt(filesResult.rows[0].email_files),
        manualFiles: parseInt(filesResult.rows[0].manual_files)
      };
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      throw error;
    }
  }

  // Очистка всех данных
  async clearAllData() {
    try {
      await query('DELETE FROM flight_data');
      await query('DELETE FROM uploaded_files');
      console.log('Все данные очищены из базы');
    } catch (error) {
      console.error('Ошибка очистки данных:', error);
      throw error;
    }
  }

  // Удаление данных рейсов по источнику файла
  async deleteFlightsBySourceFile(sourceFile) {
    try {
      const result = await query('DELETE FROM flight_data WHERE source_file = $1', [sourceFile]);
      return result.rowCount;
    } catch (error) {
      console.error('Ошибка удаления рейсов по файлу:', error);
      throw error;
    }
  }
}

module.exports = new DatabaseService(); 