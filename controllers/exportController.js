const ExcelJS = require('exceljs');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');

exports.dailyReport = async (req, res) => {
  const { classId, date } = req.query;
  const cls = await Class.findById(classId);
  const d = new Date(date);
  const att = await Attendance.findOne({
    class: classId,
    date: { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) }
  }).populate('records.student');

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Daily Attendance');

  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = process.env.COLLEGE_NAME;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:D2');
  ws.getCell('A2').value = `Class: ${cls ? cls.name : ''} | Date: ${date}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };

  ws.addRow([]);
  const header = ws.addRow(['Roll No', 'Name', 'Status', 'Date']);
  header.font = { bold: true };
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = { bottom: { style: 'thin' } };
  });

  if (att && att.records.length) {
    att.records.sort((a, b) => {
      const ra = a.student?.rollNumber || '', rb = b.student?.rollNumber || '';
      return ra.localeCompare(rb, undefined, { numeric: true });
    });
    for (const r of att.records) {
      const row = ws.addRow([r.student?.rollNumber, r.student?.name, r.status.toUpperCase(), date]);
      row.getCell(3).fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: r.status === 'present' ? 'FF90EE90' : 'FFFF9999' }
      };
    }
  } else {
    const students = await Student.find({ class: classId, isActive: true }).sort({ rollNumber: 1 });
    for (const s of students) ws.addRow([s.rollNumber, s.name, 'NOT MARKED', date]);
  }

  ws.columns.forEach(col => { col.width = 20; });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=attendance_${date}.xlsx`);
  await wb.xlsx.write(res);
  res.end();
};

exports.monthlyReport = async (req, res) => {
  const { classId, month, year } = req.query;
  const cls = await Class.findById(classId);
  const students = await Student.find({ class: classId, isActive: true }).sort({ rollNumber: 1 });

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const records = await Attendance.find({ class: classId, date: { $gte: startDate, $lte: endDate } }).populate('records.student');

  const daysInMonth = endDate.getDate();
  const attMap = {};
  for (const att of records) {
    const day = new Date(att.date).getDate();
    for (const r of att.records) {
      if (!attMap[r.student?._id]) attMap[r.student?._id] = {};
      attMap[r.student?._id][day] = r.status;
    }
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Monthly Attendance');

  ws.mergeCells(1, 1, 1, daysInMonth + 4);
  ws.getCell('A1').value = process.env.COLLEGE_NAME;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells(2, 1, 2, daysInMonth + 4);
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  ws.getCell('A2').value = `Class: ${cls?.name} | ${monthNames[month-1]} ${year}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };

  ws.addRow([]);
  const headerRow = ['Roll No', 'Name', ...Array.from({ length: daysInMonth }, (_, i) => i + 1), 'Present', 'Absent', '%'];
  const hRow = ws.addRow(headerRow);
  hRow.font = { bold: true };
  hRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  for (const student of students) {
    const studentData = attMap[student._id] || {};
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const s = studentData[i + 1];
      return s ? (s === 'present' ? 'P' : 'A') : '-';
    });
    const present = days.filter(d => d === 'P').length;
    const absent = days.filter(d => d === 'A').length;
    const total = present + absent;
    const pct = total > 0 ? ((present / total) * 100).toFixed(1) + '%' : 'N/A';
    const row = ws.addRow([student.rollNumber, student.name, ...days, present, absent, pct]);
    row.eachCell((cell, colNo) => {
      if (colNo > 2 && colNo <= daysInMonth + 2) {
        if (cell.value === 'P') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
        else if (cell.value === 'A') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9999' } };
      }
    });
  }

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 24;
  for (let i = 3; i <= daysInMonth + 2; i++) ws.getColumn(i).width = 4;
  ws.getColumn(daysInMonth + 3).width = 9;
  ws.getColumn(daysInMonth + 4).width = 9;
  ws.getColumn(daysInMonth + 5).width = 8;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=monthly_${monthNames[month-1]}_${year}.xlsx`);
  await wb.xlsx.write(res);
  res.end();
};
