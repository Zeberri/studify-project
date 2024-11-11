const express = require("express"),
    ejs = require("ejs"),
    mongoose = require("mongoose"),
    multer = require("multer"),
    session = require('express-session'),
    bcrypt = require("bcryptjs"),
    fs = require("fs"),
    nodemailer = require('nodemailer'),
    flash = require('connect-flash'),
    path = require("path"),
    app = express();

// Setting up the view engine and static files
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Database connection
mongoose.connect("mongodb://127.0.0.1:27017/studifyAPP", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Session middleware
app.use(session({
    secret: 'mysecretkey',
    resave: true,
    saveUninitialized: true
}));

// Flash messages middleware
app.use(flash());
app.use((req, res, next) => {
    res.locals.message = req.flash('message');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// Defining tutor and student schemas
const tutorSchema = new mongoose.Schema({
    fullName: String,
    phoneNumber: String,
    email: String,
    subjects: String,
    tutoringMode: String,
    qualifications: String,
    location: String,
    availability: [String],
    experience: String,
    username: String,
    password: String,
    profilePicture: {
        data: Buffer,
        contentType: String
    },
    dateRegistered: {
        type: Date,
        default: Date.now
    }
});

const studentSchema = new mongoose.Schema({
    fullName: String,
    email: String,
    phoneNumber: String,
    subjectsOfInterest: String,
    studyMode: String,
    location: String,
    availability: [String],
    username: String,
    password: String,
    dateRegistered: {
        type: Date,
        default: Date.now
    }
});

const studyGroupSchema = new mongoose.Schema({
    groupName: String,
    subjects: [String],
    capacity: Number,
    tutorName: String,
    description: String,
    availability: [String],
    password: String,
    groupProfilePicture: {
        data: Buffer,
        contentType: String
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

const StudyGroup = mongoose.model("StudyGroup", studyGroupSchema);
const Tutor = mongoose.model("Tutor", tutorSchema);
const Student = mongoose.model("Student", studentSchema);

// Multer configuration for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)); // Ensure unique filename with correct extension
    }
});
const upload = multer({ storage: storage });

// Multer configuration for group profile picture upload
const groupStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads'); // Ensure the uploads folder exists
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const groupUpload = multer({ storage: groupStorage });

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "josephtabele@gmail.com", // Sender email
        pass: "lqij ucnz xvav mgjf" // App password from Gmail
    }
});

// Route for homepage
app.get('/', async (req, res) => {
    try {
        const studyGroups = await StudyGroup.find(); // Fetch study groups from the database
        res.render('index', { studyGroups }); // Pass studyGroups to the EJS template
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Route for getting to group listed
app.get("/listed", (req, res) => {
    res.render("listed");
});

// Route for login homepage
app.get("/home", (req, res) => {
    res.render("home");
});

// About page
app.get("/about", (req, res) => {
    res.render("about");
});

// Tutor registration page
app.get("/tutor-registration", (req, res) => {
    res.render("tutor-registration");
});

// Route to display the registration success page
app.get("/registration-success", (req, res) => {
    res.render("registration-success");
});

// Tutor registration POST route
app.post("/tutor-registration", upload.single('profilePicture'), async (req, res) => {
    const { fullName, phoneNumber, email, subjects, tutoringMode, qualifications, location, availability, experience, username, password, confirm_password } = req.body;
    try {
        if (password !== confirm_password) {
            req.flash('error_msg', 'Passwords do not match');
            return res.redirect('/tutor-registration');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newTutor = new Tutor({
            fullName,
            phoneNumber,
            email,
            subjects,
            tutoringMode,
            qualifications,
            location,
            availability,
            experience,
            username,
            password: hashedPassword,
            profilePicture: {
                data: fs.readFileSync(path.join(__dirname, '/uploads/', req.file.filename)),
                contentType: 'image/png'
            }
        });

        await newTutor.save();

        // Send confirmation email
        const mailOptions = {
            from: "josephtabele@gmail.com",
            to: email,
            subject: "Tutor Registration Successful",
            text: `Dear ${fullName}, your registration is successful.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
            } else {
                console.log("Email sent: " + info.response);
            }
        });

        // Redirect to the success page
        res.redirect("/registration-success");

    } catch (err) {
        console.log(err);
        res.send("Error registering tutor");
    }
});

// Student registration page
app.get("/student-registration", (req, res) => {
    res.render("student-registration");
});

// Student registration POST route
app.post("/student-registration", async (req, res) => {
    const { fullName, email, phoneNumber, subjectsOfInterest, studyMode, location, availability, username, password, confirm_password } = req.body;
    try {
        if (password !== confirm_password) {
            req.flash('error_msg', 'Passwords do not match');
            return res.redirect('/student-registration');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newStudent = new Student({
            fullName,
            email,
            phoneNumber,
            subjectsOfInterest,
            studyMode,
            location,
            availability,
            username,
            password: hashedPassword
        });

        await newStudent.save();

        // Send confirmation email
        const mailOptions = {
            from: "josephtabele@gmail.com",
            to: email,
            subject: "Student Registration Successful",
            text: `Dear ${fullName}, your registration is successful.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
            } else {
                console.log("Email sent: " + info.response);
            }
        });

        // Redirect to the success page
        res.redirect("/registration-success");

    } catch (err) {
        console.log(err);
        res.send("Error registering student");
    }
});


// Login page
app.get("/login", (req, res) => {
    res.render("login");
});

// Tutor login POST route
app.post("/tutor-login", async (req, res) => {
    const { tutorEmail, tutorPassword } = req.body;
    try {
        const tutor = await Tutor.findOne({ email: tutorEmail });
        console.log("Tutor Found:", tutor); // Debugging line
        if (!tutor) {
            req.flash('error_msg', "This email does not exist");
            return res.redirect('/login');
        }

        const isVerified = await bcrypt.compare(tutorPassword, tutor.password);
        if (isVerified) {
            req.session.tutor_id = tutor._id;
            req.session.tutor_name = tutor.fullName; // Store the tutor's name in the session
            req.flash('message', 'Welcome to your dashboard!');
            return res.redirect('/dashboard-tutor');
        } else {
            req.flash('error_msg', "Invalid password");
            return res.redirect('/login');
        }

    } catch (err) {
        console.error("Error logging in tutor:", err); // Improved error logging
        req.flash('error_msg', 'Error logging in');
        return res.redirect('/login');
    }
});

// Student login POST route
app.post("/student-login", async (req, res) => {
    const { studentEmail, studentPassword } = req.body;
    try {
        const student = await Student.findOne({ email: studentEmail });
        console.log("Student Found:", student); // Debugging line
        if (!student) {
            req.flash('error_msg', "This email does not exist");
            return res.redirect('/login');
        }

        const isVerified = await bcrypt.compare(studentPassword, student.password);
        if (isVerified) {
            req.session.student_id = student._id;
            req.flash('message', 'Welcome to your dashboard!');
            return res.redirect('/dashboard-student');
        } else {
            req.flash('error_msg', "Invalid password");
            return res.redirect('/login');
        }

    } catch (err) {
        console.error("Error logging in student:", err); // Improved error logging
        req.flash('error_msg', 'Error logging in');
        return res.redirect('/login');
    }
});


// Tutor dashboard route
app.get("/dashboard-tutor", async (req, res) => {
    if (req.session.tutor_id) {
        try {
            const tutor = await Tutor.findById(req.session.tutor_id);
            const studyGroups = await StudyGroup.find({ tutorName: tutor.fullName }); // Fetch study groups for this tutor
            res.render("dashboard-tutor.ejs", { tutor, studyGroups, message: req.flash('message') });
        } catch (err) {
            console.error("Error fetching tutor data:", err);
            req.flash('error_msg', 'Error fetching tutor data');
            return res.redirect('/login');
        }
    } else {
        req.flash('error_msg', 'Please login as a tutor first');
        return res.redirect('/login');
    }
});


// Student dashboard route
app.get("/dashboard-student", async (req, res) => {
    if (req.session.student_id) {
        try {
            const student = await Student.findById(req.session.student_id);
            res.render("dashboard-student.ejs", { student, message: req.flash('message') });
        } catch (err) {
            console.error("Error fetching student data:", err); // Improved error logging
            req.flash('error_msg', 'Error fetching student data');
            return res.redirect('/login');
        }
    } else {
        req.flash('error_msg', 'Please login as a student first');
        return res.redirect('/login');
    }
});


// Creation success page
app.get("/creation-success", (req, res) => {
    res.render("creation-success");
});

// Route to render study group creation page
app.get("/study-group", async (req, res) => {
    if (req.session.tutor_id) {
        try {
            const tutor = await Tutor.findById(req.session.tutor_id);
            res.render("study-group", { tutorName: tutor.fullName }); // Pass tutor's full name to the view
        } catch (err) {
            console.error("Error fetching tutor data:", err);
            req.flash('error_msg', 'Error fetching tutor data');
            return res.redirect('/login');
        }
    } else {
        req.flash('error_msg', 'Please login as a tutor first');
        return res.redirect('/login');
    }
});

// Study group creation POST route
app.post("/study-group", groupUpload.single('groupProfilePicture'), async (req, res) => {
    const { groupName, subjects, capacity, description, availability, password, confirm_password } = req.body;
    const tutorName = req.session.tutor_name; // Get the tutor's name from session

    try {
        // Validate password match
        if (password !== confirm_password) {
            req.flash('error_msg', 'Passwords do not match');
            return res.redirect('/study-group');
        }

        // Save new study group to the database
        const newStudyGroup = new StudyGroup({
            groupName,
            subjects: subjects.split(',').map(subject => subject.trim()),
            capacity,
            tutorName: tutorName, // Use the fetched tutor name
            description,
            availability,
            password: await bcrypt.hash(password, 10),
            groupProfilePicture: {
                data: fs.readFileSync(path.join(__dirname, '/uploads/', req.file.filename)),
                contentType: req.file.mimetype
            }
        });

        await newStudyGroup.save();
        req.flash('message', 'Study Group created successfully!');
        res.redirect("/creation-success");

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating study group');
        res.redirect('/study-group');
    }
});


// Logout route
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
        }
        res.redirect('/login');
    });
});


// Assuming you're using Express.js
app.post('/search', async (req, res) => {
    const { groupName, subject, location } = req.body;
    
    // Create the search filter object
    let searchCriteria = {};

    // Add filters only for fields that are provided
    if (groupName) {
        searchCriteria.groupName = groupName;
    }
    if (subject) {
        searchCriteria.subject = subject;
    }
    if (location) {
        searchCriteria.location = location;
    }

    // Query your database using the searchCriteria
    try {
        const studyGroups = await StudyGroup.find(searchCriteria);
        res.render('search_result', { studyGroups });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred while searching');
    }
});


// Start the server
app.listen(2500, () => console.log("Server started on port 2500"));
