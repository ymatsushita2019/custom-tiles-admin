const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const { googleClientInfo } = require('./config');

passport.use(new GoogleStrategy(
	googleClientInfo,
	(token, refreshToken, profile, done) => {
		done(null, profile);
	}
));

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
});

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
	if (req.path === '/auth/google' || req.path === '/auth/google/callback') return next();

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated()) return next();

	// if they aren't redirect them to the home page
	res.redirect('/auth/google');
}

exports.passport = passport;
exports.isLoggedIn = isLoggedIn;
