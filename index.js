const express = require('express');
const mongodb = require('mongodb');
const bcryptjs = require('bcryptjs');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const mongoClient = mongodb.MongoClient;
const dbUrl = process.env.DBURL || 'mongodb://127.0.0.1:27017';
// const dbUrl = 'mongodb://127.0.0.1:27017';
const PORT = process.env.PORT || 3000;
const database = 'Blogger';
const userCollection = 'Blogdata';

const app = express();

app.use(express.json());
app.use(cors());

const { authenticate, createJWT } = require('./auth')

app.get('/', (req, res) => {
    res.send("this is from blogger app")
});

app.get('/allusers', [authenticate], async (req, res) => {
    try {
        let client = await mongoClient.connect(dbUrl);
        let opendb = client.db(database);
        let collection = await opendb.collection(userCollection).find({ email: req.body.auth.email }).toArray();
        client.close();
        res.json({
            message: "all users datas are showed here",
            collection
        })
    } catch (error) {
        console.log(error)
        res.json({ message: "something went wrong" })
    }
});

app.post('/register', async (req, res) => {
    try {
        let client = await mongoClient.connect(dbUrl);
        let opendb = client.db(database);
        let already = await opendb.collection(userCollection).findOne({ email: req.body.mail })
        if (!already) {
            let salt = await bcryptjs.genSalt(10);
            let hash = await bcryptjs.hash(req.body.code, salt);
            let data = await opendb.collection(userCollection)
                .insertOne({ username: req.body.name, email: req.body.mail, password: hash });
            res.json({ message: "updated", data })
        } else {
            res.json({ message: "you already having an account...please login to continue..." })
        }
        client.close();
    } catch (error) {
        console.log(error);
        res.json({ message: "something went wrong with register" });
    }
});

app.post('/login', async (req, res) => {
    try {
        let client = await mongoClient.connect(dbUrl);
        let db = client.db(database);
        let user = await db.collection(userCollection).findOne({ email: req.body.mail });
        if (user) {
            let result = await bcryptjs.compare(req.body.code, user.password);
            if (result) {
                const token = await createJWT({ user })
                res.json({
                    message: "allow",
                    token
                })
            } else {
                res.json({ message: 'Access not Allowed' });
            }
        } else {
            res.json({ message: 'User not found' });
        }
    } catch (error) {
        console.log(error);
        res.json({ message: 'Something went wrong' });
    }
});

app.post('/link', async (req, res) => {
    try {
        let client = await mongoClient.connect(dbUrl);
        let db = client.db(database);
        let user = await db.collection(userCollection).findOne({ email: req.body.mail });
        if (user) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.PASSWORD,
                },
            });
            let mailOptions = {
                from: process.env.EMAIL,
                to: user.email,
                subject: 'Reset Password',
                text: 'click here to reset password',
                html:
                    '<h3>Reset your password Here</h3><a href="https://blog-fs.netlify.app/reset">Click Here</a>',
            };
            transporter.sendMail(mailOptions, (err, data) => {
                if (err) {
                    console.log(err);
                } else {
                    res.json({ message: "mail sent to your targetmail..check it", data })
                }
            });
        } else {
            console.log("email is not valid");
            res.json({ message: "email is not valid" });
        }
        client.close();
    } catch (error) {
        console.log(error);
        res.json({ message: 'Something went wrong' });
    }
});

app.put('/reset', async (req, res) => {
    try {
        let client = await mongoClient.connect(dbUrl);
        let db = client.db(database);
        let data = await db.collection(userCollection).findOne({ email: req.body.mail });
        if (data) {
            let result = await bcryptjs.compare(req.body.code, data.password);
            if (!result) {
                let salt = await bcryptjs.genSalt(10);
                let hash = await bcryptjs.hash(req.body.code, salt);
                await db.collection(userCollection).findOneAndUpdate({ email: req.body.mail }, { $set: { password: hash } });
                res.json({ message: "new password update successfully!!!" })
            } else {
                res.json({ message: "entered password is same as existing one" })
            }
        } else {
            res.json({ message: "user not found" })
        }
        client.close();
    } catch (error) {
        console.log(error);
        res.json({ message: 'Something went wrong' });
    }
});

app.post('/newpost', [authenticate], async (req, res) => {
    try {
        const client = await mongoClient.connect(dbUrl);
        const opendb = client.db(database);
        const newpost = await opendb.collection(userCollection).insertOne({
            heading: req.body.heading,
            url: req.body.url,
            body: req.body.body,
            readme: req.body.readme,
            mail: req.body.auth.email,
            name: req.body.auth.username,
            date: new Date().getDate() + ":" + (new Date().getMonth() + 1) + ":" + new Date().getFullYear()
        });
        res.status(200).json({ message: 'your blog has been posted', newpost });
        // console.log(newpost)
        client.close();
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'something went wrong' });
    }
});

app.get('/myblogs', [authenticate], async (req, res) => {
    try {
        const client = await mongoClient.connect(dbUrl);
        const opendb = client.db(database);
        let myblogs = await opendb.collection(userCollection).find({ mail: req.body.auth.email }).sort({ date: -1 }).toArray();
        client.close();
        res.status(200).json({ message: "your all blogs were showned below", myblogs });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
});

app.get('/oneget/:id', [authenticate], async (req, res) => {
    try {
        const client = await mongoClient.connect(dbUrl);
        const opendb = client.db(database);
        const id = mongodb.ObjectID(req.params.id);
        let find = await opendb.collection(userCollection).findOne({ _id: id });
        if (find) {
            let onepost = await opendb.collection(userCollection).findOne({ _id: id });
            res.status(200).json({ message: "bringing a single post request successfully", onepost });
        } else {
            res.status(500).json({ message: "there is matching id found" })
        }
        client.close();
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
});

app.delete('/onedelete/:id', [authenticate], async (req, res) => {
    try {
        const client = await mongoClient.connect(dbUrl);
        const opendb = client.db(database);
        const id = mongodb.ObjectID(req.params.id);
        let find = await opendb.collection(userCollection).findOne({ _id: id });
        if (find) {
            await opendb.collection(userCollection).deleteOne({ _id: id });
            res.status(200).json({ message: 'blog has been deleted successfully', find });
        } else {
            res.status(500).json({ message: "there is matching id found" })
        }
        client.close();
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
});

app.put('/onemodify/:id', [authenticate], async (req, res) => {
    try {
        const client = await mongoClient.connect(dbUrl);
        const opendb = client.db(database);
        const id = mongodb.ObjectID(req.params.id);
        const find = await opendb.collection(userCollection).findOne({ _id: id });
        if (find) {
            const update = await opendb.collection(userCollection).updateOne({ _id: id },
                {
                    $set: {
                        heading: req.body.heading,
                        url: req.body.url,
                        body: req.body.body,
                        readme: req.body.readme,
                        date: new Date().getDate() + ":" + (new Date().getMonth() + 1) + ":" + new Date().getFullYear()
                    },
                });
            res.status(200).json({ message: 'blog has been update successfully', update });
        } else {
            res.status(500).json({ message: "there is matching id found" });
        }
        client.close();
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
});

app.post('/contact', async (req, res) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });
        const mailOptions = {
            from: req.body.email,
            to: process.env.EMAIL,
            subject: 'User Need Help',
            html: `
               <div>Hi Sir,</div>
               <div>My name is ${req.body.name}</div>
               <p>Here the Message,<div>${req.body.message}</div></p>
               <p>please respond to  the below mail</p>
               <a href="mailto:${req.body.email}"><div>${req.body.email}</div></a>`
        };
        transporter.sendMail(mailOptions, (err, data) => {
            if (err) {
                res.json({ message: "error with server mail transporter", err })
            } else {
                res.json({ message: "mail sent", data })
            }
        });
    } catch (error) {
        res.status(400).json({ message: 'something went wrong' });
    }
});


app.listen(PORT, () => console.log(`your awesome blogger script were running:${PORT}`))