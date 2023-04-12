const mongoose = require("mongoose")
const Schema = mongoose.Schema;


const schoolSchema = new Schema ({
    name: {
        type: String,
        required: [true, "School Name is required"],
    },
    city: {
        type: String,
        required: [true, "School city is required"]
    },
    teachers: [
        {
            type: Schema.Types.ObjectId,
            ref: "Teacher",
        }
    ]
})

const School = mongoose.model("School", schoolSchema);

module.exports = School