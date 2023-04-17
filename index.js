if (process.env.NODE_NEV !== 'production') {
    require("dotenv").config();
}


const express = require("express")
const app = express()
const path = require("path")
const mongoose = require("mongoose")
const morgan = require("morgan")
const ejsMate = require("ejs-mate")
const bcrypt = require("bcrypt")
const session = require("express-session")
const flash = require("connect-flash")
const methodOverride = require("method-override")
const bodyParser = require("body-parser")
const mongoSanitize= require('express-mongo-sanitize')
const helmet = require("helmet")
const cloudinary = require("cloudinary").v2
//CLOUDINARY CONFIGURATION
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
})
const MongoDBStore = require("connect-mongo")(session);
//JOI
const Joi = require("joi")
    //SCHEMAS    
    const {reviewSchema,userRegisterSchema,userLoginSchema,passwordRecoverSchema} = require("./models/schemas")
//Utils
    //AppError
    const AppError = require("./utils/AppError")
    //catchAsync
    const catchAsync = require("./utils/catchAsync");
    //MAIL
//MODELS
const allModels = require("./models/allModels")
const User = require("./models/user")
const Review = require("./models/review")
const School = require("./models/school")
const Teacher = require("./models/professore")
////////////////////////////////
const dbUrl = process.env.DBURL

//MONGO DB
mongoose.connect(dbUrl, {useNewUrlParser: true, useUnifiedTopology: true})
.then(() => {
    console.log("CONNECTION OPEN")
})
.catch(err => {
    console.log("CONNECTION ERROR!!!")
    console.log(err)
});

const store = new MongoDBStore({
    url: dbUrl,
    secret:"thisshouldbeabettersecret",
})

const sessionOptions = {
    store,
    name:"session",
    secret: "thisisnotagoodsecret", 
    resave: true,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        //secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    }
}

//  MIDDLEWARE

//VALIDATE TEACHER
const validateTeacher = (req,res,next) => {
    const teacherSchema = Joi.object({
        teacher: Joi.object({
            first: Joi.string().required(),
            last: Joi.string().required(),
            subjects: Joi.array().required(),
        }).required()
    })
    const {error} = teacherSchema.validate(req.body)
    if (error) {
        const msg = error.details.map(el => el.message).join(",")
        throw new AppError(msg, 400) 
    } else {
        next()
    }
}

const validateSearch = (req,res,next) => {
    const {q} = req.query
    if (!q) {
        req.flash("message", "Devi inserire qualcosa nella barra di ricerca...")
        return res.redirect("/")
    }
    next()
}
//FOR SIGNUP ROUTE
const validateRegisterUser = (req,res,next) => {
    console.log(req.body)
    const {error} = userRegisterSchema.validate(req.body)
    if (error) {
        const msg = error.details.map(el => el.message).join(",")
        req.flash("message", msg)
        return res.redirect("/signup")
    }
    next()
}
//FOR LOGIN ROUTE
const validateLoginUser = (req,res,next) => {
    const {error} = userLoginSchema.validate(req.body)
    if (error) {
        const msg = error.details.map(el => el.message).join(",")
        req.flash("message", msg)
        return res.redirect("/login")
    }
    next()
}
 
const validateReview = (req,res,next) => {
    const {error} = reviewSchema.validate(req.body)
    if (error) {
        const msg = error.details.map(el => el.message).join(",")
        req.flash("message", msg)
        return res.redirect("/teachers/"+req.params.id + "/new_review")
    }
    next()
}

const validatePasswordRecover = (req,res,next) => {
    const {error} =  passwordRecoverSchema.validate(req.body)
    if (error) {
        const msg = error.details.map(el => el.message).join(",")
        req.flash("message", msg)
        return res.redirect("/pw_recover/verification/"+req.params.pwTk_id)
    }
    next()
}

//MIDDLEWARE REQUIRE LOGIN
const requireLogin = (req,res,next) => {
    if (!req.session.user_id) {
        req.flash("message","Devi prima registrarti o loggarti!")
        return res.redirect("/login")
    } 
    next()

}

const isNotLoggedIn = (req,res,next) => {
    if (req.session.user_id) {
        req.flash("message", "Sei già loggato!")
        return res.redirect("/")
    }
    next()
}

app.use(flash())
app.use(methodOverride("_method"))

//MORGAN
app.use(morgan("dev"))


app.use(express.static(path.join(__dirname, "public")));

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.use(express.urlencoded({extended: true}))

app.use(session(sessionOptions))
app.use(mongoSanitize())
//app.use(helmet({contentSecurityPolicy: false}))
app.use(helmet())


app.get("/", catchAsync(async(req,res) => {
    const user = await User.findById(req.session.user_id)
    res.render("home", {user, messages: req.flash("message")});
}))

//RICERCA INSEGNANTI
app.get("/teachers", validateSearch,catchAsync(async (req,res,next) => {
    const {q} = req.query;
    //REGEX FOR SUBJECTS ///////////////////////////////////////////////////////////////////////////
    var s = [q];
    let reg  = s.map( function(q){ 
        return new RegExp( '^'+q+'.*','i'); 
    })
    ////////////////////////////////////////////////////////////////////////////////////////////////
    const teachers = await Teacher.find({$or : [{last: {$regex: new RegExp('^'+ q +'.*', 'i')}}, {subjects: {$in: reg}} ]})
    .populate("school")
    if (teachers.length == 0) {
        return next(new AppError("Nessun Insegnante trovato (Prova a cercare per cognome o per materia)",404))
    }

    res.render("teachers/", {teachers})
}))


//POST
app.post("/teachers", catchAsync(async (req,res,next) => { //
    const {result} = req.body;                             // SEND A GET REQUEST WITH THE FORM DATA
    res.redirect(`/teachers?q=${result}`)                  //
}))

//INSEGNANTE
app.get("/teachers/:id", catchAsync(async (req,res,next) => {
    const user = await User.findById(req.session.user_id)
    const {id} = req.params; 
    const teacher = await Teacher.findById(id)
    .populate("school")
    .populate({
        path: "reviews",
        populate: {
            path: "author"
        }
    })
    if (!teacher) {
        return next(new AppError("Insegnante non trovato o non più disponibile",404))
    }
    res.render("teachers/teacher", {teacher,user,message: req.flash("message")})
}))



//INSEGNANTE //REVIEW
app.get("/teachers/:id/new_review", requireLogin, catchAsync(async(req,res) => {
    const {id} = req.params;
    const {user_id} = req.session
    const teacher = await Teacher.findById(id)
    res.render("teachers/review", {teacher, id, user_id, message: req.flash("message")})
}, "Teacher not found", 404))

app.post("/teachers/:id/review", requireLogin,validateReview,catchAsync(async(req,res) => {
    const {id} = req.params;
    //const user = await User.findById(req.session.user_id)
    const review = new Review(req.body.review);
    const teacher = await Teacher.findById(id)

    review.author = req.session.user_id
    //user.reviews.push(review)
    teacher.reviews.push(review)

    //Aggiungo la recensione all'insegnante
    //Aggiungo l'insegnante alla recensione
    //salvo tutto
    //await user.save();
    await teacher.save();
    await review.save();
    req.flash("messages","Recensione creata con successo")
    res.redirect(`/teachers/${id}/`)
}))

app.post("/teachers/:id/:r_id/like", requireLogin,catchAsync(async (req,res,next) => {
    const user = await User.findById(req.session.user_id)
    const teacher = await Teacher.findById(req.params.id);
    const review = await Review.findById(req.params.r_id)
    console.log(review.likes[0])
    console.log(req.session.user_id)

    for (user._id in review.likes) {
        //LIKE TOLTO
        await Review.findByIdAndUpdate(review._id, {$pull: {likes: {$in: [user._id] } } } )
        return res.redirect("/teachers/"+teacher._id) //PER ORA
    }
    review.likes.push(req.session.user_id)
    await review.save()
    return res.redirect("/teachers/"+teacher._id) //PER ORA
}))

//AUTH//////////////////////////////////////////////////

////SIGNUP

//GET
app.get("/signup", isNotLoggedIn, (req,res) => {
    res.render("auth/signup", {message: req.flash("message")});
})
//POST
app.post("/signup",isNotLoggedIn,validateRegisterUser, catchAsync(async (req,res,next) => {
    const {password,username} = req.body.user
    const foundUser = await User.findOne({username});
    if (foundUser) {
        req.flash("message","Nome Utente o Email già in utilizzo, sembra che stiamo diventando popolari...")
        return res.redirect("/signup")
    }

    const user = new User(req.body.user)
    //SESSION VERIFICATION
    //SAVING
    await user.save()
    req.session.user_id = user._id
    //REDIRECT
    res.redirect("/")
}))


////LOGIN
//GET
app.get("/login", (req,res) => {
    res.render("auth/login", {message: req.flash("message")})
})
//POST
app.post("/login",validateLoginUser,catchAsync(async (req,res,next) => {
    const {username, password} = req.body.user
    const foundUser = await User.findAndValidate(username,password);
    if (foundUser) {
        req.session.user_id = foundUser._id
        res.redirect("/")
    } else {
        req.flash("message", "Utente o Password errati")
        res.redirect("/login")
    }

}))
////LOGOUT
//POST
app.post("/logout", (req,res) => {
    req.session.destroy()
    res.redirect("/")
})

//LEGACY////////////////////////////////////////////////

//TERMINI
app.get("/terms", (req,res) => {
    res.render("legacy/terms")
})
//CONDIZIONI
app.get("/privacy", (req,res) => {
    res.render("legacy/privacy")
})
//COOKIES
app.get("/cookies", (req,res) => {
    res.render("legacy/cookies")
})
////////////////////////////////////////////////////////

//ADMIN

app.get("/admin", catchAsync(async(req,res,next) => {
    const teachers = await Teacher.find({})
    res.render("admin/admin", {teachers});
}))

app.get("/admin/teacher/new", catchAsync( async(req,res, next) => {
    const schools = await School.find({})

    res.render("admin/cr_teacher", {schools})
}))

app.post("/admin/teacher/new", catchAsync(async (req,res,next) => {
    const school_id = req.body.teacher.school
    const teacher = new Teacher(req.body.teacher)
    teacher.school = school_id

    const school = await School.findById(school_id)
    school.teachers.push(teacher._id)

    await school.save()
    await teacher.save()
    res.redirect("/admin/")
}))

app.delete("/admin/teacher/:id", catchAsync(async (req,res,next) => {
    const {id} = req.params;
    const teacher = await Teacher.findByIdAndDelete(id)
    res.redirect("/admin")
}))


//404 NOT FOUND
app.all("*",(req,res, next) => {
    return next(new AppError("ERROR 404 Page not found", 404))
})

//ERROR HANDLING NAME
app.use((err, req,res, next) => {
    const {name} = err;
    console.log(name);
    return next(err);
})

//ERROR HANDLER
app.use((err,req,res,next) => {
    const { status = 500 } = err
    const { message = "Something Went Wrong on server side" } = err
    console.log("***********ERROR***********")
    console.log(message)
    console.log(status)
    res.status(status).render("error",{message})
})

app.listen(3000,() => {
    console.log("LISTNENING ON PORT 3000");
})


