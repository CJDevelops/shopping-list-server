
require("dotenv").config({ path: __dirname + "/.env" });
const express = require('express');
const bodyParser = require('body-parser');
const pool = require(__dirname + "/db.config.js");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 9000;
const shouldSendNtfy = process.env.SEND_NTFY ? process.env.SEND_NTFY.toLowerCase() === 'true' : false;
const NTFY_URL = process.env.NTFY_URL.replace(/\/+$/, '') || 'https://ntfy.example.com/shopping';

// Functions

const sendNtfy = (res, message_body) => {
    if (!shouldSendNtfy) {
        console.log('NTFY is disabled. Set SEND_NTFY=true to enable it.');
        return;
    }
    fetch(`${NTFY_URL}`, {
        method: 'POST',
        body: message_body
    }).then(() => {
        console.log(`${message_body} sent to ${NTFY_URL}`);
    } 
    )
}

const getShopping =  (req, res) => {
  pool.query('SELECT * FROM shopping_list', (error, shopping) => {
    if (error) {
      throw error
    }
    res.status(200).json(shopping.rows)
  })
}

async function addShoppingItem(item_name, res) {
    try {
        const response = await pool.query('INSERT INTO shopping_list (item_name) VALUES ($1)', [item_name]);
        res.status(201).send(`Item added with ID: ${response.insertId}`);
        sendNtfy(res, `Added: ${item_name}`);
    } catch (error) {
        console.error(error);
    }
}

async function removeShoppingItem(item_id, item_name, res) {
    try {
        const response = await pool.query('UPDATE shopping_list SET purchased = TRUE WHERE item_id = $1', [item_id]);
        res.status(200).send(`Item removed with name: ${item_name}`);
        sendNtfy(res, `Removed: ${item_name}`);
    } catch (error) {
        console.error(error);
    }
}



// Routes
app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.get('/shopping', getShopping)

app.post('/remove_item', (req, res) => {
    const { item_id, item_name } = req.body;
    removeShoppingItem(item_id, item_name, res);
});

app.post('/add_item', (req, res) => {
    const { item_name } = req.body;
    addShoppingItem(item_name, res);
});


app.listen(PORT, () => {
    console.log(`Server listening on the port  ${PORT}`);
})