const express = require('express');
const app = express();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const multer = require('multer');
const User = require('./models/user');
const path = require('path')
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const client = require('twilio')("TWILIO_AUTH_TOKEN","7c68b76b0fee4e796c3e733882d4b331");
require('dotenv').config()

// Configurar la conexión a la base de datos MongoDB
mongoose.connect('mongodb://localhost:27017/dbMux', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conexión a la base de datos establecida'))
  .catch((err) => console.log(err));

// Configurar Passport para autenticación local
passport.use(new LocalStrategy({ usernameField: 'email' },
  function (email, password, done) {
    User.findOne({ email: email }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false, { message: 'Email no encontrado.' }); }
      console.log("Contraseña ingresada: ", password); // Agregar un console.log para verificar la contraseña ingresada
      console.log("Contraseña en la base de datos: ", user.password); // Agregar un console.log para verificar la contraseña almacenada en la base de datos
      if (!user.validPassword(password)) { return done(null, false, { message: 'Contraseña incorrecta.' }); }
      return done(null, user);
    });
  }
));

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

// Configurar la sesión de Express
app.use(session({
  secret: 'mi_secreto',
  resave: false,
  saveUninitialized: false
}));

// Inicializar Passport y Flash
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.set('view engine', 'ejs');
app.set('views', __dirname + '/public/views');
// Configurar el middleware de Express para enviar archivos multipart/form-data (como las imágenes de perfil)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/public/uploads', express.static('public/uploads'));
app.use(express.static(__dirname + '/public'));;
app.get('/', function(req, res) {
  res.sendFile('index.html', { root: __dirname + '/public/views' });
});
app.get('/register', function(req, res) {
  res.sendFile('register.html', { root: __dirname + '/public/views' });
});
app.get('/confirmacion', function(req, res) {
  res.sendFile('confirmacion.html', { root: __dirname + '/public/views' });
});
app.post('/register', upload.single('avatar'), function (req, res) {
  User.findOne({ email: req.body.email }, function(err, user) {
    if (err) {
      console.log(err);
      req.flash('error', 'Hubo un problema al crear el usuario.');
      return res.redirect('/register');
    }
    if (user) {
      req.flash('error', 'Este correo ya está registrado.');
      return res.redirect('/register');
    }
  });

const newUser = new User({
  email: req.body.email,
  password: bcrypt.hashSync(req.body.password, 10),
  name: req.body.name,
  address: req.body.address,
  age: req.body.age,
  phone: req.body.phone,
  avatar: req.file ? '/public/uploads/' + path.basename(req.file.path) : '',
});

newUser.save(function (err) {
  if (err) {
    console.log(err);
    req.flash('error', 'Hubo un problema al crear el usuario.');
    return res.redirect('/register');
  }
  // Enviar correo electrónico de bienvenida al usuario recién registrado
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'theo86@ethereal.email',
        pass: 'urXe4Mgn78rXDKWAtg'
    }
  });

  const mailOptions = {
    from: 'MuxEcommerceSYS@Mux.com',
    to: newUser.email,
    subject: 'Bienvenido',
    text: `Hola ${newUser.name},\n\nBienvenido. Esperamos que disfrutes usando nuestro servicio.\n\nSaludos cordiales,\nADMINISTRACION`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      req.flash('error', 'Hubo un problema al enviar el correo electrónico de bienvenida.');
    } else {
      console.log('Email enviado: ' + info.response);
      req.flash('success', '¡Te has registrado exitosamente y se ha enviado un correo electrónico de bienvenida!');
    }
    
    // Enviar mensaje por WhatsApp
    const whatsappMessage = `Hola!! Este es el Numero de Soporte Cualquier duda estamos a tu disposicion!  Usuario:${newUser.name},Correo:${newUser.email},Direccion:${newUser.address},Teléfono ${newUser.phone}.`;

client.messages.create({
  from: 'whatsapp:+14155238886',
  to: `whatsapp:+${req.body.phone}`,
  body: whatsappMessage,
}).then(message => console.log(`Mensaje de WhatsApp enviado: ${message.sid}`))
.catch(error => console.log(error));
    
    // Iniciar sesión automáticamente después de crear el usuario
    req.login(newUser, function (err) {
      if (err) {
        console.log(err);
        req.flash('error', 'Hubo un problema al iniciar sesión.');
        return res.redirect('/login');
      }
      // Redirigir al usuario a su perfil
      return res.redirect('/profile');
      });
    });
  });
});
//------------------------SHOP------------------------------------------------

app.post('/compra', function(req, res) {
  const userEmail = req.user.email; 
  console.log(req.user);
  const whatsappNumber = req.user.phone; //obtener el número de teléfono del usuario autenticado
  const userAddress = req.user.address;
  const message = "Gracias por su compra";
  // Enviar correo electrónico de confirmación
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'theo86@ethereal.email',
        pass: 'urXe4Mgn78rXDKWAtg'
    }
  });

  const mailOptions = {
    from: 'MuxEcommerceSYS@Mux.com',
    to: userEmail,
    subject: 'Confirmación de compra',
    text: `Hola,\n\n${message}\n\nSaludos cordiales,\nADMINISTRACION`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      req.flash('error', 'Hubo un problema al enviar el correo electrónico de confirmación.');
    } else {
      console.log('Correo electrónico enviado: ' + info.response);
      console.log(`Dirección de correo electrónico: ${userEmail}`); 
      req.flash('success', '¡La compra se ha procesado exitosamente y se ha enviado un correo electrónico de confirmación!');
    }
  });

  // Enviar mensaje por WhatsApp
  const whatsappMessage = `${message} - estaremos visitando su domicilio "${userAddress}" en el transcurso del dia.. Att: Soporte *No responda a este mensaje`;

  client.messages.create({
    from: 'whatsapp:+14155238886',
    to: `whatsapp:+${whatsappNumber}`,
    body: whatsappMessage,
  }).then(message => console.log(`Mensaje de WhatsApp enviado: ${message.sid}`))
  .catch(error => console.log(error));

  // Redirigir al usuario a su perfil
  return res.redirect('/confirmacion');
});



//------------------------SHOP------------------------------------------------




app.get('/login', function(req, res) {
  res.sendFile('login.html', { root: __dirname + '/public/views' });
});

app.post('/login', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) { return next(err); }
    if (!user) {
      console.log(info.message); 
      return res.redirect('/login');
    }
    req.logIn(user, function (err) {
      if (err) { return next(err); }
      return res.redirect('/profile');
    });
  })(req, res, next);
});

app.get('/profile', isLoggedIn, function (req, res) {
  res.render('profile', { user: req.user });
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});
app.get('/confirmacion', function (req, res) {
  res.redirect('/profile');
});

// Middleware para verificar si el usuario está autenticado
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Iniciar el servidor
app.listen(3000, function () {
  console.log('Servidor iniciado en http://localhost:3000');
});
