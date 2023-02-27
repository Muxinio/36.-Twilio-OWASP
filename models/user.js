const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  address:{
    type:String,
    required: false
  },
  age:{
    type:String,
    required: false
  },
  phone:{
    type:String,
    required: false
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  }
});
userSchema.methods.validPassword = function(password) {
 return bcrypt.compareSync(password, this.password);
  };
const User = mongoose.model('User', userSchema);
module.exports = User;

