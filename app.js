if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const path = require('path');
const Video = require('./models/video.js');
const Student = require('./models/student.js');
const Teacher = require('./models/teacher.js');
const passport = require('passport')
const LocalStrategy = require('passport-local')
const session = require('express-session');
const { Console } = require('console');
const { isLoggedIn } = require('./middleware');
const multer = require('multer')
const { storage } = require('./cloudinary');
const upload = multer({ storage });
const Cloudinary = require('cloudinary').v2;
const { response } = require('express');


mongoose.connect('mongodb://localhost:27017/vidify', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});




const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}))




app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

passport.use(new LocalStrategy(Teacher.authenticate()));
passport.serializeUser(Teacher.serializeUser());
passport.deserializeUser(Teacher.deserializeUser());



function setCharAt(str, index, chr) {
    if (index > str.length - 1) return str;
    return str.substring(0, index) + chr + str.substring(index + 1);
}

function toJPG(str) {
    const length = str.length - 1
    str = setCharAt(str, (length - 2), 'j')
    str = setCharAt(str, (length - 1), 'p')
    str = setCharAt(str, (length), 'g')
    return str
}







app.get('/', (req, res) => {
    const isLoggedIn = req.session.isAuthenticated
    res.render('home', { isLoggedIn })
});

app.get('/videos/about', (req, res) => {
    ('here here here')
    res.render('videos/about')
})

app.get('/videos/dashboard', isLoggedIn, async (req, res) => {
    var videos = []
    const teacher = await Teacher.findById(req.session.currentId)
    console.log(teacher)
    const name = teacher.username;
    const vidIds = teacher.videoIds
    for (id in vidIds) {
        const video = await Video.findById(vidIds[id])
        const vidObject = {
            title: video.title,
            description: video.description,
            URL: video.thumbnailURL,
            ID: video.id
        }
        videos.push(vidObject)
    }
    res.render('videos/dashboard', { videos, name })
});


app.get('/videos', isLoggedIn, async (req, res) => {
    const video = await Video.find({});
    res.render('videos/index', { video })
});
app.get('/videos/new', isLoggedIn, (req, res) => {
    res.render('videos/new');
})

app.post('/videos', isLoggedIn, upload.single('image'), async (req, res) => {
    const thumbnailURL = toJPG(req.file.path)
    const video = new Video({
        title: req.body.video.title,
        description: req.body.video.description,
        URL: req.file.path,
        thumbnailURL: toJPG(req.file.path)
    });
    await video.save();
    const currentUser = await Teacher.findById(req.session.currentId);
    currentUser.videoIds.push(video.id);
    await currentUser.save();
    res.redirect(`/videos/${video._id}`)
})

app.get('/videos/:id', isLoggedIn, async (req, res,) => {
    const video = await Video.findById(req.params.id);
    var rows = [['Name', 'Email']]
    for (id in video.watchIds) {
        const student = await Student.findById(video.watchIds[id])
        rows.push([student.username, student.email])
    }
    const send = {
        video: video,
        rows: rows

    };
    res.render('videos/show', { send });
});

app.get('/videos/:id/edit', isLoggedIn, async (req, res) => {
    const video = await Video.findById(req.params.id)
    res.render('videos/edit', { video });
})

app.put('/videos/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const video = await Video.findByIdAndUpdate(id, { ...req.body.video });
    res.redirect(`/videos/${video._id}`)
});

app.get('/watch/:id', async (req, res) => {
    if (req.session.isAuthenticated || req.session.isStudent) {
        const { id } = req.params;
        const video = await Video.findById(id);
        res.render(`videos/watch`, { video })
    } else {
        req.session.returnTo = `/watch/${req.params.id}`
        res.redirect('../auth/login/student')
    }
})


app.post('/vidWatch', async (req, res) => {
    if (req.session.isStudent) {
        const video = await Video.findById(req.body.vidId)
        const vidArray = video.watchIds
        if (!vidArray.includes(req.session.studentId)) {
            video.watchIds.push(req.session.studentId)
            await video.save();
        }
    }
})







app.get('/logout', async (req, res) => {
    req.session.isAuthenticated = false
    req.session.isStudent = false
    req.session.studentId = null
    res.redirect('/')
})

app.get('/auth/login/teacher', async (req, res) => {
    res.render('auth/login/teacher')
})

app.post('/auth/login/teacher', async (req, res) => {
    const { username, password } = req.body.teacher;
    const user = await Teacher.authenticate()(username, password)
    if (user.user.email == null) {
        console.log('failed')
    } else {
        req.session.isAuthenticated = true
        req.session.currentId = user.user.id
    }
    res.redirect('/videos/dashboard')
})

app.get('/auth/register/teacher', async (req, res) => {
    res.render('auth/register/teacher')
})


app.post('/auth/register/teacher', async (req, res) => {
    const { username, email, password } = req.body.teacher;
    const user = new Teacher({ email, username })
    const newTeacher = await Teacher.register(user, password)
    await user.save();
    req.session.isAuthenticated = true
    req.session.currentId = user.id
    res.redirect('/videos/dashboard')
})










app.get('/auth/login/student', async (req, res) => {
    res.render('auth/login/student')
})

app.post('/auth/login/student', async (req, res) => {
    console.log('her her her')
    const { username, password } = req.body.student;
    const user = await Student.authenticate()(username, password)
    if (user.user.email == null) {
        res.redirect('/auth/login/student')
    } else {
        req.session.isStudent = true
        req.session.studentId = user.user._id
        res.redirect(req.session.returnTo)
    }
})

app.get('/auth/register/student', async (req, res) => {
    res.render('auth/register/student')
})

app.post('/auth/register/student', async (req, res) => {
    const { username, email, password } = req.body.student;
    console.log('her here')
    console.log(req.body.student)
    console.log('done')
    console.log(username)
    const student = new Student({ email, username })
    const newStudent = await Student.register(student, password)
    await student.save();
    req.session.isStudent = true
    req.session.studentId = student._id
    res.redirect(req.session.returnTo)
})

// app.all('*', function (req, res) {
//     res.render('videos/random');
// });


app.listen(3000, () => {
    console.log('Serving on port 3000')
})