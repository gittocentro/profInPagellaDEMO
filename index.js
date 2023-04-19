if (process.env.NODE_NEV !== 'production') {
    require("dotenv").config();
}


const express = require("express")
const app = express()
const path = require("path")

app.use("*", (req,res) => {
    res.render("allgone")
})

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
    for (var i = 0; i < review.likes.length; i++) {
        console.log(review.likes[i])
        if (review.likes[i].equals(user._id)) {
            await Review.findByIdAndUpdate(review._id, {$pull: {likes: {$in: [user._id] } } } )
            return res.redirect("/teachers/"+teacher._id) //PER ORA
            break
        }
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


