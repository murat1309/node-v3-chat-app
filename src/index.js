const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessages } = require('./utils/messages');
const { addUser, getUser, getUsersInRoom, removeUser } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');


//socket.emit(); //send it to specific connection
//io.emit(); //to every single connection. (send it to everyone)
//socket.broadcast.emit();//bu özel soket dışındaki herkese gönderecektir.//send it to everybody but that particular connection.

//io.to.emit => send it to everybody in a specific room // belirli bi odadaki herkese (diğer odalardakiler hariç)
// socket.broadcast.to.emit //belirli bi ordadaki belirli bir soket dışındaki herkese gönderilir.

app.use(express.static(publicDirectoryPath));

io.on('connection', (socket)=> {

    console.log('New WebSocket connection..');

    socket.on('join', (options, callback) => {

        const { error, user } = addUser({ id: socket.id, ...options });

        if (error){
            return callback(error);
        }
        socket.join(user.room); //odaya katılıyoruz.

        socket.emit('message', generateMessage('Admin','Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined!`)); //bu soket hariç aynı odada bulunan diğer herkese send it.
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();
    });

    socket.on('sendMessage', (message, callback) => {

        const user = getUser(socket.id);
        const filter = new Filter();

        if (filter.isProfane(message)){
            return callback('Profanity is not allowed!');
        }
       io.to(user.room).emit('message', generateMessage(user.username,message));
        callback();
    });

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessages(user.username,`https://google.com/maps?q=${coords.latitude},${coords.longitude}`));
        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user){
            io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left!`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});

server.listen(port, () => {
    console.log(`Serve is up on port ${port}!`);
});
