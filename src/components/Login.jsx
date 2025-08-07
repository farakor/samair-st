import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, YAxis, Tooltip, CartesianGrid, XAxis } from 'recharts';

const flightsData = [
  { date: 'Янв', value: 680, expected: 670, efficiency: 95 },
  { date: 'Фев', value: 720, expected: 690, efficiency: 97 },
  { date: 'Мар', value: 710, expected: 700, efficiency: 94 },
  { date: 'Апр', value: 730, expected: 710, efficiency: 96 },
  { date: 'Май', value: 750, expected: 730, efficiency: 98 },
  { date: 'Июн', value: 740, expected: 740, efficiency: 95 },
  { date: 'Июл', value: 760, expected: 750, efficiency: 97 },
  { date: 'Авг', value: 770, expected: 760, efficiency: 99 },
  { date: 'Сен', value: 789, expected: 770, efficiency: 98 },
];

const loadData = [
  { date: 'Янв', value: 75, min: 70, max: 80, trend: 72 },
  { date: 'Фев', value: 78, min: 72, max: 82, trend: 74 },
  { date: 'Мар', value: 76, min: 71, max: 81, trend: 75 },
  { date: 'Апр', value: 79, min: 74, max: 84, trend: 77 },
  { date: 'Май', value: 80, min: 75, max: 85, trend: 79 },
  { date: 'Июн', value: 78, min: 73, max: 83, trend: 80 },
  { date: 'Июл', value: 81, min: 76, max: 86, trend: 81 },
  { date: 'Авг', value: 80, min: 75, max: 85, trend: 82 },
  { date: 'Сен', value: 82.22, min: 77, max: 87, trend: 83 },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-sm p-2 rounded shadow-lg text-xs">
        {payload.map((entry, index) => (
          <p key={index} className="text-[#1B3B7B] font-medium">
            {entry.dataKey === 'value' && 'Фактически: '}
            {entry.dataKey === 'expected' && 'Ожидаемо: '}
            {entry.dataKey === 'efficiency' && 'Эффективность: '}
            {entry.dataKey === 'trend' && 'Тренд: '}
            {entry.value}
            {entry.dataKey === 'efficiency' && '%'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const gradientOffset = () => {
  const dataMax = Math.max(...loadData.map((i) => i.value));
  const dataMin = Math.min(...loadData.map((i) => i.value));

  if (dataMax <= 0) return 0;
  if (dataMin >= 0) return 1;

  return dataMax / (dataMax - dataMin);
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isInitialized, isAuthenticated } = useAuth();

  // Автоматическое перенаправление авторизованных пользователей
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Показываем загрузку до завершения инициализации
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 mx-auto text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Инициализация системы...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Неверный email или пароль');
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      setError('Произошла ошибка при входе в систему');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Левая часть */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full px-4 sm:px-8">
          <div className="mb-8 sm:mb-16">
            <div className="flex justify-start">
              <img src="/logo.png" alt="Air Samarkand" className="w-full max-w-[200px] sm:max-w-[280px]" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
              Войти
            </h1>
            <p className="text-gray-600 mb-6 sm:mb-8">
              Добро пожаловать. Пожалуйста войдите в учетную запись
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Введите вашу почту"
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-sm"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-sm"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B3B7B] text-white py-4 px-4 rounded-md text-sm font-medium hover:bg-[#152f61] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>
          </div>
        </div>

        <div className="p-4 sm:p-8 text-sm text-gray-600">
          © SamAir LLC 2025
        </div>
      </div>

      {/* Правая часть */}
      <div className="hidden lg:flex w-full lg:w-1/2 bg-[#1B3B7B] flex-col items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full">
          {/* Карточка количества рейсов */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-semibold text-white">789</div>
                <div className="text-sm text-white/80">Количество рейсов</div>
              </div>
              <div className="text-sm text-green-400 font-medium">+ 7.2%</div>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={flightsData}>
                  <defs>
                    <linearGradient id="colorEfficiency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                    dot={{ stroke: '#fff', strokeWidth: 2, r: 2 }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    type="basis"
                    dataKey="expected"
                    stroke="#ffffff44"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="efficiency"
                    stroke="none"
                    fill="url(#colorEfficiency)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Карточка средней загрузки */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-12">
            <div className="mb-4">
              <div className="text-sm text-white/80">Средняя загрузка рейса</div>
              <div className="text-3xl font-semibold text-white">82.22%</div>
              <div className="text-sm text-green-400 font-medium">↑ 15% пред. мес</div>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={loadData}>
                  <defs>
                    <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={gradientOffset()} stopColor="#4ade80" stopOpacity={0.3} />
                      <stop offset={gradientOffset()} stopColor="#4ade80" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                  <Tooltip content={<CustomTooltip />} />
                  <YAxis hide domain={[60, 90]} />
                  <Area
                    type="monotone"
                    dataKey="max"
                    stroke="none"
                    fill="#4ade8033"
                  />
                  <Area
                    type="monotone"
                    dataKey="min"
                    stroke="none"
                    fill="#4ade8011"
                  />
                  <Line
                    type="natural"
                    dataKey="value"
                    stroke="#4ade80"
                    strokeWidth={2}
                    dot={{ stroke: '#4ade80', strokeWidth: 2, r: 2 }}
                    activeDot={{ r: 6, stroke: '#4ade80', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="trend"
                    stroke="#4ade8066"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Добро пожаловать на наш новый дашборд
            </h2>
            <p className="text-white/80">
              Войдите в свою учетную запись
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 