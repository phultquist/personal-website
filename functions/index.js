const functions = require('firebase-functions');
const express = require('express');
const app = express();
const {nanoid} = require('nanoid');

const path = require('path');
const fs = require('fs');

var admin = require("firebase-admin");
const { TablesServiceClient } = require('@google/area120-tables');

const client = new TablesServiceClient();

var serviceAccount = require("./patrick-today-firebase-adminsdk-zeyvx-630f632f07.json");
const { getPriority } = require('os');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://patrick-today.firebaseio.com"
});

let db = admin.firestore();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/home.html'));
});

app.get('/shortener', (req, res) => {

});

app.get('/shorten', (req,res) => {
    let oldUrl = req.query.long;
    let newId = req.query.short || nanoid(10);
    let baseUrl = "patrick.today/s/" + newId;
    let newUrl = "https://patrick.today/s/" + newId;
    let doc = db.collection("urls").doc(newId)
    
    // doc.get().then((data) => {
        
    // });

    doc.set({
        shortId: newId,
        short: newUrl,
        long: oldUrl
    }).then(() => {
        res.send(newUrl + "<br><br>" + baseUrl);
    }).catch(() => {
        res.send("error");
    });
});

app.get('/s/:id', async (req, res) => {
    let doc = await db.collection("urls").doc(req.params.id).get();
    res.redirect(doc.data().long);
});

app.get('/gh/:repository', (req, res) => {
    res.redirect('https://github.com/phultquist/'+req.params.repository);
});

app.get('/resume', (req, res) => {
    res.sendFile(path.join(__dirname, '/files/Resume.pdf'))
});

function getIp(req) {
    let i = (req.headers['x-forwarded-for'] || req.connection.remoteAddress) || 'error:'+Math.random()+':'+Date.now();
    i = i.split(',')[0]
    return i
}

app.get('/frame/connect', (req, res) => {
    // res.send('hi')
    let globalIp =  getIp(req);
    // globalIp = "99.75.52.140"
    // globalIp = 'poop'
    if (globalIp.startsWith('undefined')) {
        res.send("Couldn't find frame on your network. Try again soon.")
    } else {
        db.collection('frames').where("globalIp", "==", globalIp).get().then(snapshot => {
            // console.log(snapshot);
            let matches = []
            snapshot.forEach(doc => {
                matches.push(doc.data())
            })
            // res.send('matches')
            if (matches.length == 0) {
                res.status(200).send("Couldn't find frame on your network. Try again soon.")
            } else if (matches.length == 1) {
                res.redirect(matches[0].localIp)
            } else {
                let text = '';
                matches.forEach(match => {
                    text += `<a href=${match.localIp}>${match.frameId} at ${match.localIp}</a> <br>`
                })
                res.status(200).send(text)
            }
        })
        .catch(() => {
            res.status(500).send('error')
        })
    }
    // res.send('hello')
})

app.get('/frame/set', (req, res) => {
    // console.log(req);
    let globalIp = getIp(req);
    let localIp = req.query.ip || '';
    let frameId = req.query.frameId || 'blank';
    // res.send('globalip: '+globalIp)
    db.collection('frames').doc(frameId).set({
        globalIp, localIp, frameId
    }).then(() => {
        res.status(200).send('success');
    }).catch(() => {
        res.status(500).send('error');
    })
})

exports.app = functions.https.onRequest(app);
