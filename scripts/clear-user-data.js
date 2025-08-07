#!/usr/bin/env node
/**
 * Скрипт для полной очистки всех пользовательских данных
 * Удаляет:
 * - Данные рейсов из PostgreSQL
 * - Информацию о файлах из PostgreSQL  
 * - Загруженные файлы из папки uploads
 * - Email логи
 * 
 * ВНИМАНИЕ: Это действие необратимо!
 */

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

// Импортируем базу данных
const { query, testConnection } = require('../server/config/database');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function clearUserData() {
  console.log('\n🧹 СКРИПТ ОЧИСТКИ ПОЛЬЗОВАТЕЛЬСКИХ ДАННЫХ');
  console.log('=========================================\n');
  
  console.log('⚠️  ВНИМАНИЕ: Этот скрипт удалит ВСЕ пользовательские данные:');
  console.log('   - Все рейсы из базы данных PostgreSQL');
  console.log('   - Все загруженные файлы из базы данных');
  console.log('   - Все файлы из папки uploads');
  console.log('   - Email логи');
  console.log('   - НЕ затронет: пользователи и настройки email\n');
  
  const confirmation1 = await askQuestion('Вы уверены, что хотите продолжить? (да/нет): ');
  
  if (confirmation1.toLowerCase() !== 'да' && confirmation1.toLowerCase() !== 'yes') {
    console.log('❌ Операция отменена пользователем');
    rl.close();
    return;
  }
  
  const confirmation2 = await askQuestion('🔴 ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ: Все данные будут потеряны! Продолжить? (УДАЛИТЬ/нет): ');
  
  if (confirmation2 !== 'УДАЛИТЬ') {
    console.log('❌ Операция отменена пользователем');
    rl.close();
    return;
  }
  
  console.log('\n🚀 Начинаем очистку данных...\n');
  
  try {
    // 1. Проверяем подключение к базе данных
    console.log('1️⃣ Проверяем подключение к PostgreSQL...');
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Подключение к PostgreSQL успешно');
      
      // 2. Получаем статистику перед удалением
      console.log('\n2️⃣ Получаем текущую статистику...');
      try {
        const flightsCount = await query('SELECT COUNT(*) as count FROM flight_data');
        const filesCount = await query('SELECT COUNT(*) as count FROM uploaded_files');
        
        console.log(`📊 Текущие данные в базе:`);
        console.log(`   - Рейсов: ${flightsCount.rows[0].count}`);
        console.log(`   - Файлов: ${filesCount.rows[0].count}`);
      } catch (error) {
        console.log('⚠️  Не удалось получить статистику (возможно, таблицы не существуют)');
      }
      
      // 3. Очищаем данные рейсов
      console.log('\n3️⃣ Очищаем данные рейсов...');
      const flightsResult = await query('DELETE FROM flight_data');
      console.log(`✅ Удалено ${flightsResult.rowCount} записей рейсов`);
      
      // 4. Очищаем информацию о файлах
      console.log('\n4️⃣ Очищаем информацию о файлах...');
      const filesResult = await query('DELETE FROM uploaded_files');
      console.log(`✅ Удалено ${filesResult.rowCount} записей о файлах`);
      
      console.log('✅ База данных очищена успешно');
    } else {
      console.log('⚠️  PostgreSQL недоступен, пропускаем очистку базы данных');
    }
    
    // 5. Очищаем папку uploads
    console.log('\n5️⃣ Очищаем папку uploads...');
    const uploadsDir = path.join(__dirname, '../server/data/uploads');
    
    if (await fs.pathExists(uploadsDir)) {
      const files = await fs.readdir(uploadsDir);
      const filesToDelete = files.filter(file => file !== '.DS_Store');
      
      if (filesToDelete.length > 0) {
        for (const file of filesToDelete) {
          const filePath = path.join(uploadsDir, file);
          await fs.remove(filePath);
          console.log(`🗑️  Удален файл: ${file}`);
        }
        console.log(`✅ Удалено ${filesToDelete.length} файлов из папки uploads`);
      } else {
        console.log('📂 Папка uploads уже пуста');
      }
    } else {
      console.log('📂 Папка uploads не найдена');
    }
    
    // 6. Очищаем email логи
    console.log('\n6️⃣ Очищаем email логи...');
    const emailLogsPath = path.join(__dirname, '../server/data/config/email-logs.json');
    
    if (await fs.pathExists(emailLogsPath)) {
      // Создаем пустой массив логов
      const emptyLogs = [];
      await fs.writeJSON(emailLogsPath, emptyLogs, { spaces: 2 });
      console.log('✅ Email логи очищены');
    } else {
      console.log('📂 Файл email логов не найден');
    }
    
    console.log('\n🎉 ОЧИСТКА ЗАВЕРШЕНА УСПЕШНО!');
    console.log('=============================\n');
    console.log('Очищены:');
    console.log('✅ Все рейсы из базы данных');
    console.log('✅ Все файлы из базы данных');  
    console.log('✅ Все файлы из папки uploads');
    console.log('✅ Email логи');
    console.log('\nСохранены:');
    console.log('📋 Пользователи и их права доступа');
    console.log('📋 Настройки email');
    console.log('📋 Конфигурация системы');
    
    console.log('\n💡 Примечание: IndexedDB в браузере пользователей очистится автоматически при следующем входе в систему\n');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ПРИ ОЧИСТКЕ ДАННЫХ:', error);
    console.error('❌ Стек ошибки:', error.stack);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Запускаем скрипт
clearUserData().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});