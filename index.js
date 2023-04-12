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
    const Email = require("./utils/mailer")
//MODELS
const allModels = require("./models/allModels")
const User = require("./models/user")
const Review = require("./models/review")
const School = require("./models/school")
const Teacher = require("./models/professore")
const Token = require("./models/token")
const PwToken = require("./models/pw_token")
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

//MIDDLEWAREPASSWORD

const verifyPassword = (req, res, next) => {
    const {password} = req.query;
    if (password === "progettocontrappasso") {
        next();
    }
    throw new AppError("Password is required!!!", 401)
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
        req.flash("message", "Non puoi recuperare un account se sei già loggato")
        return res.redirect("/")
    }
    next()
}

const isVerifying = (req,res,next) => {
    if (!req.session.tk_id) {
        throw new AppError("Non hai accesso a questa pagina", 401)
    }
    if (req.session.user_id) {
        throw new AppError("Non puoi registrarti se sei già loggato al sito", 401)
    }
    next()
}

const isVerifyingPw = (req,res,next) => {
    if (!req.session.pwTk_id) {
        throw new AppError("Non hai accesso a questa pagina", 401)
    }
    next()
}


const isVerifyingUser = (req,res,next) => {
    const {tk_id} = req.params;
    console.log("ID N1 : " + tk_id)
    console.log("ID N2 :"+ req.session.tk_id)
    if (req.session.tk_id === tk_id) {
        next()
    } else {
        throw new AppError("Non hai accesso a questa pagina", 401)
    }
}

const isVerifyingPwUser = (req,res,next) => {
    const {pwTk_id} = req.params;
    console.log("ID N1 : " + pwTk_id)
    console.log("ID N2 : "+ req.session.pwTk_id)
    if (req.session.pwTk_id === pwTk_id) {
        next()
    } else {
        throw new AppError("Non hai accesso a questa pagina. Livt d'annanz...", 401)
    }
}

const sendVerificationMail = catchAsync(async(req, res,next) => {
    const token = await Token.findById(req.session.tk_id)
    .populate("user")
    if (!token) {
        return next(new AppError("Email di verifica scaduta, Registrati di nuovo", 410))
    }
    await Email.sendVerificationMail(token)
    next()
})

const sendPwCode = catchAsync(async(req,res,next) => {
    const pwToken = await PwToken.findById(req.session.pwTk_id)
    .populate("user")
    if (!pwToken) {
        return next(new AppError("Link di verifica scaduto. E' più reattivo Schumacher...",401))
    }
    await Email.sendPasswordCode(pwToken)
    next()
})

const pwTokenExist = catchAsync(async(req,res,next) => {
    const pwToken = await PwToken.findById(req.session.pwTk_id)
    const {pwTk_id} = req.session
    if (!pwToken) {
        return next(new AppError("Link di verifica scaduto. E' più reattivo Schumacher",401))
    }
    next()
})

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
app.use(helmet({contentSecurityPolicy: false}))
//app.use(helmet())
app.use("",(req,res,next) => {console.log(req.query);next()})



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
        return next(new AppError("Nessun Insegnante trovato",404))
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
    res.render("teachers/teacher", {teacher,message: req.flash("message")})
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

//AUTH//////////////////////////////////////////////////

////SIGNUP

//GET
app.get("/signup", isNotLoggedIn, (req,res) => {
    res.render("auth/signup", {message: req.flash("message")});
})
//POST
app.post("/signup",isNotLoggedIn,validateRegisterUser, catchAsync(async (req,res,next) => {
    const {password,email,username} = req.body.user
    const foundUser = await User.findAndRegister(username,email,password)
    if (foundUser) {
        req.flash("message","Nome Utente o Email già in utilizzo, sembra che stiamo diventando popolari...")
        return res.redirect("/signup")
    }

    const user = new User(req.body.user)
    const token = new Token({user: user._id})
    token._id = user._id
    //SESSION VERIFICATION
    req.session.tk_id = token._id
    //SAVING
    await user.save()
    await token.save()
    //REDIRECT
    res.redirect("/signup/verification")
}))

//EMAIL VERIFICATION
app.get("/signup/verification",isVerifying,sendVerificationMail, catchAsync(async(req,res,next) => {
    const token = await Token.findById(req.session.tk_id).populate("user")
    if (!token) {
        return next(new AppError("Email di verifica scaduta, Registrati di nuovo", 410))
    }
    res.render("auth/verification", {token})
}))

app.get("/signup/verification/:tk_id",isNotLoggedIn, isVerifyingUser, catchAsync(async(req,res,next) => {
    const {tk_id} = req.params
    const token = await Token.findById(tk_id)
    if (!token) {
        return next(new AppError("Email di verifica scaduta, Registrati di nuovo", 410))
    }
    const user = await User.findById(token.user._id)
    user.isVerified = true
    await user.save()
    req.session.tk_id = null
    await Token.findByIdAndDelete(tk_id)
    //SESSIONE UTENTE
    req.session.user_id = user._id
    req.flash("message", "Registrazione completata!")
    res.redirect("/?verified_user=true")
}))

////LOGIN
//GET
app.get("/login", (req,res) => {
    res.render("auth/login", {message: req.flash("message")})
})
//POST
app.post("/login",validateLoginUser,catchAsync(async (req,res,next) => {
    const {email, password} = req.body.user
    const foundUser = await User.findAndValidate(email,password);
    if (foundUser) {
        req.session.user_id = foundUser._id
        res.redirect("/")
    } else {
        req.flash("message", "Utente o Password errati")
        res.redirect("/login")
    }

}))

////PASSWORD RECOVER
//GET
app.get("/pw_recover", (req,res) => {
    res.render("auth/pw_recover",  {message: req.flash("message")})
})

app.get("/pw_recover/verification",isNotLoggedIn,isVerifyingPw, sendPwCode,pwTokenExist, catchAsync(async(req,res,next) => {
    const pwToken = await PwToken.findById(req.session.pwTk_id)
    .populate("user")
    res.render("auth/pw_recover_verification", {pwToken})
}))

app.get("/pw_recover/verification/:pwTk_id", isNotLoggedIn,isVerifyingPwUser,pwTokenExist, catchAsync(async(req,res,next) => {
    const {pwTk_id} = req.params
    const pwToken = await PwToken.findById(pwTk_id)
    res.render("auth/pw_change", {pwToken,message: req.flash("message")})
    //req.session.pwTk_id = null
}))

//POST
app.post("/pw_recover", isNotLoggedIn,catchAsync(async (req,res,next) => {
    const {user_info} = req.body;
    const user = await User.findOne({$or: [{email: user_info},{username: user_info}]})
    if (!user || user.isVerified == false) {
        req.flash("message", "Utente non esistente o non verificato")
        res.redirect("/pw_recover")
    }

    const pwToken = new PwToken({user: user._id})
    pwToken._id = user._id

    if (!await PwToken.isUnique(pwToken._id)) {
        req.flash("message", "E' stata già mandata una richiesta da questo account per cambiare la password. Riprova")
        return res.redirect("/pw_recover")
    }

    req.session.pwTk_id = pwToken._id
    await pwToken.save()
    res.redirect("/pw_recover/verification")
}))
//PUT
app.put("/pw_recover/verification/:pwTk_id",isNotLoggedIn, validatePasswordRecover,pwTokenExist, catchAsync(async(req,res,next) => {
    const {password} = req.body
    const {pwTk_id} = req.params;
    const hashedPw = await bcrypt.hash(password, 12)

    const user = await User.findByIdAndUpdate(pwTk_id, {password:hashedPw});
    req.session.user_id = user._id
    req.flash("message", "Password cambiata con successo")
    res.redirect("/")
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
/*
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
}))*/


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


