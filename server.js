const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL Database Connection Configuration
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Default XAMPP password blank hota hai
    database: 'university_attendance'
});

db.connect(err => {
    if (err) {
        console.error('Database Connection Failure:', err);
    } else {
        console.log('✅ Connected successfully to MySQL Database!');
    }
});

// 1. Fetch Subject Attendance Summary & Auto-Calculation
app.get('/api/attendance-summary/:subjectId', (req, res) => {
    const subjectId = req.params.subjectId;
    
    const query = `
        SELECT 
            s.StudentID,
            s.RollNumber,
            s.StudentName,
            s.StudentGroup,
            COUNT(DISTINCT cc.ClassID) AS TotalConductedClasses,
            SUM(CASE WHEN sa.Status = 'Present' THEN 1 ELSE 0 END) AS AttendedClasses,
            ROUND((SUM(CASE WHEN sa.Status = 'Present' THEN 1 ELSE 0 END) / COUNT(DISTINCT cc.ClassID)) * 100, 2) AS Percentage
        FROM Students s
        CROSS JOIN ConductedClasses cc
        LEFT JOIN StudentAttendance sa ON cc.ClassID = sa.ClassID AND s.StudentID = sa.StudentID
        WHERE cc.SubjectID = ?
        GROUP BY s.StudentID;
    `;

    db.query(query, [subjectId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. Submit New Attendance Session
app.post('/api/mark-attendance', (req, res) => {
    const { subjectId, teacherId, attendanceList } = req.body;

    const classQuery = 'INSERT INTO ConductedClasses (SubjectID, TeacherID) VALUES (?, ?)';
    db.query(classQuery, [subjectId, teacherId], (err, classResult) => {
        if (err) return res.status(500).json({ error: err.message });

        const classId = classResult.insertId;
        const attendanceValues = attendanceList.map(item => [classId, item.studentId, item.status]);

        const markQuery = 'INSERT INTO StudentAttendance (ClassID, StudentID, Status) VALUES ?';
        db.query(markQuery, [attendanceValues], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Attendance marked successfully!', classId });
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Attendance Server running on http://localhost:${PORT}`);
});