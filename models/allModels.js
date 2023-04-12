const Teacher = require("./professore")
const Review = require("./review")
const School = require("./school")
const User = require("./user")

const mongoose = require("mongoose")

Teacher.watch().on("change", async function(data) {
})

Review.watch().on("change", async function(data) {
    if (data.operationType == "delete") {
        const id = data.documentKey._id
        const teachers = await Teacher.find({})
        for (let teacher of teachers) {
            for (var i = 0; i < teacher.reviews.length; i++) {
                let index = teacher.reviews.indexOf(id)
                //
                if (teacher.reviews.includes(id,index)) {
                    teacher.reviews.splice(index, 1)
                    console.log(teacher.reviews)
                    console.log("MONGO RELATION DELETED: " + teacher.reviews[i])
                }
            }
            //SAVE THE TEACHER
            await teacher.save()
        }
    }
})