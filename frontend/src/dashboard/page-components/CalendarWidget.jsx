import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CalendarWidget = () => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    // Store range as Date objects
    const [range, setRange] = useState({ start: null, end: null });

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();

    const generateCalendar = () => {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const totalDays = daysInMonth(currentMonth, currentYear);
        const calendarDays = [];

        for (let i = 0; i < firstDay; i++) calendarDays.push(null);
        for (let i = 1; i <= totalDays; i++)
            calendarDays.push(new Date(currentYear, currentMonth, i));

        return calendarDays;
    };

    // Month navigation
    const handlePrevMonth = () => {
        if (currentMonth === today.getMonth() && currentYear === today.getFullYear()) return;

        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else setCurrentMonth(currentMonth - 1);
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else setCurrentMonth(currentMonth + 1);
    };

    // Click a date
    const handleDateClick = (date) => {
        if (date < today) return;

        if (!range.start || (range.start && range.end)) setRange({ start: date, end: null });
        else if (range.start && !range.end)
            setRange({
                start: range.start < date ? range.start : date,
                end: range.start < date ? date : range.start,
            });
    };

    const isInRange = (date) => {
        if (!date || !range.start) return false;
        if (!range.end) return date.getTime() === range.start.getTime();
        return date > range.start && date < range.end;
    };

    const isStartDate = (date) => range.start && date.getTime() === range.start.getTime();
    const isEndDate = (date) => range.end && date.getTime() === range.end.getTime();

    const isToday = (date) =>
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const calendarDays = generateCalendar();

    // Format date as dd/mm/yyyy
    const formatDate = (date) =>
        date
            ? `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
                  .toString()
                  .padStart(2, '0')}/${date.getFullYear()}`
            : '';

    // Update range from inputs
    const handleInputChange = (type, value) => {
        const parts = value.split('/').map(Number);
        if (parts.length !== 3) return;
        const newDate = new Date(parts[2], parts[1] - 1, parts[0]);
        if (newDate < today) return;

        if (type === 'start') {
            if (range.end && newDate > range.end) setRange({ start: newDate, end: null });
            else setRange({ ...range, start: newDate });
            setCurrentMonth(newDate.getMonth());
            setCurrentYear(newDate.getFullYear());
        } else {
            if (range.start && newDate < range.start) setRange({ start: newDate, end: null });
            else setRange({ ...range, end: newDate });
            setCurrentMonth(newDate.getMonth());
            setCurrentYear(newDate.getFullYear());
        }
    };

    return (
        <div className="bg-white p-4 rounded-2xl w-[340px] flex flex-col shadow-lg border border-gray-100">
            {/* Selected range display */}
            <div className="mb-4 flex flex-col gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center gap-2">
                    <label className="font-semibold text-gray-700">Start:</label>
                    <input
                        type="text"
                        value={formatDate(range.start)}
                        onChange={(e) => handleInputChange('start', e.target.value)}
                        className="border px-2 py-1 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="dd/mm/yyyy"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="font-semibold text-gray-700">End:</label>
                    <input
                        type="text"
                        value={formatDate(range.end)}
                        onChange={(e) => handleInputChange('end', e.target.value)}
                        className="border px-2 py-1 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        placeholder="dd/mm/yyyy"
                    />
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm text-mainTheme">
                    {monthNames[currentMonth]} {currentYear}
                </h3>
                <div className="flex gap-1">
                    <button
                        onClick={handlePrevMonth}
                        className={`p-1 rounded transition-colors ${
                            currentMonth === today.getMonth() && currentYear === today.getFullYear()
                                ? 'cursor-not-allowed opacity-50'
                                : 'hover:bg-gray-100'
                        }`}
                    >
                        <ChevronLeft size={16} className="text-gray-500" />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <ChevronRight size={16} className="text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
                {weekDays.map((d) => (
                    <div key={d} className="text-gray-400 py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {calendarDays.map((date, idx) => {
                    if (!date) return <div key={idx} />;

                    const isPast = date < today;
                    const disabledClass = isPast
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'cursor-pointer';

                    const startClass = isStartDate(date) ? 'bg-mainTheme text-white font-bold' : '';
                    const endClass = isEndDate(date) ? 'bg-mainTheme text-white font-bold' : '';
                    const rangeClass = isInRange(date) ? 'bg-mainTheme/50 text-white' : '';
                    const todayClass = isToday(date) ? 'border border-mainTheme font-semibold' : '';

                    return (
                        <div
                            key={idx}
                            onClick={() => handleDateClick(date)}
                            className={`py-1 rounded-full transition-colors ${disabledClass} ${startClass} ${endClass} ${rangeClass} ${todayClass}`}
                        >
                            {date.getDate()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarWidget;
