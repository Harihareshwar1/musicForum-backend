const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = function(req, res, next) {
    // Get token from header
    const authHeader = req.header('Authorization');

    // Check if no token
    if (!authHeader) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // Verify token
        // Remove 'Bearer ' from token string if present
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        
        const decoded = jwt.verify(token, config.jwtSecret);

        // Add user from payload
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
