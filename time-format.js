(function attachAlfredTime(root) {
  const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const MONTHS = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
  ];

  function greetingForHour(hour) {
    if (hour >= 5 && hour < 12) return "GOOD MORNING";
    if (hour >= 12 && hour < 17) return "GOOD AFTERNOON";
    if (hour >= 17 && hour < 21) return "GOOD EVENING";
    return "GOOD NIGHT";
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatHeroClock(date) {
    const hour24 = date.getHours();
    const hour12 = hour24 % 12 || 12;
    const period = hour24 >= 12 ? "PM" : "AM";

    return {
      greeting: greetingForHour(hour24),
      weekday: WEEKDAYS[date.getDay()],
      date: `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
      time: `${pad2(hour12)}:${pad2(date.getMinutes())} ${period}`,
      statusTime: `${pad2(hour24)}:${pad2(date.getMinutes())}`,
    };
  }

  const api = { formatHeroClock, greetingForHour };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.AlfredTime = api;
})(typeof window !== "undefined" ? window : globalThis);
