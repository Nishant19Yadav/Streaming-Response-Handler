// const User = require('../models/user');
// const Admin = require('../models/admin');
// const jwt = require('jsonwebtoken');

// const JWT_SECRET = process.env.JWT_SECRET || 'pro-stream-ultra-secret-key-2026';

// const generateToken = (user) => {
//     return jwt.sign(
//         { id: user._id, email: user.email, role: user.role, name: user.name || user.username },
//         JWT_SECRET,
//         { expiresIn: '7d' }
//     );
// };

// exports.register = async (req, res) => {
//     try {
//         const { name, email, password, googleId, loginType } = req.body;
//         const finalName = name || email.split('@')[0];

//         let existingUser = await User.findOne({ email });

//         if (existingUser) {
//             if (loginType === 'google') {
//                 let needsSave = false;
//                 if (!existingUser.googleId && googleId) {
//                     existingUser.googleId = googleId;
//                     existingUser.loginType = 'google';
//                     needsSave = true;
//                 }

//                 // Ensure username is set to email for compatibility with unique index
//                 if (!existingUser.username) {
//                     existingUser.username = existingUser.email;
//                     needsSave = true;
//                 }

//                 // Ensure name exists for old users
//                 if (!existingUser.name) {
//                     existingUser.name = finalName;
//                     needsSave = true;
//                 }

//                 if (needsSave) await existingUser.save();

//                 const token = generateToken(existingUser);
//                 return res.json({
//                     token,
//                     user: { id: existingUser._id, name: existingUser.name, email: existingUser.email, role: existingUser.role }
//                 });
//             }
//             return res.status(400).json({ error: 'Email already exists. Please login with your password.' });
//         }

//         const user = new User({
//             name: finalName,
//             username: email, // Use email as username to prevent null duplicate index error
//             email,
//             password,
//             googleId,
//             loginType: loginType || 'email'
//         });

//         await user.save();
//         const token = generateToken(user);

//         res.status(201).json({
//             message: 'User registered successfully',
//             token,
//             user: { id: user._id, name: user.name, email: user.email, role: user.role }
//         });
//     } catch (error) {
//         console.error('Registration/Google Sync error:', error);
//         res.status(500).json({ error: 'Authentication failed: ' + error.message });
//     }
// };




// exports.login = async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const user = await User.findOne({ email });

//         if (!user || user.loginType !== 'email' || !(await user.comparePassword(password))) {
//             return res.status(401).json({ error: 'Invalid email or password' });
//         }

//         const token = generateToken(user);

//         res.json({
//             token,
//             user: { id: user._id, name: user.name, email: user.email, role: user.role }
//         });
//     } catch (error) {
//         res.status(500).json({ error: 'Login failed' });
//     }
// };

// exports.adminLogin = async (req, res) => {
//     try {
//         const { username, password } = req.body;
//         const admin = await Admin.findOne({ username });

//         if (!admin) {
//             return res.status(401).json({ error: 'Admin not found' });
//         }

//         // Check if password matches (handling both hashed and plain text for manual entries)
//         let isMatch = false;
//         try {
//             isMatch = await admin.comparePassword(password);
//         } catch (e) {
//             // If bcrypt fails (e.g. data is plain text), check equality
//             isMatch = (password === admin.password);
//         }

//         // Final check: if bcrypt didn't throw but returned false, still check plain text 
//         // in case user entered plain text that looks vaguely like a hash (unlikely but safe)
//         if (!isMatch) isMatch = (password === admin.password);

//         if (!isMatch) {
//             return res.status(401).json({ error: 'Invalid admin credentials' });
//         }

//         const token = jwt.sign(
//             { id: admin._id, username: admin.username, role: 'admin' },
//             JWT_SECRET,
//             { expiresIn: '24h' }
//         );

//         res.json({
//             token,
//             user: { id: admin._id, username: admin.username, role: 'admin' }
//         });
//     } catch (error) {
//         console.error('Admin login error:', error);
//         res.status(500).json({ error: 'Admin login failed' });
//     }
// };


// exports.getProfile = async (req, res) => {
//     try {
//         const user = await User.findById(req.user.id)
//             .populate('likedVideos')
//             .populate('watchHistory.video');

//         if (!user) return res.status(404).json({ error: 'User not found' });

//         res.json(user);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to fetch profile' });
//     }
// };

// exports.updateHistory = async (req, res) => {
//     try {
//         const { videoId } = req.body;
//         const user = await User.findById(req.user.id);

//         // Remove existing entry for this video if any (to update timestamp)
//         user.watchHistory = user.watchHistory.filter(h => h.video.toString() !== videoId);

//         // Add to the beginning
//         user.watchHistory.unshift({ video: videoId, watchedAt: new Date() });

//         // Limit history to last 50 entries
//         if (user.watchHistory.length > 50) user.watchHistory.pop();

//         await user.save();
//         res.json({ message: 'History updated' });
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to update history' });
//     }
// };

// exports.toggleLike = async (req, res) => {
//     try {
//         const { videoId } = req.body;
//         const user = await User.findById(req.user.id);

//         const index = user.likedVideos.indexOf(videoId);
//         if (index > -1) {
//             user.likedVideos.splice(index, 1);
//         } else {
//             user.likedVideos.push(videoId);
//         }

//         await user.save();
//         res.json({ liked: index === -1 });
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to toggle like' });
//     }
// };

const User = require('../models/user');
const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pro-stream-ultra-secret-key-2026';

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role, name: user.name || user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, googleId, loginType } = req.body;
        const finalName = name || email.split('@')[0];

        let existingUser = await User.findOne({ email });

        if (existingUser) {
            if (loginType === 'google') {
                let needsSave = false;
                if (!existingUser.googleId && googleId) {
                    existingUser.googleId = googleId;
                    existingUser.loginType = 'google';
                    needsSave = true;
                }

                // Ensure username is set to email for compatibility with unique index
                if (!existingUser.username) {
                    existingUser.username = existingUser.email;
                    needsSave = true;
                }

                // Ensure name exists for old users
                if (!existingUser.name) {
                    existingUser.name = finalName;
                    needsSave = true;
                }

                if (needsSave) await existingUser.save();

                const token = generateToken(existingUser);
                return res.json({
                    token,
                    user: { id: existingUser._id, name: existingUser.name, email: existingUser.email, role: existingUser.role }
                });
            }
            return res.status(400).json({ error: 'Email already exists. Please login with your password.' });
        }

        const user = new User({
            name: finalName,
            username: email, // Use email as username to prevent null duplicate index error
            email,
            password,
            googleId,
            loginType: loginType || 'email'
        });

        await user.save();
        const token = generateToken(user);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Registration/Google Sync error:', error);
        res.status(500).json({ error: 'Authentication failed: ' + error.message });
    }
};




exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || user.loginType !== 'email' || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user);

        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
};

exports.adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });

        if (!admin) {
            return res.status(401).json({ error: 'Admin not found' });
        }

        // Check if password matches (handling both hashed and plain text for manual entries)
        let isMatch = false;
        try {
            isMatch = await admin.comparePassword(password);
        } catch (e) {
            // If bcrypt fails (e.g. data is plain text), check equality
            isMatch = (password === admin.password);
        }

        // Final check: if bcrypt didn't throw but returned false, still check plain text 
        // in case user entered plain text that looks vaguely like a hash (unlikely but safe)
        if (!isMatch) isMatch = (password === admin.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }

        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: { id: admin._id, username: admin.username, role: 'admin' }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Admin login failed' });
    }
};


exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('likedVideos')
            .populate('watchHistory.video');

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

exports.updateHistory = async (req, res) => {
    try {
        const { videoId } = req.body;
        const user = await User.findById(req.user.id);

        // Remove existing entry for this video if any (to update timestamp)
        user.watchHistory = user.watchHistory.filter(h => h.video.toString() !== videoId);

        // Add to the beginning
        user.watchHistory.unshift({ video: videoId, watchedAt: new Date() });

        // Limit history to last 50 entries
        if (user.watchHistory.length > 50) user.watchHistory.pop();

        await user.save();
        res.json({ message: 'History updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update history' });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const { videoId } = req.body;
        const user = await User.findById(req.user.id);

        const index = user.likedVideos.indexOf(videoId);
        if (index > -1) {
            user.likedVideos.splice(index, 1);
        } else {
            user.likedVideos.push(videoId);
        }

        await user.save();
        res.json({ liked: index === -1 });
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle like' });
    }
};

