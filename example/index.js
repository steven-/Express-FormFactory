var express = require('express')
  , http = require('http')
  , path = require('path')
  , UserForm = require('./forms/user-form');

// module.exports = express;
var app = express();


// all environments
app.set('port', process.env.PORT || 3333);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.cookieParser('FormFactory secret key'));
app.use(express.session());
app.use(express.bodyParser());
app.use(function(req, res, next) {
  res.locals.FormErrors = req.session.FormErrors || {};
  res.locals.FormInputs = req.session.FormInputs || {};
  delete req.session.FormErrors;
  delete req.session.FormInputs;
  next();
});

var __user = {
  username: 'Steven',
  password: 'pass',
  bio: 'Web Developper'
}

app.get('/', function (req, res, next) {
  var userForm = new UserForm;
  // userForm.hydrate(__user);

  res.render('user', {
    user: __user
  });
});



app.post('/', function (req, res, next) {
  var userForm = new UserForm;

  userForm.setValidationGroup('- bio avatar')
          .handle(req);

  if (userForm.isValid()) {
    userForm.bindEntity(__user);

    /*
    __user.save(function (err, user) {
      if (err) return next(err);
      else res.render('/users');
    });
    */
  }
  else {
    res.redirect('/');
  }
});




http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
