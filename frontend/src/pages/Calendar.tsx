import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calendarApi } from '../lib/apiMethods';
import type { CalendarView } from '../types';

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const { data: eventsByDay, isLoading } = useQuery({
    queryKey: ['calendar', format(currentMonth, 'yyyy-MM')],
    queryFn: () => calendarApi.get(format(calendarStart, 'yyyy-MM-dd'), format(calendarEnd, 'yyyy-MM-dd')),
  });

  const days = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart, calendarEnd]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, CalendarView['events']>();
    eventsByDay?.data?.forEach((day: CalendarView) => {
      map.set(day.date, day.events);
    });
    return map;
  }, [eventsByDay]);

  const getEventsForDay = (date: Date) => eventsMap.get(format(date, 'yyyy-MM-dd')) || [];

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToday = () => setCurrentMonth(new Date());

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 animate-pulse">
          <div className="grid grid-cols-7 gap-1 h-64">
            {[...Array(35)].map((_, i) => <div key={i} className="bg-gray-100 rounded"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendário de Projetos</h1>
          <p className="text-gray-500 mt-1">Visualize a timeline de campanhas e iniciativas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={prevMonth} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">← Mês Anterior</button>
          <button onClick={goToday} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hoje</button>
          <button onClick={nextMonth} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Próximo Mês →</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setViewMode('month')} className={`px-4 py-2 rounded-lg text-sm font-medium ${viewMode === 'month' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Mês</button>
        <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-sm font-medium ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Lista</button>
      </div>

      {viewMode === 'month' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {dayNames.map(day => (
              <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 p-2">
            {Array.from({ length: calendarStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-transparent" />
            ))}
            {days.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const events = getEventsForDay(day);
              const isToday = isToday(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <div
                  key={dayStr}
                  className={`aspect-square relative rounded-lg border ${
                    isToday ? 'border-primary-300 bg-primary-50' : 'border-gray-100 hover:bg-gray-50'
                  } ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''} ${
                    events.some(e => e.is_conflict) ? 'ring-2 ring-red-300' : ''
                  }`}
                >
                  <div className="p-1 flex justify-between">
                    <span className={`text-sm font-medium ${isToday ? 'text-primary-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {format(day, 'd')}
                    </span>
                    {events.some(e => e.is_conflict) && (
                      <span className="w-2 h-2 rounded-full bg-red-500" title="Conflito detectado" />
                    )}
                  </div>
                  <div className="p-1 space-y-1 overflow-hidden">
                    {events.slice(0, 3).map((event, idx) => (
                      <div
                        key={`${event.project_id}-${idx}`}
                        className="h-4 rounded text-xs px-1 py-0.5 truncate text-white flex items-center gap-1"
                        style={{ backgroundColor: event.color }}
                        title={`${event.title} (${format(new Date(event.start_date), 'dd/MM', { locale: ptBR })} - ${format(new Date(event.end_date), 'dd/MM', { locale: ptBR })})`}
                      >
                        <span className="font-medium truncate">{event.title}</span>
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-xs text-gray-500 text-center pt-1">+{events.length - 3} mais</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Próximos Eventos</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {Object.entries(eventsMap || {})
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, events]) => (
                <div key={date} className="p-4 hover:bg-gray-50">
                  <div className="font-medium text-gray-900 mb-2">{format(new Date(date), 'dd/MM/yyyy (EEEE)', { locale: ptBR })}</div>
                  <div className="space-y-2">
                    {events.map((event, idx) => (
                      <div key={`${event.project_id}-${idx}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{event.title}</p>
                          <p className="text-sm text-gray-500">{event.description || 'Sem descrição'}</p>
                        </div>
                        {event.is_conflict && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">Conflito</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 p-4 text-sm text-gray-500">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span>Conflito detectado pela IA</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary-500" /><span>Projeto ativo</span></div>
      </div>
    </div>
  );
}