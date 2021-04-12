const JWT = require("jsonwebtoken");

const createJWT = async ({ user }) => { //create function
    return await JWT.sign({ user }, process.env.PRIVATEKEY, { expiresIn: "1h" })
}

const authenticate = async (req, res, next) => { //middleware
    try {
        const bearer = req.headers["authorization"];
        if (!bearer) {
            return res.json({ message: "access failed due to null value of token" });
        } else {
            JWT.verify(bearer, process.env.PRIVATEKEY, (err, decode) => {
                if (decode) {
                    req.body.auth = decode.user;
                    next();
                }
                else if (err) {
                    res.json({ err });
                }
            })
        }
    } catch (error) {
        console.log(error);
        return res.json({
            message: "something went wrong authentication"
        });
    }
}

module.exports = { createJWT, authenticate }