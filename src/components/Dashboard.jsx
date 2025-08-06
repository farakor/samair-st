import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { format, getYear, getMonth, parseISO, isValid, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import DatePicker from 'react-datepicker';
import { ru } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import Sidebar from './Sidebar';
import { usePDF } from 'react-to-pdf';
import { useFiles } from '../context/FilesContext';

const COLORS = ['#1E40AF', '#F59E0B', '#65A30D'];

// Функция для проверки валидности даты
const isValidDate = (date) => date && date instanceof Date && !isNaN(date.getTime());

// Функция для парсинга даты из строки в российском формате
const parseRussianDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // Проверяем формат DD.MM.YYYY
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isValidDate(date) ? date : null;
  }

  return null;
};

// Функция для парсинга времени из строки (например "14:30" или "14:30:00")
const parseTimeString = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;

  // Убираем пробелы и проверяем формат
  const cleanTime = timeStr.trim();
  const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return hour;
    }
  }

  return null;
};

// Функция для парсинга времени в пути (например "02:15" -> 135 минут)
const parseFlightTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const cleanTime = timeStr.trim();
  const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);

  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    return hours * 60 + minutes; // возвращаем общее количество минут
  }

  return null;
};

// Функция для получения дня недели из даты
const getDayOfWeek = (dateStr) => {
  const date = parseRussianDate(dateStr);
  if (!date) return null;

  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[date.getDay()];
};

// Функция для вычисления изменений по сравнению с предыдущим периодом
const calculateTrends = (flightData) => {
  if (!flightData || flightData.length === 0) {
    return { flightsChange: 0, passengersChange: 0, occupancyChange: 0 };
  }

  // Группируем данные по месяцам
  const monthlyData = {};
  flightData.forEach(flight => {
    const flightDate = parseRussianDate(flight.date);
    if (flightDate) {
      const monthKey = format(flightDate, 'yyyy-MM');
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { flights: 0, passengers: 0 };
      }
      monthlyData[monthKey].flights += 1;
      monthlyData[monthKey].passengers += parseInt(flight.passengers) || 0;
    }
  });

  const months = Object.keys(monthlyData).sort();
  if (months.length < 2) {
    return { flightsChange: 0, passengersChange: 0, occupancyChange: 0 };
  }

  const currentMonth = monthlyData[months[months.length - 1]];
  const previousMonth = monthlyData[months[months.length - 2]];

  const flightsChange = previousMonth.flights === 0 ? 0 :
    ((currentMonth.flights - previousMonth.flights) / previousMonth.flights * 100);

  const passengersChange = previousMonth.passengers === 0 ? 0 :
    ((currentMonth.passengers - previousMonth.passengers) / previousMonth.passengers * 100);

  const currentOccupancy = currentMonth.flights === 0 ? 0 : currentMonth.passengers / currentMonth.flights;
  const previousOccupancy = previousMonth.flights === 0 ? 0 : previousMonth.passengers / previousMonth.flights;
  const occupancyChange = previousOccupancy === 0 ? 0 :
    ((currentOccupancy - previousOccupancy) / previousOccupancy * 100);

  return {
    flightsChange: Math.round(flightsChange * 10) / 10,
    passengersChange: Math.round(passengersChange * 10) / 10,
    occupancyChange: Math.round(occupancyChange * 10) / 10
  };
};

// Функция для обработки данных рейсов в данные для графиков
const processFlightData = (flightData, startDate, endDate, selectedAircraftType, selectedAirport) => {
  if (!flightData || flightData.length === 0) {
    return {
      flights: [],
      aircraftTypes: [],
      aircraftPassengerTypes: [],
      routePassengers: [],
      routeFlights: [],
      totalFlights: 0,
      totalPassengers: 0,
      averageOccupancy: 0,
      trends: { flightsChange: 0, passengersChange: 0, occupancyChange: 0 },
      cardTrends: {
        flights: [],
        passengers: [],
        occupancy: []
      }
    };
  }

  // Фильтруем данные по датам если заданы
  let filteredFlights = flightData.filter(flight => {
    const flightDate = parseRussianDate(flight.date);
    if (!flightDate) return false;

    if (startDate && flightDate < startDate) return false;
    if (endDate && flightDate > endDate) return false;

    return true;
  });

  // Применяем фильтры по типу ВС и аэропорту
  if (selectedAircraftType) {
    filteredFlights = filteredFlights.filter(flight => flight.aircraftType && flight.aircraftType.trim() === selectedAircraftType);
  }
  if (selectedAirport) {
    filteredFlights = filteredFlights.filter(flight => flight.departure && flight.arrival &&
      (flight.departure.trim() === selectedAirport || flight.arrival.trim() === selectedAirport));
  }

  // Группируем рейсы по месяцам для графика количества рейсов
  const monthlyFlights = {};
  filteredFlights.forEach(flight => {
    const flightDate = parseRussianDate(flight.date);
    if (flightDate) {
      const monthKey = format(flightDate, 'yyyy-MM');
      monthlyFlights[monthKey] = (monthlyFlights[monthKey] || 0) + 1;
    }
  });

  const flightsData = Object.entries(monthlyFlights)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      date: month,
      value: count
    }));

  // Создаем данные для мини-графиков карточек
  const monthlyPassengers = {};
  const monthlyOccupancy = {};

  filteredFlights.forEach(flight => {
    const flightDate = parseRussianDate(flight.date);
    if (flightDate) {
      const monthKey = format(flightDate, 'yyyy-MM');

      // Подсчитываем пассажиров по месяцам
      if (!monthlyPassengers[monthKey]) {
        monthlyPassengers[monthKey] = 0;
      }
      monthlyPassengers[monthKey] += parseInt(flight.passengers) || 0;

      // Для расчета средней заполняемости по месяцам
      if (!monthlyOccupancy[monthKey]) {
        monthlyOccupancy[monthKey] = { totalPassengers: 0, totalFlights: 0 };
      }
      monthlyOccupancy[monthKey].totalPassengers += parseInt(flight.passengers) || 0;
      monthlyOccupancy[monthKey].totalFlights += 1;
    }
  });

  // Создаем тренды для карточек
  const flightsTrend = Object.entries(monthlyFlights)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, value: count }));

  const passengersTrend = Object.entries(monthlyPassengers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, value: count }));

  const occupancyTrend = Object.entries(monthlyOccupancy)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      value: data.totalFlights > 0 ? Math.round((data.totalPassengers / data.totalFlights) * 10) / 10 : 0
    }));

  // Группируем по типам ВС
  const aircraftCount = {}; // Количество рейсов по типам ВС
  const aircraftPassengerCount = {}; // Количество пассажиров по типам ВС

  filteredFlights.forEach(flight => {
    if (flight.aircraftType) {
      const type = flight.aircraftType.trim();

      // Считаем рейсы
      aircraftCount[type] = (aircraftCount[type] || 0) + 1;

      // Считаем пассажиров из колонки "ADLT+CHLD+INF"
      const passengers = parseInt(flight.passengers) || 0;
      aircraftPassengerCount[type] = (aircraftPassengerCount[type] || 0) + passengers;
    }
  });

  // Данные для графика "Распределение по типу ВС" (количество рейсов)
  const aircraftTypes = Object.entries(aircraftCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) // Берем топ 5
    .map(([name, value]) => ({ name, value }));

  // Данные для графика "Распределение по типу ВС (пассажиры)" (количество пассажиров)
  const aircraftPassengerTypes = Object.entries(aircraftPassengerCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) // Берем топ 5
    .map(([name, value]) => ({ name, value }));

  // Группируем по маршрутам для пассажиров
  const routePassengerCount = {};
  const routeFlightCount = {};

  filteredFlights.forEach(flight => {
    if (flight.departure && flight.arrival) {
      const route = `${flight.departure}-${flight.arrival}`;

      // Считаем рейсы по маршрутам
      routeFlightCount[route] = (routeFlightCount[route] || 0) + 1;

      // Считаем пассажиров по маршрутам
      const passengers = parseInt(flight.passengers) || 0;
      routePassengerCount[route] = (routePassengerCount[route] || 0) + passengers;
    }
  });

  const routePassengers = Object.entries(routePassengerCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10) // Берем топ 10
    .map(([route, value]) => ({ route, value }));

  const routeFlights = Object.entries(routeFlightCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10) // Берем топ 10
    .map(([route, value]) => ({ route, value }));

  // Вычисляем общую статистику
  const totalFlights = filteredFlights.length;
  const totalPassengers = filteredFlights.reduce((sum, flight) => {
    return sum + (parseInt(flight.passengers) || 0);
  }, 0);

  // Средняя заполняемость (среднее количество пассажиров на рейс)
  const averageOccupancy = totalFlights > 0 ? (totalPassengers / totalFlights).toFixed(1) : 0;

  // Вычисляем тренды
  const trends = calculateTrends(filteredFlights);

  // ======= НОВЫЕ ГРАФИКИ =======

  // 1. Эффективность по размеру самолета (пассажиры/рейс)
  const aircraftEfficiencyData = {};
  filteredFlights.forEach(flight => {
    if (flight.aircraftType) {
      const type = flight.aircraftType.trim();
      if (!aircraftEfficiencyData[type]) {
        aircraftEfficiencyData[type] = { totalPassengers: 0, totalFlights: 0 };
      }
      aircraftEfficiencyData[type].totalFlights += 1;
      aircraftEfficiencyData[type].totalPassengers += parseInt(flight.passengers) || 0;
    }
  });

  const aircraftEfficiency = Object.entries(aircraftEfficiencyData)
    .map(([type, data]) => ({
      name: type,
      efficiency: data.totalFlights > 0 ? Math.round((data.totalPassengers / data.totalFlights) * 10) / 10 : 0,
      flights: data.totalFlights
    }))
    .filter(item => item.flights >= 3) // Показываем только ВС с минимум 3 рейсами
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 10);

  // 2. Распределение рейсов по часам
  const hourlyData = {};
  filteredFlights.forEach(flight => {
    const hour = parseTimeString(flight.departureTime);
    if (hour !== null) {
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    }
  });

  const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    flights: hourlyData[hour] || 0
  }));

  // 3. Тепловая карта день×час
  const heatmapDataRaw = {};
  filteredFlights.forEach(flight => {
    const dayOfWeek = getDayOfWeek(flight.date);
    const hour = parseTimeString(flight.departureTime);

    if (dayOfWeek && hour !== null) {
      const key = `${dayOfWeek}-${hour}`;
      heatmapDataRaw[key] = (heatmapDataRaw[key] || 0) + 1;
    }
  });

  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const heatmapData = days.map(day => {
    const dayData = { day };
    for (let hour = 0; hour < 24; hour++) {
      dayData[`h${hour}`] = heatmapDataRaw[`${day}-${hour}`] || 0;
    }
    return dayData;
  });

  // 4. Время в пути по маршрутам
  const flightTimeData = {};
  filteredFlights.forEach(flight => {
    if (flight.departure && flight.arrival && flight.flightTime) {
      const route = `${flight.departure}-${flight.arrival}`;
      const timeInMinutes = parseFlightTime(flight.flightTime);

      if (timeInMinutes) {
        if (!flightTimeData[route]) {
          flightTimeData[route] = { totalTime: 0, count: 0 };
        }
        flightTimeData[route].totalTime += timeInMinutes;
        flightTimeData[route].count += 1;
      }
    }
  });

  const flightTimeByRoute = Object.entries(flightTimeData)
    .map(([route, data]) => ({
      route,
      avgTime: Math.round(data.totalTime / data.count), // в минутах
      avgTimeFormatted: `${Math.floor(data.totalTime / data.count / 60)}ч ${Math.round((data.totalTime / data.count) % 60)}м`,
      flights: data.count
    }))
    .filter(item => item.flights >= 2) // Минимум 2 рейса для достоверности
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 15);

  // 5. Топ аэропортов
  const airportData = {};
  filteredFlights.forEach(flight => {
    if (flight.departure) {
      airportData[flight.departure] = (airportData[flight.departure] || 0) + 1;
    }
    if (flight.arrival) {
      airportData[flight.arrival] = (airportData[flight.arrival] || 0) + 1;
    }
  });

  const topAirports = Object.entries(airportData)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([airport, count]) => ({ airport, flights: count }));

  // 6. Средняя загруженность по типам ВС (% PAX)
  const loadFactorData = {};
  filteredFlights.forEach(flight => {
    if (flight.aircraftType && flight.paxPercentage) {
      const type = flight.aircraftType.trim();
      const loadFactor = parseFloat(flight.paxPercentage) || 0;

      if (!loadFactorData[type]) {
        loadFactorData[type] = { totalLoadFactor: 0, count: 0 };
      }
      loadFactorData[type].totalLoadFactor += loadFactor;
      loadFactorData[type].count += 1;
    }
  });

  const loadFactorByAircraft = Object.entries(loadFactorData)
    .map(([type, data]) => ({
      name: type,
      loadFactor: Math.round((data.totalLoadFactor / data.count) * 10) / 10,
      flights: data.count
    }))
    .filter(item => item.flights >= 3)
    .sort((a, b) => b.loadFactor - a.loadFactor)
    .slice(0, 10);

  // 7. Средний вес багажа по маршрутам
  const baggageData = {};
  filteredFlights.forEach(flight => {
    if (flight.departure && flight.arrival && flight.baggage) {
      const route = `${flight.departure}-${flight.arrival}`;
      const baggageWeight = parseFloat(flight.baggage) || 0;

      if (baggageWeight > 0) {
        if (!baggageData[route]) {
          baggageData[route] = { totalBaggage: 0, count: 0 };
        }
        baggageData[route].totalBaggage += baggageWeight;
        baggageData[route].count += 1;
      }
    }
  });

  const baggageByRoute = Object.entries(baggageData)
    .map(([route, data]) => ({
      route,
      avgBaggage: Math.round(data.totalBaggage / data.count),
      flights: data.count
    }))
    .filter(item => item.flights >= 2)
    .sort((a, b) => b.avgBaggage - a.avgBaggage)
    .slice(0, 15);

  return {
    flights: flightsData,
    aircraftTypes,
    aircraftPassengerTypes,
    routePassengers,
    routeFlights,
    totalFlights,
    totalPassengers,
    averageOccupancy: parseFloat(averageOccupancy),
    trends,
    cardTrends: {
      flights: flightsTrend,
      passengers: passengersTrend,
      occupancy: occupancyTrend
    },
    // Новые графики
    aircraftEfficiency,
    hourlyDistribution,
    heatmapData,
    flightTimeByRoute,
    topAirports,
    loadFactorByAircraft,
    baggageByRoute
  };
};

const DashboardPDFContent = ({ data, startDate, endDate }) => {
  const validStartDate = isValidDate(startDate) ? startDate : new Date();
  const validEndDate = isValidDate(endDate) ? endDate : new Date();

  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: '20px', backgroundColor: 'white' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Отчет по рейсам Air Samarkand</h1>
        <p style={{ color: '#666' }}>
          {format(validStartDate, 'dd.MM.yyyy')} - {format(validEndDate, 'dd.MM.yyyy')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>Общее количество рейсов</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '12px' }}>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E40AF', margin: 0 }}>{data.totalFlights.toLocaleString()}</p>
            {data.trends && data.trends.flightsChange !== 0 && (
              <p style={{
                marginLeft: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: data.trends.flightsChange >= 0 ? '#059669' : '#dc2626',
                margin: '0 0 0 8px'
              }}>
                {data.trends.flightsChange >= 0 ? '↗' : '↘'} {Math.abs(data.trends.flightsChange).toFixed(1)}%
              </p>
            )}
          </div>
          {data.cardTrends && data.cardTrends.flights && data.cardTrends.flights.length > 0 && (
            <div style={{ height: '50px', width: '100%' }}>
              <ResponsiveContainer>
                <LineChart data={data.cardTrends.flights}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={data.trends.flightsChange >= 0 ? '#10B981' : '#EF4444'}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>Общее количество пассажиров</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '12px' }}>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E40AF', margin: 0 }}>{data.totalPassengers.toLocaleString()}</p>
            {data.trends && data.trends.passengersChange !== 0 && (
              <p style={{
                marginLeft: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: data.trends.passengersChange >= 0 ? '#059669' : '#dc2626',
                margin: '0 0 0 8px'
              }}>
                {data.trends.passengersChange >= 0 ? '↗' : '↘'} {Math.abs(data.trends.passengersChange).toFixed(1)}%
              </p>
            )}
          </div>
          {data.cardTrends && data.cardTrends.passengers && data.cardTrends.passengers.length > 0 && (
            <div style={{ height: '50px', width: '100%' }}>
              <ResponsiveContainer>
                <LineChart data={data.cardTrends.passengers}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={data.trends.passengersChange >= 0 ? '#10B981' : '#EF4444'}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>Среднее количество пассажиров на рейс</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '12px' }}>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E40AF', margin: 0 }}>{data.averageOccupancy}</p>
            {data.trends && data.trends.occupancyChange !== 0 && (
              <p style={{
                marginLeft: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: data.trends.occupancyChange >= 0 ? '#059669' : '#dc2626',
                margin: '0 0 0 8px'
              }}>
                {data.trends.occupancyChange >= 0 ? '↗' : '↘'} {Math.abs(data.trends.occupancyChange).toFixed(1)}%
              </p>
            )}
          </div>
          {data.cardTrends && data.cardTrends.occupancy && data.cardTrends.occupancy.length > 0 && (
            <div style={{ height: '50px', width: '100%' }}>
              <ResponsiveContainer>
                <LineChart data={data.cardTrends.occupancy}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={data.trends.occupancyChange >= 0 ? '#10B981' : '#EF4444'}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Количество рейсов</h3>
        <div style={{ height: '560px', width: '100%' }}>
          <ResponsiveContainer>
            <LineChart data={data.flights}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#1E40AF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Разбивка по маршрутам (пассажиры)</h3>
          <div style={{ height: '420px' }}>
            <ResponsiveContainer>
              <BarChart data={data.routePassengers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="route" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Разбивка по маршрутам (рейсы)</h3>
          <div style={{ height: '420px' }}>
            <ResponsiveContainer>
              <BarChart data={data.routeFlights} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="route" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {data.aircraftTypes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Распределение по типу ВС</h3>
            <div style={{ height: '390px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.aircraftTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {data.aircraftTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Распределение по типу ВС (пассажиры)</h3>
            <div style={{ height: '390px' }}>
              <ResponsiveContainer>
                <BarChart data={data.aircraftPassengerTypes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1E40AF" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ======= НОВЫЕ ГРАФИКИ В PDF ======= */}

      {/* Эффективность по типам ВС */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Эффективность по типам ВС</h3>
        <div style={{ height: '200px' }}>
          <ResponsiveContainer>
            <BarChart data={data.aircraftEfficiency || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize: '10px' }} />
              <YAxis style={{ fontSize: '10px' }} />
              <Tooltip formatter={(value) => [`${value} пассажиров/рейс`, 'Эффективность']} />
              <Bar dataKey="efficiency" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Распределение по часам */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Распределение рейсов по часам</h3>
        <div style={{ height: '200px' }}>
          <ResponsiveContainer>
            <BarChart data={data.hourlyDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" style={{ fontSize: '10px' }} />
              <YAxis style={{ fontSize: '10px' }} />
              <Tooltip formatter={(value) => [`${value} рейсов`, 'Количество']} />
              <Bar dataKey="flights" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Время в пути и Топ аэропортов */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Время в пути */}
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Время в пути по маршрутам</h3>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer>
              <BarChart
                data={data.flightTimeByRoute?.slice(0, 8) || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" style={{ fontSize: '10px' }} />
                <YAxis dataKey="route" type="category" width={80} style={{ fontSize: '10px' }} />
                <Tooltip formatter={(value, name, props) => [props.payload?.avgTimeFormatted || value, 'Время']} />
                <Bar dataKey="avgTime" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Топ аэропортов */}
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Топ аэропортов</h3>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer>
              <BarChart
                data={data.topAirports?.slice(0, 8) || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" style={{ fontSize: '10px' }} />
                <YAxis dataKey="airport" type="category" width={60} style={{ fontSize: '10px' }} />
                <Tooltip formatter={(value) => [`${value} рейсов`, 'Количество']} />
                <Bar dataKey="flights" fill="#06B6D4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Загруженность ВС и Багаж по маршрутам */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Загруженность по типам ВС */}
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Загруженность по типам ВС</h3>
          <div style={{ height: '400px' }}>
            <ResponsiveContainer>
              <BarChart data={data.loadFactorByAircraft || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '10px' }} />
                <YAxis style={{ fontSize: '10px' }} />
                <Tooltip formatter={(value) => [`${value}%`, 'Загруженность']} />
                <Bar dataKey="loadFactor" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Багаж по маршрутам */}
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Багаж по маршрутам</h3>
          <div style={{ height: '400px' }}>
            <ResponsiveContainer>
              <BarChart
                data={data.baggageByRoute?.slice(0, 8) || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" style={{ fontSize: '10px' }} />
                <YAxis dataKey="route" type="category" width={80} style={{ fontSize: '10px' }} />
                <Tooltip formatter={(value) => [`${value} кг`, 'Средний вес']} />
                <Bar dataKey="avgBaggage" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Тепловая карта день×час */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Паттерны рейсов: день недели × час</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ fontSize: '12px', fontWeight: '500', padding: '8px 4px', borderBottom: '1px solid #e5e7eb' }}>День</th>
                {Array.from({ length: 24 }, (_, i) => (
                  <th key={i} style={{ fontSize: '10px', fontWeight: '500', padding: '4px 2px', borderBottom: '1px solid #e5e7eb' }}>
                    {i.toString().padStart(2, '0')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.heatmapData || []).map((dayData) => (
                <tr key={dayData.day}>
                  <td style={{ fontSize: '12px', fontWeight: '500', padding: '8px 4px', borderRight: '1px solid #e5e7eb' }}>{dayData.day}</td>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const value = dayData[`h${hour}`] || 0;
                    const intensity = Math.min(value / 5, 1);
                    return (
                      <td
                        key={hour}
                        style={{
                          padding: '4px 2px',
                          textAlign: 'center',
                          fontSize: '10px',
                          backgroundColor: value > 0 ? `rgba(59, 130, 246, ${0.1 + intensity * 0.6})` : '#f9fafb',
                          color: intensity > 0.5 ? 'white' : 'black',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        {value || ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activePeriod, setActivePeriod] = useState(null); // Добавляем состояние для активного периода

  // Добавляем состояния для фильтров
  const [selectedAircraftType, setSelectedAircraftType] = useState('');
  const [selectedAirport, setSelectedAirport] = useState('');

  const calendarRef = useRef(null);
  const dashboardRef = useRef(null);

  // Получаем данные из FilesContext
  const { flightData, getFlightData } = useFiles();

  // Функции для получения уникальных значений для фильтров
  const getUniqueAircraftTypes = () => {
    const types = flightData
      .map(flight => flight.aircraftType)
      .filter(type => type && type.trim() !== '')
      .map(type => type.trim());
    return [...new Set(types)].sort();
  };

  const getUniqueAirports = () => {
    const airports = flightData
      .flatMap(flight => [flight.departure, flight.arrival])
      .filter(airport => airport && airport.trim() !== '')
      .map(airport => airport.trim());
    return [...new Set(airports)].sort();
  };

  // Обрабатываем данные для графиков с учетом всех фильтров
  const processedData = processFlightData(flightData, startDate, endDate, selectedAircraftType, selectedAirport);

  const { toPDF, targetRef } = usePDF({
    filename: (() => {
      try {
        return `dashboard-${format(new Date(), 'dd-MM-yyyy')}.pdf`;
      } catch (error) {
        return `dashboard-${Date.now()}.pdf`;
      }
    })(),
    page: {
      margin: 10,
      format: 'a4',
      orientation: 'landscape'
    },
    canvas: {
      // Параметры для улучшения качества графиков
      scale: 2,
      useCORS: true
    }
  });

  // Генерация массива годов (от 2020 до текущего года + 1)
  const years = Array.from({ length: getYear(new Date()) - 2020 + 2 }, (_, i) => 2020 + i);

  // Массив месяцев
  const months = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  // Кастомный хедер для календаря
  const CustomHeader = ({
    date,
    changeYear,
    changeMonth,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
  }) => (
    <div className="flex items-center justify-between px-2 py-2">
      <button
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
        type="button"
        className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex space-x-2">
        <select
          value={months[getMonth(date)]}
          onChange={({ target: { value } }) => changeMonth(months.indexOf(value))}
          className="px-2 py-1 border rounded-md text-sm bg-white cursor-pointer hover:border-gray-400"
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>

        <select
          value={getYear(date)}
          onChange={({ target: { value } }) => changeYear(value)}
          className="px-2 py-1 border rounded-md text-sm bg-white cursor-pointer hover:border-gray-400"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
        type="button"
        className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );

  // Функция для форматирования диапазона дат
  const formatDateRange = () => {
    if (!startDate || !endDate || !isValidDate(startDate) || !isValidDate(endDate)) {
      return 'Выбрать даты';
    }

    try {
      const start = format(startDate, 'dd.MM.yyyy', { locale: ru });
      const end = format(endDate, 'dd.MM.yyyy', { locale: ru });

      if (start === end) {
        return start;
      }
      return `${start} - ${end}`;
    } catch (error) {
      console.error('Ошибка при форматировании дат:', error);
      return 'Выбрать даты';
    }
  };

  // Функции для установки готовых периодов дат
  const setPredefinedPeriod = (period) => {
    const now = new Date();
    const today = endOfDay(now);
    let start;

    switch (period) {
      case '24 часа':
        start = startOfDay(now);
        break;
      case '7 дней':
        start = startOfDay(subDays(now, 6)); // Последние 7 дней включая сегодня
        break;
      case '30 дней':
        start = startOfDay(subDays(now, 29)); // Последние 30 дней включая сегодня
        break;
      case '12 месяцев':
        start = startOfDay(subYears(now, 1)); // Последние 12 месяцев
        break;
      default:
        start = startOfDay(subYears(now, 1));
    }

    setStartDate(start);
    setEndDate(today);
    setActivePeriod(period);
    setIsOpen(false); // Закрываем календарь если был открыт
  };

  // Обработчик для кнопок периодов
  const handlePeriodClick = (period) => {
    setPredefinedPeriod(period);
  };

  // Обновляем функцию handleChange чтобы сбрасывать activePeriod при ручном выборе дат
  const handleChange = (dates) => {
    const [start, end] = dates;

    // Устанавливаем даты только если они валидны или null (для очистки)
    if (start === null || isValidDate(start)) {
      setStartDate(start);
    }
    if (end === null || isValidDate(end)) {
      setEndDate(end);
    }

    // Сбрасываем активный период при ручном выборе дат
    if (start || end) {
      setActivePeriod(null);
    }

    if (end && isValidDate(end)) {
      setIsOpen(false);
    }
  };

  // Обработчики для фильтров
  const handleAircraftTypeChange = (e) => {
    setSelectedAircraftType(e.target.value);
  };

  const handleAirportChange = (e) => {
    setSelectedAirport(e.target.value);
  };

  // Функция для сброса всех фильтров
  const resetFilters = () => {
    setSelectedAircraftType('');
    setSelectedAirport('');
    setStartDate(null);
    setEndDate(null);
    setActivePeriod(null);
  };

  // Убираем автоматическую установку периода при загрузке
  // useEffect(() => {
  //   setPredefinedPeriod('12 месяцев');
  // }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClick = () => {
    console.log('Button clicked, toggling calendar');
    setIsOpen(!isOpen);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);

      // Ждем 2 секунды чтобы все графики успели отрендериться
      await new Promise(resolve => setTimeout(resolve, 2000));

      await toPDF();
    } catch (error) {
      console.error('Ошибка при создании PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64">
        {/* Верхняя панель */}
        <div className="bg-white border-b fixed top-0 right-0 left-0 lg:left-64 z-20">
          <div className="px-4 sm:px-6 py-4 pt-16 lg:pt-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Добро пожаловать, Farrukh</h1>
            <p className="text-sm text-gray-500">Аналитика по рейсам Air Samarkand</p>

            {/* Фильтры по времени */}
            <div className="mt-4 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:space-x-4">
              {/* Кнопки периодов */}
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${activePeriod === '12 месяцев'
                    ? 'bg-[#1B3B7B] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  onClick={() => handlePeriodClick('12 месяцев')}
                >
                  12 месяцев
                </button>
                <button
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${activePeriod === '30 дней'
                    ? 'bg-[#1B3B7B] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  onClick={() => handlePeriodClick('30 дней')}
                >
                  30 дней
                </button>
                <button
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${activePeriod === '7 дней'
                    ? 'bg-[#1B3B7B] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  onClick={() => handlePeriodClick('7 дней')}
                >
                  7 дней
                </button>
                <button
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${activePeriod === '24 часа'
                    ? 'bg-[#1B3B7B] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  onClick={() => handlePeriodClick('24 часа')}
                >
                  24 часа
                </button>

                {/* Кнопка календаря */}
                <div className="relative">
                  <button
                    className="pl-3 pr-8 py-2 border border-gray-300 rounded-md text-sm bg-white cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3B7B] focus:border-transparent flex items-center"
                    onClick={handleClick}
                    type="button"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDateRange()}
                  </button>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div
                    ref={calendarRef}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '100%',
                      marginTop: '0.5rem',
                      zIndex: 50,
                      display: isOpen ? 'block' : 'none'
                    }}
                  >
                    <div className="bg-white rounded-lg shadow-lg p-4">
                      <DatePicker
                        selected={startDate}
                        onChange={handleChange}
                        startDate={startDate}
                        endDate={endDate}
                        selectsRange
                        inline
                        locale={ru}
                        dateFormat="dd.MM.yyyy"
                        renderCustomHeader={CustomHeader}
                        showMonthYearPicker={false}
                        monthsShown={1}
                        calendarClassName="custom-calendar"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Разделитель */}
              <div className="hidden lg:block h-6 border-l border-gray-300"></div>

              {/* Дропдауны фильтров */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select
                    value={selectedAircraftType}
                    onChange={handleAircraftTypeChange}
                    className="pl-3 pr-8 py-2 border border-gray-300 rounded-md text-sm bg-white cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3B7B] focus:border-transparent appearance-none"
                  >
                    <option value="">Все типы ВС</option>
                    {getUniqueAircraftTypes().map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={selectedAirport}
                    onChange={handleAirportChange}
                    className="pl-3 pr-8 py-2 border border-gray-300 rounded-md text-sm bg-white cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3B7B] focus:border-transparent appearance-none"
                  >
                    <option value="">Все аэропорты</option>
                    {getUniqueAirports().map(airport => (
                      <option key={airport} value={airport}>{airport}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Кнопка сброса фильтров - показываем только если есть активные фильтры */}
                {(selectedAircraftType || selectedAirport || startDate || endDate) && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                    title="Сбросить все фильтры"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Правая часть с кнопкой PDF */}
              <div className="flex justify-end space-x-4 w-full lg:w-auto lg:flex-1">
                <button
                  className={`inline-flex items-center px-4 py-2 border border-[#1B3B7B] text-[#1B3B7B] rounded-lg hover:bg-[#1B3B7B] hover:text-white transition-colors ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? (
                    <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 10V16M12 16L9 13M12 16L15 13M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isGeneratingPDF ? 'Генерация PDF...' : 'Скачать PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Добавим стили для календаря */}
        <style jsx>{`
          .custom-calendar {
            font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
          }
          .custom-calendar .react-datepicker__month-container {
            min-width: 280px;
          }
          .custom-calendar .react-datepicker__day {
            width: 2.5rem;
            line-height: 2.5rem;
            margin: 0.2rem;
          }
          .custom-calendar .react-datepicker__day--selected,
          .custom-calendar .react-datepicker__day--in-range {
            background-color: #1B3B7B !important;
          }
          .custom-calendar .react-datepicker__day--in-selecting-range {
            background-color: rgba(27, 59, 123, 0.5) !important;
          }
          .custom-calendar .react-datepicker__header {
            background-color: white;
            border-bottom: none;
          }
          .custom-calendar .react-datepicker__day-name {
            width: 2.5rem;
            line-height: 2.5rem;
            margin: 0.2rem;
          }
          .custom-calendar .react-datepicker__month {
            margin: 0.4rem;
          }
          .custom-calendar .react-datepicker__day--keyboard-selected {
            background-color: rgba(27, 59, 123, 0.1);
          }
          .custom-calendar .react-datepicker__day:hover {
            background-color: rgba(27, 59, 123, 0.1);
          }
        `}</style>

        {/* Основной контент */}
        <div className="p-4 sm:p-6 pt-48 sm:pt-44 lg:pt-44">
          {/* Проверяем есть ли данные */}
          {flightData.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет данных для отображения</h3>
              <p className="text-gray-500 mb-4">
                Загрузите файлы Excel с данными рейсов для просмотра аналитики
              </p>
              <a
                href="/upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Загрузить данные
              </a>
            </div>
          ) : (
            <>


              {/* Карточки со статистикой */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                <StatCard
                  title="Общее количество рейсов"
                  value={processedData.totalFlights.toLocaleString()}
                  change={processedData.trends.flightsChange}
                  isPositive={processedData.trends.flightsChange >= 0}
                  trendData={processedData.cardTrends.flights}
                />
                <StatCard
                  title="Общее количество пассажиров"
                  value={processedData.totalPassengers.toLocaleString()}
                  change={processedData.trends.passengersChange}
                  isPositive={processedData.trends.passengersChange >= 0}
                  trendData={processedData.cardTrends.passengers}
                />
                <StatCard
                  title="Среднее количество пассажиров на рейс"
                  value={processedData.averageOccupancy}
                  change={processedData.trends.occupancyChange}
                  isPositive={processedData.trends.occupancyChange >= 0}
                  trendData={processedData.cardTrends.occupancy}
                />
              </div>

              {/* График количества рейсов */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Количество рейсов</h2>
                </div>
                <div style={{ width: '100%', height: '250px' }} className="sm:h-[300px]">
                  <ResponsiveContainer>
                    <LineChart data={processedData.flights}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => {
                          try {
                            // Парсим дату в формате YYYY-MM
                            const [year, month] = date.split('-');
                            const dateObj = new Date(parseInt(year), parseInt(month) - 1);
                            return isValidDate(dateObj) ? format(dateObj, 'MMM yyyy', { locale: ru }) : date;
                          } catch (error) {
                            console.error('Ошибка при форматировании даты в графике:', error);
                            return date;
                          }
                        }}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(date) => {
                          try {
                            const [year, month] = date.split('-');
                            const dateObj = new Date(parseInt(year), parseInt(month) - 1);
                            return isValidDate(dateObj) ? format(dateObj, 'MMMM yyyy', { locale: ru }) : date;
                          } catch (error) {
                            return date;
                          }
                        }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#1E40AF" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ======= ПЕРЕМЕЩЕННЫЕ ГРАФИКИ ======= */}

              {/* Первый ряд - 2 графика */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                {/* Эффективность по типам ВС */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h2 className="text-base sm:text-lg font-semibold mb-4">Средняя загруженность по типам ВС (% PAX - столбчатый)</h2>
                  <p className="text-sm text-gray-500 mb-4">Среднее количество пассажиров на рейс по типам воздушных судов</p>
                  <div style={{ width: '100%', height: '300px' }} className="sm:h-[350px]">
                    <ResponsiveContainer>
                      <BarChart data={processedData.aircraftEfficiency}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip
                          formatter={(value, name) => [
                            name === 'efficiency' ? `${value} пассажиров/рейс` : value,
                            name === 'efficiency' ? 'Эффективность' : 'Рейсов'
                          ]}
                        />
                        <Bar dataKey="efficiency" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Самые загруженные аэропорты */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h2 className="text-base sm:text-lg font-semibold mb-4">Самые загруженные аэропорты</h2>
                  <p className="text-sm text-gray-500 mb-4">Количество рейсов по аэропортам (вылеты + прилеты)</p>
                  <div style={{ width: '100%', height: '300px' }} className="sm:h-[350px]">
                    <ResponsiveContainer>
                      <BarChart
                        data={processedData.topAirports}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="airport" type="category" width={60} />
                        <Tooltip formatter={(value) => [`${value} рейсов`, 'Количество']} />
                        <Bar dataKey="flights" fill="#06B6D4" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Второй ряд - 2 графика */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                {/* Загруженность по типам ВС */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h2 className="text-base sm:text-lg font-semibold mb-4">Загруженность по типам ВС</h2>
                  <p className="text-sm text-gray-500 mb-4">Средний процент загрузки по типам воздушных судов</p>
                  <div style={{ width: '100%', height: '300px' }} className="sm:h-[350px]">
                    <ResponsiveContainer>
                      <BarChart data={processedData.loadFactorByAircraft}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value}%`, 'Загруженность']} />
                        <Bar dataKey="loadFactor" fill="#EF4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Багаж по маршрутам */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h2 className="text-base sm:text-lg font-semibold mb-4">Багаж по маршрутам</h2>
                  <p className="text-sm text-gray-500 mb-4">Средний вес багажа в килограммах по маршрутам</p>
                  <div style={{ width: '100%', height: '300px' }} className="sm:h-[350px]">
                    <ResponsiveContainer>
                      <BarChart
                        data={processedData.baggageByRoute}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="route" type="category" width={80} />
                        <Tooltip formatter={(value) => [`${value} кг`, 'Средний вес багажа']} />
                        <Bar dataKey="avgBaggage" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Разбивка по маршрутам */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                {/* Пассажиры по маршрутам */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h2 className="text-base sm:text-lg font-semibold mb-4">Разбивка по маршрутам (пассажиры)</h2>
                  <p className="text-sm text-gray-500 mb-4">Количество пассажиров по маршрутам</p>
                  <div style={{ width: '100%', height: '350px' }} className="sm:h-[400px]">
                    <ResponsiveContainer>
                      <BarChart
                        data={processedData.routePassengers}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="route" type="category" width={80} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#F59E0B" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Рейсы по маршрутам */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h2 className="text-base sm:text-lg font-semibold mb-4">Разбивка по маршрутам (рейсы)</h2>
                  <p className="text-sm text-gray-500 mb-4">Количество рейсов по маршрутам</p>
                  <div style={{ width: '100%', height: '350px' }} className="sm:h-[400px]">
                    <ResponsiveContainer>
                      <BarChart
                        data={processedData.routeFlights}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="route" type="category" width={80} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366F1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Распределение по типу ВС */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h2 className="text-base sm:text-lg font-semibold mb-4">Распределение по типу ВС (рейсы)</h2>
                  <div style={{ width: '100%', height: '250px' }} className="sm:h-[300px]">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={processedData.aircraftTypes}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {processedData.aircraftTypes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h2 className="text-base sm:text-lg font-semibold mb-4">Распределение по типу ВС (пассажиры)</h2>
                  <div style={{ width: '100%', height: '250px' }} className="sm:h-[300px]">
                    <ResponsiveContainer>
                      <BarChart data={processedData.aircraftPassengerTypes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#1E40AF" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ======= НОВЫЕ ГРАФИКИ ======= */}

              {/* 2. Распределение рейсов по часам */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
                <h2 className="text-base sm:text-lg font-semibold mb-4">Распределение рейсов по часам</h2>
                <p className="text-sm text-gray-500 mb-4">Количество рейсов в зависимости от времени отправления</p>
                <div style={{ width: '100%', height: '300px' }} className="sm:h-[350px]">
                  <ResponsiveContainer>
                    <BarChart data={processedData.hourlyDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} рейсов`, 'Количество']} />
                      <Bar dataKey="flights" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Тепловая карта день×час */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
                <h2 className="text-base sm:text-lg font-semibold mb-4">Паттерны рейсов: день недели × час</h2>
                <p className="text-sm text-gray-500 mb-4">Интенсивность рейсов по дням недели и времени суток</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="text-xs font-medium text-gray-500 px-2 py-1">День</th>
                        {Array.from({ length: 24 }, (_, i) => (
                          <th key={i} className="text-xs font-medium text-gray-500 px-1 py-1">
                            {i.toString().padStart(2, '0')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {processedData.heatmapData.map((dayData) => (
                        <tr key={dayData.day}>
                          <td className="text-sm font-medium text-gray-700 px-2 py-1">{dayData.day}</td>
                          {Array.from({ length: 24 }, (_, hour) => {
                            const value = dayData[`h${hour}`] || 0;
                            const intensity = Math.min(value / 5, 1); // Нормализуем до 1
                            return (
                              <td
                                key={hour}
                                className="px-1 py-1 text-center text-xs"
                                style={{
                                  backgroundColor: value > 0 ? `rgba(59, 130, 246, ${0.1 + intensity * 0.8})` : '#f9fafb',
                                  color: intensity > 0.5 ? 'white' : 'black'
                                }}
                                title={`${dayData.day} ${hour}:00 - ${value} рейсов`}
                              >
                                {value || ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Время в пути по маршрутам */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
                <h2 className="text-base sm:text-lg font-semibold mb-4">Время в пути по маршрутам</h2>
                <p className="text-sm text-gray-500 mb-4">Среднее время полета для различных маршрутов</p>
                <div style={{ width: '100%', height: '350px' }} className="sm:h-[400px]">
                  <ResponsiveContainer>
                    <BarChart
                      data={processedData.flightTimeByRoute}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="route" type="category" width={80} />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'avgTime' ? processedData.flightTimeByRoute.find(item => item.avgTime === value)?.avgTimeFormatted || value : value,
                          name === 'avgTime' ? 'Среднее время' : 'Рейсов'
                        ]}
                      />
                      <Bar dataKey="avgTime" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>


            </>
          )}
        </div>
      </div>

      {/* Скрытый контент для PDF */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={targetRef}>
          <DashboardPDFContent
            data={processedData}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, isPositive, trendData }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className="flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {change !== undefined && change !== 0 && (
          <p className={`ml-2 flex items-baseline text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? (
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {Math.abs(change).toFixed(1)}%
          </p>
        )}
      </div>
      {trendData && trendData.length > 0 && (
        <div className="mt-4" style={{ width: '100%', height: 60 }}>
          <ResponsiveContainer>
            <LineChart data={trendData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={isPositive ? '#10B981' : '#EF4444'}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}