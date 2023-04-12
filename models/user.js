const mongoose = require("mongoose")
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt")
const AppError = require("../utils/AppError")
const PwToken = require("./pw_token")

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, "username is required"]
    },
    email: {
        type:String,
        required: [true, "email is required"]
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    isVerified: {
        type: Boolean,
        default: false
    }/*,
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Reviews",
            validate: [v => v.length < 4, "Non puoi recensire più di 3 volte lo stesso professore"],
        }
    ]*/
})
userSchema.statics.findAndValidate =  async function(email, password) {
    const foundUser = await this.findOne({email})
    if (foundUser && foundUser.isVerified) {
        const isValid = await bcrypt.compare(password, foundUser.password)
        return isValid ? foundUser : false
    }
    return false
}

userSchema.statics.findAndRegister = async function(username,email,password) {
    const foundUser = await this.findOne({$or : [
        {email},
        {username}
    ]})
    if (foundUser) {
        //MEANS THAT WE CAN'T CONTINUE SINGING UP
        return true
    } else {
        return false
    }
}
userSchema.pre("save", async function(next) {
    if (!this.isVerified) {
        this.password = await bcrypt.hash(this.password, 12)
        //SAVE
    }
    //SAVE
    next()
})

userSchema.pre("findOneAndUpdate", async function(next) {
    const doc = await this.model.findOne(this.getQuery());
    const pwToken = await PwToken.findByIdAndDelete(doc._id)
    next()
})


const User = mongoose.model("User", userSchema)

module.exports = User;
