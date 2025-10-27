require("dotenv").config() ;//imports dotenv that loads environmental variables from /server.env
const http = require("http");

//Routing map
const routes = {
    'POST /api/signup': require('./controllers/authController'),
    'POST /api/login': require('./controllers/login')
}

const server = http.createServer((req, res) => {
    //CORS handling
    const allowedOrgins = ['http://localhost:5173'];
    const origin = req.headers.origin;
    if (allowedOrgins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Origin', '');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, UPDATE, DELETE');//add other methods as needed
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    //parsing the route path requested by the client
    const routeTarget = new URL(req.url, `http://${req.headers.host}`);
    const routeKey = `${req.method} ${routeTarget.pathname}`;

    //Fetching the requested route handler based on route map
    const routeHandler = routes[routeKey];
    if (routeHandler) {
        routeHandler(req, res);
    }
    else {//handler does not exist or not in route map
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Route not found' }));
    }
});
//Start server
server.listen(3000, () => {
    console.log('Server running at http://localhost:3000/');
})
