const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/music-forum', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB Connected Successfully');
    process.exit(0);
})
.catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
});
