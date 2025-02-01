const mongoose = require('mongoose');
const Music = require('../models/Music');
require('dotenv').config();

const sampleMusic = [
    // Hindi Songs
    {
        title: "Chaleya",
        artist: "Arijit Singh, Shilpa Rao",
        language: "Hindi",
        image: "https://i.scdn.co/image/ab67616d0000b27387bac2f6b9a30c4b930f7e7d",
        audioUrl: "/audio/chaleya.mp3"
    },
    {
        title: "Heeriye",
        artist: "Jasleen Royal, Arijit Singh",
        language: "Hindi",
        image: "https://i.scdn.co/image/ab67616d0000b273c75253a6555d5ac6e4b0d7d1",
        audioUrl: "/audio/heeriye.mp3"
    },
    // Add all other songs here...
];

const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/music-forum', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Clear existing music
        await Music.deleteMany({});

        // Create admin user if not exists
        const adminUser = await mongoose.model('User').findOne({ email: 'admin@example.com' });
        if (!adminUser) {
            console.error('Admin user not found. Please create an admin user first.');
            process.exit(1);
        }

        // Add sample music
        const musicWithAdmin = sampleMusic.map(music => ({
            ...music,
            addedBy: adminUser._id
        }));

        await Music.insertMany(musicWithAdmin);
        console.log('Database seeded successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
};

seedDatabase();
