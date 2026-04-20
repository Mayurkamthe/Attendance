const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');

exports.getParentView = async (req, res) => {
  try {
    const { token } = req.params;
    const { month, year } = req.query;

    const student = await Student.findOne({ parentToken: token, isActive: true })
      .populate('class', 'name year department division customYear');

    if (!student) {
      return res.status(404).render('public/not-found', {
        collegeName: res.locals.collegeName,
        collegeAddress: res.locals.collegeAddress
      });
    }

    // Default to current month/year
    const now = new Date();
    const selMonth = parseInt(month) || (now.getMonth() + 1);
    const selYear  = parseInt(year)  || now.getFullYear();

    // Build year list (current year ± 1)
    const yearOptions = [selYear - 1, selYear, selYear + 1];

    // Fetch all attendance records for this student's class
    const startDate = new Date(selYear, selMonth - 1, 1);
    const endDate   = new Date(selYear, selMonth, 0, 23, 59, 59);

    const records = await Attendance.find({
      class: student.class._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    // Build subject-wise stats and calendar data
    const subjectMap = {}; // { subjectName: { present, absent, dates: { day: status } } }
    const calendarMap = {}; // { 'YYYY-MM-DD': { subjects: [{name, status}], overall } }

    for (const att of records) {
      const subj = att.subject || 'General';
      const rec  = att.records.find(r => r.student && r.student.toString() === student._id.toString());
      if (!rec) continue;

      const status = rec.status; // 'present' | 'absent'
      const dateKey = att.date.toISOString().split('T')[0];
      const day = att.date.getDate();

      // Subject map
      if (!subjectMap[subj]) subjectMap[subj] = { present: 0, absent: 0, days: {} };
      subjectMap[subj][status]++;
      subjectMap[subj].days[day] = status;

      // Calendar map
      if (!calendarMap[dateKey]) calendarMap[dateKey] = { subjects: [] };
      calendarMap[dateKey].subjects.push({ name: subj, status });
    }

    // Compute overall stats
    let totalPresent = 0, totalAbsent = 0;
    const subjects = Object.entries(subjectMap).map(([name, data]) => {
      const total = data.present + data.absent;
      const pct   = total > 0 ? Math.round((data.present / total) * 100) : null;
      totalPresent += data.present;
      totalAbsent  += data.absent;
      return { name, present: data.present, absent: data.absent, total, pct };
    }).sort((a, b) => a.name.localeCompare(b.name));

    const totalClasses = totalPresent + totalAbsent;
    const overallPct   = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : null;

    // Recent absent dates (last 10, newest first)
    const recentAbsent = [];
    for (const [dateKey, data] of Object.entries(calendarMap).sort((a, b) => b[0].localeCompare(a[0]))) {
      const absentSubjects = data.subjects.filter(s => s.status === 'absent').map(s => s.name);
      if (absentSubjects.length) {
        recentAbsent.push({ date: dateKey, subjects: absentSubjects });
        if (recentAbsent.length >= 10) break;
      }
    }

    // Build calendar grid
    const daysInMonth = new Date(selYear, selMonth, 0).getDate();
    const firstDayOfWeek = new Date(selYear, selMonth - 1, 1).getDay(); // 0=Sun
    const calendarDays = [];
    for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${selYear}-${String(selMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const data = calendarMap[key];
      let status = null;
      if (data) {
        const hasAbsent  = data.subjects.some(s => s.status === 'absent');
        const hasPresent = data.subjects.some(s => s.status === 'present');
        status = hasAbsent ? (hasPresent ? 'partial' : 'absent') : 'present';
      }
      calendarDays.push({ day: d, status, subjects: data ? data.subjects : [] });
    }

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const cls = student.class;
    const yearLabel = cls.year === 'Other' && cls.customYear ? cls.customYear : cls.year;

    res.render('public/parent-view', {
      collegeName: res.locals.collegeName,
      collegeAddress: res.locals.collegeAddress,
      collegePhone: res.locals.collegePhone,
      collegeEmail: res.locals.collegeEmail,
      student,
      yearLabel,
      subjects,
      overallPct,
      totalPresent,
      totalAbsent,
      totalClasses,
      recentAbsent,
      calendarDays,
      selMonth,
      selYear,
      monthName: monthNames[selMonth - 1],
      monthNames,
      yearOptions,
      token
    });

  } catch (e) {
    console.error('Parent view error:', e);
    res.status(500).render('public/not-found', {
      collegeName: res.locals.collegeName,
      collegeAddress: res.locals.collegeAddress,
      error: 'Something went wrong. Please try again later.'
    });
  }
};
