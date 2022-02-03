module.exports.isLoggedIn = (req, res, next) => {
    if (!req.session.isAuthenticated) {
        req.session.returnTo = req.originalUrl
        console.log('you must first be signed in')
        return res.redirect('/auth/login/teacher');
    }
    next();
}