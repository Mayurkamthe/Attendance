/**
 * Returns current time as { hours, minutes, total } in the configured timezone.
 * Defaults to Asia/Kolkata (IST, UTC+5:30) if TZ env var is not set.
 */
function getCurrentTime() {
  const tz = process.env.TZ || 'Asia/Kolkata';
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);

  const hours   = parseInt(parts.find(p => p.type === 'hour').value,   10);
  const minutes = parseInt(parts.find(p => p.type === 'minute').value, 10);
  return { hours, minutes, total: hours * 60 + minutes };
}

/**
 * Checks whether the current IST time is within the attendance window.
 * Returns { allowed: bool, message: string }
 */
function checkAttendanceWindow() {
  const { total } = getCurrentTime();

  const start_str = process.env.ATTENDANCE_START || '00:00';
  const end_str   = process.env.ATTENDANCE_END   || '23:59';

  const [startH, startM] = start_str.split(':').map(Number);
  const [endH,   endM]   = end_str.split(':').map(Number);
  const start = startH * 60 + startM;
  const end   = endH   * 60 + endM;

  if (total < start || total > end) {
    return {
      allowed: false,
      message: `Attendance can only be marked between ${start_str} and ${end_str} (IST)`
    };
  }
  return { allowed: true, message: '' };
}

module.exports = { getCurrentTime, checkAttendanceWindow };
