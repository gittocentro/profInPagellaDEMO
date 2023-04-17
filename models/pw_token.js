const mongoose = require("mongoose")
const {Schema} = mongoose;
const User = require("./user")

const pwTokenSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    expirationDate: {
        type: Date, default: Date.now,
    }
},{timestamps: true})

pwTokenSchema.index({expirationDate: 1}, {expireAfterSeconds: 600})

pwTokenSchema.statics.isUnique = async function(id) {
    const result = await this.findById(id)
    if (!result) {
        return true
    } else {
        return false
    }
}

const PwToken = mongoose.model("PwToken", pwTokenSchema)

module.exports = PwToken

