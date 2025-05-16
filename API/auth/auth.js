var jwt = require('jsonwebtoken');

module.exports.validate = (req, res, next) => {
    var token = req.get('Authorization')

    token = token.split(' ')[1]

    if(token) {
        jwt.verify(token, 'EngWeb2025', (err, payload) => {
            if(err) res.status(401).jsonp(err)
            else {
                console.log(payload);
                next()
            }
        })
    } else {
        res.status(401).jsonp({ error : 'Token não existe' })
    }
}