const ExcelJS = require('exceljs');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');

exports.bulkImportTemplate = async (req, res) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = process.env.COLLEGE_NAME || 'Attendance System';

  // Instructions sheet
  const infoWs = wb.addWorksheet('Instructions');
  infoWs.getColumn('A').width = 60;
  const titleRow = infoWs.addRow(['Bulk Student Import Template']);
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3080' } };
  titleRow.getCell(1).alignment = { horizontal: 'center' };
  infoWs.mergeCells('A1:C1');
  infoWs.addRow([]);
  const rules = [
    ['Column', 'Description', 'Example'],
    ['Name', 'Full name of the student (required)', 'Rahul Sharma'],
    ['Roll Number', 'Unique roll number within the class (required)', 'CS-101'],
    ['Parent Phone', 'Parent/guardian phone number (required)', '+919876543210'],
  ];
  rules.forEach((row, i) => {
    const r = infoWs.addRow(row);
    if (i === 0) {
      r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      r.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2340A8' } }; });
    }
    r.eachCell(c => { c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; });
  });
  infoWs.getColumn('A').width = 20;
  infoWs.getColumn('B').width = 44;
  infoWs.getColumn('C').width = 22;
  infoWs.addRow([]);
  infoWs.addRow(['Notes:']).getCell(1).font = { bold: true };
  ['Do NOT change column headers.', 'Roll Number must be unique per class.', 'Rows with missing fields will be skipped.', 'Phone format: +91XXXXXXXXXX or 10-digit number.'].forEach(note => {
    const nr = infoWs.addRow(['• ' + note]);
    nr.getCell(1).font = { color: { argb: 'FF4B5563' } };
  });

  // Data sheet
  const ws = wb.addWorksheet('Students');
  const headerRow = ws.addRow(['Name', 'Roll Number', 'Parent Phone']);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3080' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF3B5BDB' } } };
  });
  headerRow.height = 22;

  // 5 sample rows (grey, to be replaced)
  const samples = [
    ['Rahul Sharma', 'CS-101', '+919876543210'],
    ['Priya Patel', 'CS-102', '+919876543211'],
    ['Amir Khan', 'CS-103', '+919876543212'],
  ];
  samples.forEach(sample => {
    const r = ws.addRow(sample);
    r.eachCell(c => {
      c.font = { color: { argb: 'FF9CA3AF' }, name: 'Arial', size: 10 };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    });
  });

  // Empty rows for actual data
  for (let i = 0; i < 47; i++) {
    const r = ws.addRow(['', '', '']);
    r.eachCell(c => {
      c.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
      c.font = { name: 'Arial', size: 10 };
    });
  }

  ws.getColumn('A').width = 28;
  ws.getColumn('B').width = 18;
  ws.getColumn('C').width = 20;
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Make instructions the active sheet shown first
  wb.views = [{ activeTab: 1 }];

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=bulk_import_template.xlsx');
  await wb.xlsx.write(res);
  res.end();
};

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
