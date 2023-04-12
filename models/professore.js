const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const teacherSchema =  new Schema ({
  first: {
      type: String,
      required: [true, "Il professore deve avere il nome..."],
  },
  last: {
      type: String,
      required: [true, "Il professore deve avere il cognome..."],
  },
  school: {
        type: Schema.Types.ObjectId,
        ref: "School",
    },
  subjects: {
      type: [String],
      validate: [v => Array.isArray(v) && v.length > 0, "SUBJECTS ARE REQUIRED!!"],
  },
  reviews: [
    {
        type: Schema.Types.ObjectId,
        ref: "Review",
    }
  ] 
})

teacherSchema.virtual("fullName").get(function () {
    return this.first + " " + this.last;
})

//DA IMPLEMENTARE
/*teacherSchema.virtuals("avgVotes").get(function () {

})
*/
//

const Teacher = mongoose.model("Teacher", teacherSchema);

module.exports = Teacher;
